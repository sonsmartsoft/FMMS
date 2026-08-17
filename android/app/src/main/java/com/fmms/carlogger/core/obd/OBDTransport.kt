package com.fmms.carlogger.core.obd

import kotlinx.coroutines.flow.StateFlow

/**
 * Abstraction of the physical OBD transport.
 * Supports Bluetooth Classic (SPP) and BLE per spec §2.
 */
interface OBDTransport {
    val name: String
    val connectionState: StateFlow<OBDConnectionState>

    /** Establish the socket connection (non-blocking on main). */
    suspend fun connect(macAddress: String): Boolean

    /** Send an AT/PID command and wait for the full response (until prompt). */
    suspend fun sendCommandAndWait(cmd: String, timeoutMs: Long = 1500): String?

    fun isConnected(): Boolean

    suspend fun disconnect()

    /** Best-effort short send used for init sequences that return no payload. */
    suspend fun sendRaw(cmd: String)
}