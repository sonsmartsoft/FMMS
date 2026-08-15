package com.fmms.carlogger.core.obd

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

enum class OBDConnectionState {
    DISCONNECTED, SCANNING, CONNECTING, CONNECTED, RECONNECTING, ERROR
}

/**
 * Manages Bluetooth SPP / BLE Connection with KONNWEI KW906 ELM327 Adapter.
 */
class OBDConnectionManager {

    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private val _connectionState = MutableStateFlow(OBDConnectionState.DISCONNECTED)
    val connectionState: StateFlow<OBDConnectionState> = _connectionState

    private var socket: BluetoothSocket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null

    fun connectDevice(macAddress: String): Boolean {
        _connectionState.value = OBDConnectionState.CONNECTING
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: return false
            val device = adapter.getRemoteDevice(macAddress)

            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket?.connect()

            inputStream = socket?.inputStream
            outputStream = socket?.outputStream

            _connectionState.value = OBDConnectionState.CONNECTED
            return true
        } catch (e: Exception) {
            _connectionState.value = OBDConnectionState.ERROR
            return false
        }
    }

    fun sendCommand(cmd: String): String {
        return try {
            outputStream?.write((cmd + "\r").toByteArray())
            outputStream?.flush()

            val buffer = ByteArray(1024)
            val bytes = inputStream?.read(buffer) ?: 0
            if (bytes > 0) String(buffer, 0, bytes).trim() else ""
        } catch (e: Exception) {
            ""
        }
    }

    fun disconnect() {
        try {
            socket?.close()
        } catch (ignored: Exception) {}
        _connectionState.value = OBDConnectionState.DISCONNECTED
    }
}
