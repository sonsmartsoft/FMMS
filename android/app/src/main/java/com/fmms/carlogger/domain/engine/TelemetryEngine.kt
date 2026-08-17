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
) {

    private val _live = MutableStateFlow(LiveTelemetry())
    val live: StateFlow<LiveTelemetry> = _live

    private var pollJob: Job? = null

    data class PollResult(val telemetry: LiveTelemetry, val raw: List<Pair<String, String>>)

    fun start() {
        if (pollJob?.isActive == true) return
        pollJob = scope.launch {
            var lastFuelRate = 0.0
            while (true) {
                if (!elms.isInitialised) {
                    delay(1000)
                    continue
                }
                val result = pollOnce()
                _live.value = result.telemetry.copy(
                    timestamp = System.currentTimeMillis(),
                    gpsSpeedKmh = gpsTracker.currentLocation()?.speed?.takeIf { it > 0 }?.let { (it * 3.6).toDouble() },
                    latitude = gpsTracker.currentLocation()?.latitude?.takeIf { it != 0.0 },
                    longitude = gpsTracker.currentLocation()?.longitude?.takeIf { it != 0.0 },
                    gpsAccuracy = gpsTracker.currentLocation()?.accuracy?.toDouble(),
                )
                // Fuel consumption accumulator uses fuel_rate when available
                if (result.telemetry.fuelRateLph != null) lastFuelRate = result.telemetry.fuelRateLph
                diagLogOutput?.log(result.raw)
                delay(1000)
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