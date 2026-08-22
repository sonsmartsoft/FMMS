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

/** Human-readable name for an ELM327 ATDPN protocol number ("6" → ISO ...). */
fun elmProtocolName(number: String?): String? = when (number?.trim()?.uppercase()) {
    "0" -> "AUTO"
    "1" -> "SAE J1850 PWM"
    "2" -> "SAE J1850 VPW"
    "3" -> "ISO 9141-2"
    "4" -> "ISO 14230-4 KWP 5-BAUD"
    "5" -> "ISO 14230-4 KWP FAST"
    "6" -> "ISO 15765-4 CAN 11-BIT 500K"
    "7" -> "ISO 15765-4 CAN 29-BIT 500K"
    "8" -> "ISO 15765-4 CAN 11-BIT 250K"
    "9" -> "ISO 15765-4 CAN 29-BIT 250K"
    "A", "B" -> "SAE J1939 CAN"
    else -> number?.takeIf { it.isNotBlank() }
}

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

    /** Optional diagnostic sink: invoked with (command, response-or-null) for every exchange. */
    var onLog: ((cmd: String, resp: String?) -> Unit)? = null

    /** Timestamp of the last successful (non-null) response from the adapter. */
    @Volatile
    var lastRxMs: Long = 0L
        private set

    var info: Elm327Info = Elm327Info()
        private set

    val isInitialised: Boolean get() = info.supportedPids.isNotEmpty()

    private fun log(cmd: String, resp: String?) {
        if (resp != null) lastRxMs = System.currentTimeMillis()
        onLog?.invoke(cmd, resp)
    }

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
            log("$protoCmd#critical", criticalCount.toString())
            if (criticalCount > bestCriticalCount) {
                bestCriticalCount = criticalCount
                bestInfo = attemptInfo.copy(protocol = protoCmd.substringAfter("ATSP"))
                if (criticalCount >= 3) break // đủ RPM/SPEED/COOLANT/FUEL_LEVEL
            }
            // small delay giữa các lần thử
            delay(200)
        }

        info = bestInfo ?: Elm327Info()
        log("INIT_DONE", "pids=${info.supportedPids.size}")
        info
    }

    private suspend fun tryInitializeWithProtocol(protoCmd: String): Elm327Info {
        val infoBuilder = Elm327InfoBuilder()
        val atz = transport.sendCommandAndWait("ATZ") ?: ""
        log("ATZ", atz.ifEmpty { null })
        infoBuilder.approxVersion = atz
        // Await each config command (short timeout) so the ELM processes them
        // in order — matters on GATT where writes are discrete transactions.
        transport.sendCommandAndWait("ATE0", 800)
        transport.sendCommandAndWait("ATL0", 800)
        transport.sendCommandAndWait("ATS0", 800)
        transport.sendCommandAndWait("ATH0", 800)
        transport.sendCommandAndWait(protoCmd, 800).also { log(protoCmd, it) }
        infoBuilder.deviceDescription = transport.sendCommandAndWait("AT@1", 2000).also { log("AT@1", it) }
        infoBuilder.firmware = transport.sendCommandAndWait("ATI", 2000).also { log("ATI", it) }
        infoBuilder.protocol = transport.sendCommandAndWait("ATDPN", 2000).also { log("ATDPN", it) }
        infoBuilder.elmVersion = transport.sendCommandAndWait("ATI", 2000)

        // PID discovery
        val discoveryResponses = mutableMapOf<String, String>()
        for (query in PidDefinitions.DISCOVERY_PIDS) {
            val resp = transport.sendCommandAndWait(query, 2000)
            log(query, resp)
            if (!resp.isNullOrBlank() && resp.contains("41", ignoreCase = true)) {
                discoveryResponses[query] = resp
            }
        }
        val supportedByMask = PidDefinitions.discoverSupported(discoveryResponses)

        // Merge with "known to exist" PIDs — but only when the adapter actually
        // answered something. Forcing them onto a silent/dead link would make
        // isInitialised true and mask a dead connection as healthy.
        val adapterAlive = atz.isNotEmpty() || discoveryResponses.isNotEmpty()
        val known = setOf(
            PidDefinitions.CMD_RPM,
            PidDefinitions.CMD_SPEED,
            PidDefinitions.CMD_FUEL_LEVEL,
            PidDefinitions.CMD_COOLANT,
            PidDefinitions.CMD_VOLTAGE,
        )
        val supported = if (adapterAlive) {
            (supportedByMask - setOf("0101", "0103", "0100", "0120", "0140", "0160", "0180", "01A0")).toMutableSet().apply {
                addAll(known)
            }
        } else {
            mutableSetOf()
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
        transport.sendCommandAndWait(cmd, 2000).also { log(cmd, it) }
    }

    /** Cheap liveness probe used by the connection manager (no mutex to avoid deadlock). */
    suspend fun transportCommand(cmd: String): String? =
        transport.sendCommandAndWait(cmd, 1500).also { log(cmd, it) }

    /** Raw PID read bypassing the supported-PID filter (optional PIDs like 01A6 odometer). */
    suspend fun readPidRaw(command: String, timeoutMs: Long = 2000): String? =
        mutex.withLock { transport.sendCommandAndWait(command, timeoutMs).also { log(command, it) } }

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
            val resp = transport.sendCommandAndWait(pid.command, 2000)
            log(pid.command, resp)
            if (resp == null) return@withLock null
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