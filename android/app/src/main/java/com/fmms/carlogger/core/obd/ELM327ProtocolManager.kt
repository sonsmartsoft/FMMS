package com.fmms.carlogger.core.obd

import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class Elm327Info(
    val deviceDescription: String? = null,
    val firmwareVersion: String? = null,
    val protocol: String? = null,
    val elmVersion: String? = null,
    val supportedPids: Set<String> = emptySet(),
)

/**
 * ELM327 wrapper: initialization (ATZ..ATSPx), adapter identification,
 * PID discovery and command execution. Uses a Mutex so polling and
 * diagnostics never interleave commands.
 * 
 * Protocol fallback: tries ATSP6 (ISO 15765-4 CAN 11-bit 500k) FIRST by default,
 * then ATSP0 (auto), then other CAN protocols (ATSP7/8/9) if PID discovery
 * returns too few critical PIDs. This handles adapters that don't auto-detect
 * correctly on some vehicles.
 */
class ELM327ProtocolManager(private val transport: OBDTransport) {

    private val mutex = Mutex()

    var info: Elm327Info = Elm327Info()
        private set

    val isInitialised: Boolean get() = info.supportedPids.isNotEmpty()

    suspend fun initialize(): Elm327Info = mutex.withLock {
        // Protocol candidates in order: CAN 11b/500k FIRST -> auto -> 29b/500k -> 11b/250k -> 29b/250k
        val protocolCandidates = listOf(
            "ATSP6",  // ISO 15765-4 CAN (11-bit ID, 500 kbaud) — DEFAULT/PRIORITY
            "ATSP0",  // Auto
            "ATSP7",  // ISO 15765-4 CAN (29-bit ID, 500 kbaud)
            "ATSP8",  // ISO 15765-4 CAN (11-bit ID, 250 kbaud)
            "ATSP9",  // ISO 15765-4 CAN (29-bit ID, 250 kbaud)
        )

        var bestInfo: Elm327Info? = null
        var bestCriticalCount = -1

        for (protoCmd in protocolCandidates) {
            val attemptInfo = tryInitializeWithProtocol(protoCmd)
            val criticalCount = countCriticalPids(attemptInfo.supportedPids)
            if (criticalCount > bestCriticalCount) {
                bestCriticalCount = criticalCount
                bestInfo = attemptInfo.copy(protocol = protoCmd.substringAfter("ATSP"))
                if (criticalCount >= 3) break // đủ RPM/SPEED/COOLANT/FUEL_LEVEL
            }
            // small delay giữa các lần thử
            delay(200)
        }

        info = bestInfo ?: Elm327Info()
        info
    }

    private suspend fun tryInitializeWithProtocol(protoCmd: String): Elm327Info {
        val infoBuilder = Elm327InfoBuilder()
        val atz = transport.sendCommandAndWait("ATZ") ?: ""
        infoBuilder.approxVersion = atz
        transport.sendRaw("ATE0")
        transport.sendRaw("ATL0")
        transport.sendRaw("ATS0")
        transport.sendRaw("ATH0")
        transport.sendRaw(protoCmd) // force protocol
        infoBuilder.deviceDescription = transport.sendCommandAndWait("AT@1", 2000)
        infoBuilder.firmware = transport.sendCommandAndWait("ATI", 2000)
        infoBuilder.protocol = transport.sendCommandAndWait("ATDPN", 2000)
        infoBuilder.elmVersion = transport.sendCommandAndWait("ATI", 2000)

        // PID discovery
        val discoveryResponses = mutableMapOf<String, String>()
        for (query in PidDefinitions.DISCOVERY_PIDS) {
            val resp = transport.sendCommandAndWait(query, 2000)
            if (!resp.isNullOrBlank() && resp.contains("41", ignoreCase = true)) {
                discoveryResponses[query] = resp
            }
        }
        val supportedByMask = PidDefinitions.discoverSupported(discoveryResponses)

        // Merge with "known to exist" PIDs
        val known = setOf(
            PidDefinitions.CMD_RPM,
            PidDefinitions.CMD_SPEED,
            PidDefinitions.CMD_FUEL_LEVEL,
            PidDefinitions.CMD_COOLANT,
            PidDefinitions.CMD_VOLTAGE,
        )
        val supported = (supportedByMask - setOf("0101", "0103", "0100", "0120", "0140", "0160", "0180", "01A0")).toMutableSet().apply {
            addAll(known)
        }

        return infoBuilder.build(supported)
    }

    private fun countCriticalPids(pids: Set<String>): Int {
        val critical = setOf(
            PidDefinitions.CMD_RPM,
            PidDefinitions.CMD_SPEED,
            PidDefinitions.CMD_COOLANT,
            PidDefinitions.CMD_FUEL_LEVEL,
        )
        return pids.count { it in critical }
    }

    suspend fun sendCommand(cmd: String): String? = mutex.withLock {
        transport.sendCommandAndWait(cmd, 2000)
    }

    /** Cheap liveness probe used by the connection manager (no mutex to avoid deadlock). */
    suspend fun transportCommand(cmd: String): String? =
        transport.sendCommandAndWait(cmd, 1500)

    /** Run a single read of a PID, returns parsed value or null if unsupported/unreadable. */
    suspend fun readPid(pid: PidDefinition): Double? {
        if (info.supportedPids.isNotEmpty() && pid.command !in info.supportedPids) {
            if (pid.command !in setOf(
                    PidDefinitions.CMD_RPM,
                    PidDefinitions.CMD_SPEED,
                    PidDefinitions.CMD_FUEL_LEVEL,
                    PidDefinitions.CMD_COOLANT,
                    PidDefinitions.CMD_VOLTAGE,
                    )
            ) return null
        }
        return mutex.withLock {
            val resp = transport.sendCommandAndWait(pid.command, 1500) ?: return@withLock null
            if (!resp.contains("41", ignoreCase = true)) return@withLock null
            pid.parser(resp)
        }
    }

    suspend fun shutdown() {
        mutex.withLock { transport.sendRaw("ATPC") }
    }

    private class Elm327InfoBuilder {
        var approxVersion: String = ""
        var deviceDescription: String? = null
        var firmware: String? = null
        var protocol: String? = null
        var elmVersion: String? = null

        fun build(supported: Set<String>): Elm327Info =
            Elm327Info(deviceDescription, firmware, protocol, elmVersion, supported)
    }
}