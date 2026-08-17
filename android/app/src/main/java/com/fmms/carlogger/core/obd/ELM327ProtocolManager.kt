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
 * ELM327 wrapper: initialization (ATZ..ATSP0), adapter identification,
 * PID discovery and command execution. Uses a Mutex so polling and
 * diagnostics never interleave commands.
 */
class ELM327ProtocolManager(private val transport: OBDTransport) {

    private val mutex = Mutex()

    var info: Elm327Info = Elm327Info()
        private set

    val isInitialised: Boolean get() = info.supportedPids.isNotEmpty()

    suspend fun initialize(): Elm327Info = mutex.withLock {
        val infoBuilder = Elm327Info().let {
            Elm327InfoBuilder().also { b ->
                val atz = transport.sendCommandAndWait("ATZ") ?: ""
                b.approxVersion = atz
                transport.sendRaw("ATE0") // echo off
                transport.sendRaw("ATL0") // linefeeds off
                transport.sendRaw("ATS0") // spaces off
                transport.sendRaw("ATH0") // headers off
                transport.sendRaw("ATSP0") // auto protocol
                b.deviceDescription = transport.sendCommandAndWait("AT@1", 2000)
                b.firmware = transport.sendCommandAndWait("ATI", 2000)
                b.protocol = transport.sendCommandAndWait("ATDPN", 2000)
                val elmVersion = transport.sendCommandAndWait("ATI", 2000)
                b.elmVersion = elmVersion
            }
        }
        // PID discovery
        val discoveryResponses = mutableMapOf<String, String>()
        for (query in PidDefinitions.DISCOVERY_PIDS) {
            val resp = transport.sendCommandAndWait(query, 2000)
            if (!resp.isNullOrBlank() && resp.contains("41", ignoreCase = true)) {
                discoveryResponses[query] = resp
            }
        }
        val supportedByMask = PidDefinitions.discoverSupported(discoveryResponses)

        // Merge with "known to exist" PIDs: even if the adapter can't tell us,
        // RPM/SPEED/FUEL_LEVEL are cheap and critical. Filter by what we can request later.
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

        info = infoBuilder.build(supported)
        info
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
            Elm327Info(deviceDescription, firmware, protocol, elmVersion.also { }, supported)
    }
}