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
) {

    companion object {
        /** Đọc odometer ECU mỗi N sweep (mỗi sweep ~2.5s → 10 sweep ≈ 25s). */
        const val ODO_SWEEP_EVERY = 10L
    }

    private val _live = MutableStateFlow(LiveTelemetry())
    val live: StateFlow<LiveTelemetry> = _live

    private var pollJob: Job? = null

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

    private fun estimateGear(rpm: Double?, speed: Double?): Int? {
        if (rpm == null || speed == null || speed < 15.0) {
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

    data class PollResult(val telemetry: LiveTelemetry, val raw: List<Pair<String, String>>)

    fun start() {
        if (pollJob?.isActive == true) return
        pollJob = scope.launch {
            // Seed ODO từ bộ nhớ lưu (prefs → DB) để hiện NGAY cả khi chưa kết nối OBD
            seedOdo()
            lastGoodOdoKm?.let { o -> _live.value = _live.value.copy(odometerSavedKm = o) }
            var lastFuelRate = 0.0
            while (true) {
                if (!elms.isInitialised) {
                    delay(1000)
                    continue
                }
                val result = pollOnce()
                sweepCount++
                if (sweepCount % ODO_SWEEP_EVERY == 1L) refreshEcuOdometer()
                val rpm = result.telemetry.rpm
                val spd = result.telemetry.speedKmh
                val engineOn = (rpm ?: 0.0) >= 300.0
                val g = estimateGear(rpm, spd)
                _live.value = result.telemetry.copy(
                    timestamp = System.currentTimeMillis(),
                    gear = g,
                    // P: máy nổ nhưng xe đứng yên. N/R không tách được qua OBD chuẩn
                    // (cần PID riêng của hãng); khi chạy hiển thị số trong hộp D.
                    gearLabel = when {
                        !engineOn -> null
                        (spd ?: 0.0) < 3.0 -> "P"
                        else -> g?.let { "D$it" }
                    },
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
    }
}