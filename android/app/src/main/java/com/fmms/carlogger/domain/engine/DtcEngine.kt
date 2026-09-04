package com.fmms.carlogger.domain.engine

import com.fmms.carlogger.core.database.dao.DiagnosticScanDao
import com.fmms.carlogger.core.database.dao.DtcLogDao
import com.fmms.carlogger.core.database.entity.DiagnosticScanEntity
import com.fmms.carlogger.core.database.entity.DtcLogEntity
import com.fmms.carlogger.core.obd.DtcScanner
import com.fmms.carlogger.core.obd.ELM327ProtocolManager
import com.fmms.carlogger.data.repository.PrefsStore
import com.fmms.carlogger.data.repository.SyncQueueRepository
import com.fmms.carlogger.data.repository.VehicleRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Engine quét mã lỗi OBD theo nguyên tắc **state-change based**:
 * chỉ ghi log mới khi có SỰ THAY ĐỔI trạng thái MIL/lỗi — không spam ghi lại
 * lỗi giống nhau mỗi vòng.
 *
 *  - MIL OFF -> ON : mở scan mới, ghi các DTC đang active (status CONFIRMED).
 *  - MIL ON -> OFF : đóng tất cả DTC đang active (is_active=0, cleared_at), mở
 *    scan mới là CLEAR (không còn lỗi) để đánh dấu hết bệnh.
 *  - Không đổi    : không tạo scan/log mới (bỏ qua những vòng lặp giống nhau).
 *
 * LÖU Ý AN TOÀN: engine này CHỈ dùng các lệnh đọc OBD chuẩn (Mode 01/03/07/0A) qua
 * `elms.readPidRaw` — tuyệt đối KHÔNG dùng ATMA/AT H1/AT S1/control CAN thô
 * (xem sự cố "đèn pha nháy" trong CHANGELOG). Mọi lệnh đều đi qua transactionMutex
 * của ELM327ProtocolManager nên không xung đột với vòng quét PID/gear sniff.
 */
class DtcEngine(
    private val elms: ELM327ProtocolManager,
    private val diagnosticScanDao: DiagnosticScanDao,
    private val dtcLogDao: DtcLogDao,
    private val syncQueueRepository: SyncQueueRepository,
    private val vehicleRepository: VehicleRepository,
    private val prefs: PrefsStore,
    private val scope: CoroutineScope,
) {
    private var scanJob: Job? = null

    /** Trạng thái lần quét trước (dùng để so state-change). */
    @Volatile
    private var lastMilOn: Boolean? = null

    @Volatile
    private var lastCodes: Set<String> = emptySet()

    private val _scanning = MutableStateFlow(false)
    val scanning: StateFlow<Boolean> = _scanning.asStateFlow()

    private val _lastScanSummary = MutableStateFlow<String?>(null)
    val lastScanSummary: StateFlow<String?> = _lastScanSummary.asStateFlow()

    fun start() {
        if (scanJob?.isActive == true) return
        scanJob = scope.launch {
            // Mỗi 20s kiểm tra — đủ nhạy cho cảnh báo, không spam bus.
            while (true) {
                try {
                    runScanOnce(auto = true)
                } catch (_: Exception) {
                    // Giữ im lặng ở lỗi transient; vòng lặp sẽ thử lại.
                }
                delay(20_000)
            }
        }
    }

    fun stop() {
        scanJob?.cancel()
        scanJob = null
    }

    /** Quét 1 lần khi người dùng bấm "Quét chẩn đoán" (bất kể trạng thái). */
    suspend fun scanNow() {
        runScanOnce(auto = false)
    }

    private suspend fun runScanOnce(auto: Boolean) {
        if (!elms.isInitialised) return
        val vehicle = vehicleRepository.getActive() ?: return

        _scanning.value = true
        try {
            val milRaw = elms.readPidRaw(DtcScanner.DTC_COMMAND_MIL, 2500)
            val parsedMil = DtcScanner.parseMil(milRaw)
            if (parsedMil == null) return
            val (milOn, count) = parsedMil

            val confirmed = DtcScanner.parseDtcResponse(elms.readPidRaw(DtcScanner.DTC_COMMAND_CONFIRMED, 2500))
            val pending = DtcScanner.parseDtcResponse(elms.readPidRaw(DtcScanner.DTC_COMMAND_PENDING, 2500))
            val permanent = try {
                DtcScanner.parseDtcResponse(elms.readPidRaw(DtcScanner.DTC_COMMAND_PERMANENT, 2500))
            } catch (_: Exception) {
                emptyList()
            }

            val codes = confirmed.toSet()
            val now = System.currentTimeMillis()
            val prevMil = lastMilOn
            val stateChanged = (prevMil == null) || (prevMil != milOn) || (codes != lastCodes)

            // Build freeze-frame (đọc thêm vài PID chuẩn — read-only).
            val pidList = com.fmms.carlogger.core.obd.PidDefinitions.all()
            fun pid(cmd: String) = pidList.firstOrNull { it.command == cmd }
            val ff = DtcScanner.buildFreezeFrame(
                rpm = pid(com.fmms.carlogger.core.obd.PidDefinitions.CMD_RPM)?.let { elms.readPid(it) },
                speedKmh = pid(com.fmms.carlogger.core.obd.PidDefinitions.CMD_SPEED)?.let { elms.readPid(it) },
                coolantTempC = pid(com.fmms.carlogger.core.obd.PidDefinitions.CMD_COOLANT)?.let { elms.readPid(it) },
                engineLoadPercent = pid(com.fmms.carlogger.core.obd.PidDefinitions.CMD_LOAD)?.let { elms.readPid(it) },
                intakeAirTempC = pid(com.fmms.carlogger.core.obd.PidDefinitions.CMD_IAT)?.let { elms.readPid(it) },
                mafGps = pid(com.fmms.carlogger.core.obd.PidDefinitions.CMD_MAF)?.let { elms.readPid(it) },
                fuelPressureKpa = null,
            ).toString()

            val odo = try { prefs.getOdo() } catch (_: Exception) { 0.0 }
            val deviceId = prefs.getDeviceId()

            if (stateChanged) {
                val scanId = java.util.UUID.randomUUID().toString()
                if (milOn || codes.isNotEmpty() || confirmed.isNotEmpty()) {
                    val scan = DiagnosticScanEntity(
                        id = scanId,
                        vehicleId = vehicle.id,
                        deviceId = deviceId,
                        scannedAt = now,
                        odometerKm = odo,
                        milStatus = milOn,
                        dtcCount = count,
                        scanType = if (auto) "AUTO_BACKGROUND" else "MANUAL_SCAN",
                        source = "obd",
                    )
                    diagnosticScanDao.upsert(scan)
                    syncQueueRepository.enqueueDiagnosticScan(scan)

                    // Xác định tập status cho mỗi mã.
                    val permSet = permanent.toSet()
                    val pendSet = pending.toSet()
                    val allCodes = (codes + pendSet).distinct()
                    for (code in allCodes) {
                        val status = when {
                            code in permSet -> "PERMANENT"
                            code in codes -> "CONFIRMED"
                            else -> "PENDING"
                        }
                        val existing = dtcLogDao.getActiveByCode(vehicle.id, code)
                        if (existing != null) {
                            // Lỗi đã active: chỉ cập nhật last_detected_at (không tạo scan mới liên tục).
                            if (existing.lastDetectedAt != null && now - existing.lastDetectedAt < 60_000) {
                                continue
                            }
                            val updated = existing.copy(
                                lastDetectedAt = now,
                                status = status,
                                scanId = scanId,
                                freezeFrame = ff,
                                scannedAt = now,
                            )
                            dtcLogDao.upsert(updated)
                            syncQueueRepository.enqueueDtcLog(updated)
                        } else {
                            val log = DtcLogEntity(
                                id = java.util.UUID.randomUUID().toString(),
                                scanId = scanId,
                                vehicleId = vehicle.id,
                                deviceId = deviceId,
                                dtcCode = code,
                                status = status,
                                systemCategory = null, // server enrich từ dictionary
                                severity = null,
                                descriptionVi = null,
                                freezeFrame = ff,
                                isActive = true,
                                source = "obd",
                                firstDetectedAt = now,
                                lastDetectedAt = now,
                                clearedAt = null,
                                scannedAt = now,
                            )
                            dtcLogDao.upsert(log)
                            syncQueueRepository.enqueueDtcLog(log)
                        }
                    }
                    _lastScanSummary.value = if (milOn) "⚠ MIL ON • ${confirmed.size + pending.size} lỗi" else "✅ $now"
                    emitAlert(vehicle.id, allCodes.size)
                } else {
                    // MIL OFF, không code: đóng các lỗi active cũ.
                    val hadActive = dtcLogDao.activeCount(vehicle.id) > 0
                    val cleared = dtcLogDao.getActive(vehicle.id)
                    dtcLogDao.markAllInactive(vehicle.id, now)
                    cleared.forEach { c ->
                        val closed = c.copy(isActive = false, clearedAt = now, scannedAt = now)
                        // Không cập nhật deviceId/scanId mới để giữ nguyên nguồn gốc.
                        dtcLogDao.upsert(closed)
                        syncQueueRepository.enqueueDtcLog(closed)
                    }
                    if (hadActive) {
                        val scan = DiagnosticScanEntity(
                            id = scanId,
                            vehicleId = vehicle.id,
                            deviceId = deviceId,
                            scannedAt = now,
                            odometerKm = odo,
                            milStatus = false,
                            dtcCount = 0,
                            scanType = if (auto) "AUTO_BACKGROUND" else "MANUAL_SCAN",
                            source = "obd",
                        )
                        diagnosticScanDao.upsert(scan)
                        syncQueueRepository.enqueueDiagnosticScan(scan)
                        _lastScanSummary.value = "✅ Hết lỗi ($now)"
                    } else {
                        _lastScanSummary.value = "✅ 0 lỗi ($now)"
                    }
                }
            } else if (!auto) {
                _lastScanSummary.value = if (codes.isEmpty()) "✅ 0 lỗi" else "⚠ ${codes.size} lỗi (không đổi)"
            }

            lastMilOn = milOn
            lastCodes = codes
        } finally {
            _scanning.value = false
        }
    }

    private fun emitAlert(vehicleId: String, count: Int) {
        com.fmms.carlogger.util.AlertNotifier.notifyDtc(context = com.fmms.carlogger.AppContainer.context, count = count)
    }
}
