package com.fmms.carlogger.domain.engine

import com.fmms.carlogger.core.gps.GpsTracker
import com.fmms.carlogger.core.obd.ELM327ProtocolManager
import com.fmms.carlogger.core.obd.PidDefinitions
import com.fmms.carlogger.data.repository.DiagnosticLogEmitter
import com.fmms.carlogger.domain.model.DataQuality
import com.fmms.carlogger.domain.model.LiveTelemetry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.withLock

/**
 * Drives OBD polling (profiles per spec §16) and merges GPS.
 * Emits [LiveTelemetry] for UI and optionally diagnostic logs.
 */
class TelemetryEngine(
    private val elms: ELM327ProtocolManager,
    private val gpsTracker: GpsTracker,
    private val diagLogOutput: DiagnosticLogEmitter? = null,
    private val scope: CoroutineScope,
    private val vehicleRepository: com.fmms.carlogger.data.repository.VehicleRepository? = null,
    // Lưu ODO ECU lần cuối đọc được — hiển thị lại khi mất kết nối OBD
    private val odoStore: android.content.SharedPreferences? = null,
    // Truy cập trực tiếp transport để sniff CAN (số hộp số P/R/N/D/M)
    private val transport: com.fmms.carlogger.core.obd.OBDTransport? = null,
) {

    companion object {
        /** Đọc odometer ECU mỗi N sweep (mỗi sweep ~2.5s → 10 sweep ≈ 25s). */
        const val ODO_SWEEP_EVERY = 10L
    }

    private val _live = MutableStateFlow(LiveTelemetry())
    val live: StateFlow<LiveTelemetry> = _live

    private var pollJob: Job? = null
    private var gearJob: Job? = null

    /** Tạm dừng vòng quét PID (dùng khi sniff CAN để không trộn lệnh vào stream). */
    @Volatile
    var paused = false
        private set

    fun setPaused(p: Boolean) {
        paused = p
    }

    // ECU odometer (PID 01A6): read every ODO_SWEEP_EVERY sweeps (~25s) to keep
    // the poll loop fast; value is held between sweeps.
    private var sweepCount = 0L
    private var lastGoodOdoKm: Double? = null
    private var odoSeedLoaded = false

    /** ODO đọc LIVE từ ECU trong phiên này (chỉ set khi PID trả về hợp lệ). */
    private var ecuLiveOdoKm: Double? = null

    /** Nguồn ODO offline: prefs (lần đọc ECU cuối) → DB xe. Chạy 1 lần/phiên. */
    private suspend fun seedOdo() {
        if (odoSeedLoaded) return
        odoSeedLoaded = true
        val saved = odoStore?.getFloat("last_ecu_odo_km", 0f)?.takeIf { it > 0f }?.toDouble()
        lastGoodOdoKm = saved ?: vehicleRepository?.getActive()?.odometerKm?.takeIf { it > 0 }
    }

    /** Đọc PID 01A6: hợp lệ thì cập nhật cả LIVE (KPI) lẫn SAVED (dưới gauge + prefs). */
    private suspend fun refreshEcuOdometer() {
        seedOdo()
        val resp = try { elms.readPidRaw(PidDefinitions.CMD_ODOMETER) } catch (_: Exception) { null } ?: return
        val km = PidDefinitions.decodeOdometer(resp, lastGoodOdoKm)
        if (km != null) {
            // Chống nhiễu: chỉ nhận khi hợp lý so với giá trị tốt đã biết
            val ref = lastGoodOdoKm
            if (ref == null || (km >= ref - 50 && km <= ref + 5000)) {
                lastGoodOdoKm = km
                ecuLiveOdoKm = km
                // Lưu lại để hiển thị khi OBD mất kết nối / app khởi động lại
                odoStore?.edit()?.putFloat("last_ecu_odo_km", km.toFloat())?.apply()
            }
        }
    }

    // Gear estimation (calibrated on Mazda2 AT 2026 / 6AT Skyactiv):
    // ratio = rpm / speed_kmh clusters per gear: D1≈155, D2≈80, D3≈51,
    // D4≈38.7, D5≈29, D6≈22.5 (estimated). Boundaries are geometric means.
    private var currentGear: Int? = null
    private var pendingGear: Int? = null
    private var pendingGearCount = 0

    private fun estimateGear(rpm: Double?, speed: Double?): Int? {        if (rpm == null || speed == null || speed < 15.0) {
            currentGear = null; pendingGear = null; pendingGearCount = 0
            return null
        }
        val ratio = rpm / speed
        val g = when {
            ratio > 111.0 -> 1
            ratio > 63.9 -> 2
            ratio > 44.4 -> 3
            ratio > 33.5 -> 4
            ratio > 25.5 -> 5
            else -> 6
        }
        if (g == currentGear) {
            pendingGear = null; pendingGearCount = 0
        } else if (g == pendingGear) {
            // require two consecutive agreeing samples before switching
            currentGear = g
            pendingGear = null; pendingGearCount = 0
        } else {
            pendingGear = g; pendingGearCount = 1
        }
        return currentGear
    }

    // ------------------------------------------------------------------
    // Sniff số hộp số THẬT từ bus CAN (không qua OBD PID chuẩn):
    //   ID 228 byte0: 01=P, 02=R, 03=N, 04=D, 14/24/34..=M1/M2/M3..
    //   ID 228 byte4: bitmask số đang ăn (02=số1, 04=số2, 08=3, 10=4...)
    //   ID 131 byte1: phải bằng nibble-thấp của 228 → đối chứng chéo chống nhiễu
    // ------------------------------------------------------------------
    private var canHeadersSet = false

    /** Nhãn số đọc từ CAN (P/R/N/D) — null khi chưa có tín hiệu → UI hiện "--". */
    @Volatile
    private var liveCanGear: String? = null

    private suspend fun sniffCanGear(): String? {
        val t = transport ?: return null
        val r = sniffCanGearOnce(t)
        android.util.Log.d(
            "GearSniff",
            "result=$r rawLen=$lastSniffRawLen f228=$lastSniffF228 f131=$lastSniffF131" +
                (lastSniffRaw?.take(140)?.let { " raw=[${it.replace("\n", "|")}]" } ?: ""),
        )
        return r
    }

    private var lastSniffRawLen = -1
    private var lastSniffRaw: String? = null
    private var lastSniffF228: String? = null
    private var lastSniffF131: String? = null

    private suspend fun sniffCanGearOnce(t: com.fmms.carlogger.core.obd.OBDTransport): String? {
        return try {
            // TOÀN BỘ phiên ATMA phải giữ khoá giao dịch chung với vòng quét PID —
            // nếu không, lệnh PID có thể chen vào giữa cửa sổ monitor và làm hỏng
            // cả hai luồng phản hồi (đây từng là nguyên nhân gây lỗi bus/đèn nháy).
            elms.transactionMutex.withLock {
                if (!canHeadersSet) {
                    t.sendCommandAndWait("AT H1", 800)
                    t.sendCommandAndWait("AT S1", 800)
                    canHeadersSet = true
                }
                val raw = t.captureStream("ATMA", 300)
            lastSniffRawLen = raw?.length ?: -1
            lastSniffRaw = raw
            val frames = com.fmms.carlogger.core.obd.GearScanner.parseFrames(raw ?: "")
            if (frames.isEmpty() && canHeadersSet) {
                // Không thấy frame nào → có thể adapter vừa reset, mất AT H1/S1.
                // Bật lại cờ để lần sniff kế gửi lại lệnh header.
                canHeadersSet = false
            }
            val f228 = frames.lastOrNull { it.id == "228" } ?: return null
            lastSniffF228 = f228.bytes.joinToString(" ") { String.format("%02X", it) }
            val f131 = frames.lastOrNull { it.id == "131" }
            lastSniffF131 = f131?.bytes?.joinToString(" ") { String.format("%02X", it) }
            val b0 = f228.bytes.getOrNull(0) ?: return null
            // Bảng số thật (quét 2026-08-23): nibble-thấp byte0 = 1:P, 2:R, 3:N, 4:D
            // (khớp 100% với byte1 của ID 131 — dùng làm đối chứng chéo)
            val crossOk = if (f131 != null && f131.bytes.size > 1) {
                f131.bytes[1] == (b0 and 0x0F)
            } else true
            if (!crossOk) {
                return null // hai nguồn lệch nhau → bỏ mẫu này
            }
            when (b0 and 0x0F) {
                0x01 -> "P"
                0x02 -> "R"
                0x03 -> "N"
                0x04 -> "D"
                else -> null
            }
            }
        } catch (_: Exception) {
            null
        }
    }

    data class PollResult(val telemetry: LiveTelemetry, val raw: List<Pair<String, String>>)

    fun start() {
        if (pollJob?.isActive == true) return
        pollJob = scope.launch {
            // Seed ODO từ bộ nhớ lưu (prefs → DB) để hiện NGAY cả khi chưa kết nối OBD
            seedOdo()
            lastGoodOdoKm?.let { o -> _live.value = _live.value.copy(odometerSavedKm = o) }
            var lastFuelRate = 0.0
            while (true) {
                if (paused || !elms.isInitialised) {
                    delay(400)
                    continue
                }
                val result = pollOnce()
                sweepCount++
                if (sweepCount % ODO_SWEEP_EVERY == 1L) refreshEcuOdometer()
                val rpm = result.telemetry.rpm
                val spd = result.telemetry.speedKmh
                val g = estimateGear(rpm, spd)
                // Nhãn số hộp số do gearJob cập nhật riêng (đọc CAN đều 1.2s),
                // vòng chính chỉ giữ fallback D# khi đang chạy mà CAN chậm.
                _live.value = result.telemetry.copy(
                    timestamp = System.currentTimeMillis(),
                    gear = g,
                    gearLabel = liveCanGear,
                    odometerKm = ecuLiveOdoKm,
                    odometerSavedKm = lastGoodOdoKm,
                    gpsSpeedKmh = gpsTracker.currentLocation()?.speed?.takeIf { it > 0 }?.let { (it * 3.6).toDouble() },
                    latitude = gpsTracker.currentLocation()?.latitude?.takeIf { it != 0.0 },
                    longitude = gpsTracker.currentLocation()?.longitude?.takeIf { it != 0.0 },
                    gpsAccuracy = gpsTracker.currentLocation()?.accuracy?.toDouble(),
                )
                // Fuel consumption accumulator uses fuel_rate when available
                if (result.telemetry.fuelRateLph != null) lastFuelRate = result.telemetry.fuelRateLph
                diagLogOutput?.log(result.raw)
                delay(2500)
            }
        }
        // Vòng sniff CAN riêng: CHỈ chạy khi xe đứng yên (<3 km/h) — khi đang lái
        // không gửi ATMA gì cả (an toàn cho bus, tránh lỗi đèn như sự cố trước),
        // nhãn D khi chạy xe do fallback ước tính từ RPM/tốc độ đảm nhiệm.
        if (gearJob?.isActive != true) {
            gearJob = scope.launch {
                var emptyStreak = 0
                while (true) {
                    val moving = (_live.value.speedKmh ?: 0.0) >= 3.0
                    if (paused || !elms.isInitialised || transport == null || moving) {
                        liveCanGear = null
                        emptyStreak = 0
                        delay(1500)
                        continue
                    }
                    val g = sniffCanGear()
                    liveCanGear = g
                    emptyStreak = if (g == null) emptyStreak + 1 else 0
                    // Nhiều mẫu trống liên tiếp → nghi adapter reset/anyhư lạ:
                    // nghỉ lâu, buộc gửi lại header ở lần kế.
                    if (emptyStreak >= 4) {
                        canHeadersSet = false
                        delay(30_000)
                        emptyStreak = 0
                    } else {
                        delay(1200)
                    }
                }
            }
        }
        // KHÔNG sniff CAN trong vòng chính: adapter ELM327 giá rẻ chạy ATMA liên tục
        // gây khung lỗi trên bus → ECU đèn pha nháy. Số hộp số giờ chỉ đọc khi
        // người dùng chủ động mở màn hình GearScan (có pause vòng quét PID).
    }

    private suspend fun pollOnce(): PollResult {
        val raw = mutableListOf<Pair<String, String>>()
        var rpm: Double? = null; var speed: Double? = null; var load: Double? = null
        var coolant: Double? = null; var intake: Double? = null; var maf: Double? = null
        var throttle: Double? = null; var fuelLevel: Double? = null; var fuelRate: Double? = null
        var voltage: Double? = null; var runtime: Double? = null; var stft: Double? = null; var ltft: Double? = null

        val all = PidDefinitions.all()
        for (pid in all) {
            val value = try {
                elms.readPid(pid)
            } catch (_: Exception) {
                null
            }
            diagLogOutput?.let { emitter ->
                emitter.logRaw(pid.command, value.toString())
            }
            raw.add(pid.command to (value?.toString() ?: "N/A"))
            when (pid.command) {
                PidDefinitions.CMD_RPM -> rpm = value
                PidDefinitions.CMD_SPEED -> speed = value
                PidDefinitions.CMD_LOAD -> load = value
                PidDefinitions.CMD_COOLANT -> coolant = value
                PidDefinitions.CMD_IAT -> intake = value
                PidDefinitions.CMD_MAF -> maf = value
                PidDefinitions.CMD_THROTTLE -> throttle = value
                PidDefinitions.CMD_FUEL_LEVEL -> fuelLevel = value
                PidDefinitions.CMD_FUEL_RATE -> fuelRate = value
                PidDefinitions.CMD_VOLTAGE -> voltage = value
                PidDefinitions.CMD_RUNTIME -> runtime = value
                PidDefinitions.CMD_STFT -> stft = value
                PidDefinitions.CMD_LTFT -> ltft = value
            }
        }

        val hasPids = listOf(rpm, speed, coolant, voltage, fuelLevel).any { it != null }
        // Nhiều ECU Mazda không trả PID 5E (fuel rate) → suy ra từ MAF:
        // L/h ≈ MAF(g/s) × 3600 / (AFR 14.7 × tỉ trọng xăng ~745 g/L) ≈ MAF × 0.33
        if (fuelRate == null && maf != null) fuelRate = maf * 0.33
        val telemetry = LiveTelemetry(
            rpm = rpm,
            speedKmh = speed,
            engineLoadPercent = load,
            coolantTempC = coolant,
            intakeTempC = intake,
            mafGps = maf,
            throttlePercent = throttle,
            fuelLevelPercent = fuelLevel,
            fuelRateLph = fuelRate,
            batteryVoltage = voltage,
            engineRuntimeSeconds = runtime,
            stft = stft,
            ltft = ltft,
            connectionQuality = if (hasPids) "OK" else "POOR",
            dataQuality = if (hasPids) DataQuality.VALID else DataQuality.UNAVAILABLE,
            rawSource = if (hasPids) "OBD" else "NONE",
        )
        return PollResult(telemetry, raw)
    }

    fun stop() {
        pollJob?.cancel()
        pollJob = null
        gearJob?.cancel()
        gearJob = null
    }
}