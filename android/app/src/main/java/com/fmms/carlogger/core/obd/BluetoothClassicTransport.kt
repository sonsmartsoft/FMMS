package com.fmms.carlogger.core.obd

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import com.fmms.carlogger.core.obd.OBDConnectionState.CONNECTED
import com.fmms.carlogger.core.obd.OBDConnectionState.CONNECTING
import com.fmms.carlogger.core.obd.OBDConnectionState.DISCONNECTED
import com.fmms.carlogger.core.obd.OBDConnectionState.ERROR
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

/**
 * Bluetooth Classic SPP transport for the KONNWEI KW906 ELM327 adapter.
 * Runs blocking socket I/O on Dispatchers.IO; UI stays on main thread.
 */
class BluetoothClassicTransport : OBDTransport {

    override val name: String = "KW906-BT-SPP"

    private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    private val _connectionState = MutableStateFlow<OBDConnectionState>(DISCONNECTED)
    override val connectionState: StateFlow<OBDConnectionState> = _connectionState

    private var socket: BluetoothSocket? = null
    private var input: InputStream? = null
    private var output: OutputStream? = null

    override suspend fun connect(macAddress: String): Boolean = withContext(Dispatchers.IO) {
        if (socket?.isConnected == true) {
            _connectionState.value = CONNECTED
            return@withContext true
        }
        _connectionState.value = CONNECTING
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: run {
                _connectionState.value = ERROR
                return@withContext false
            }
            if (!adapter.isEnabled) {
                _connectionState.value = ERROR
                return@withContext false
            }
            val device: BluetoothDevice = adapter.getRemoteDevice(macAddress)
            val newSocket = createInsecureRfcomm(device)
            socket = newSocket
            newSocket.connect()
            input = newSocket.inputStream
            output = newSocket.outputStream
            _connectionState.value = CONNECTED
            true
        } catch (e: Exception) {
            _connectionState.value = ERROR
            false
        }
    }

    private fun createInsecureRfcomm(device: BluetoothDevice): BluetoothSocket {
        return try {
            device.createRfcommSocketToServiceRecord(sppUuid)
        } catch (e: Exception) {
            // Some head-units only expose insecure SPP
            val method = device.javaClass.getMethod("createInsecureRfcommSocketToServiceRecord", UUID::class.java)
            method.invoke(device, sppUuid) as BluetoothSocket
        }
    }

    override suspend fun sendCommandAndWait(cmd: String, timeoutMs: Long): String? = withContext(Dispatchers.IO) {
        val out = output ?: return@withContext null
        val inStream = input ?: return@withContext null
        try {
            // Drain stale bytes left over from a late/aborted previous response,
            // otherwise answers desync from their commands (next command reads
            // the previous command's reply).
            val sink = ByteArray(1024)
            while (inStream.available() > 0) {
                if (inStream.read(sink) <= 0) break
            }

            out.write((cmd + "\r").toByteArray(Charsets.US_ASCII))
            out.flush()

            val buffer = ByteArray(2048)
            val sb = StringBuilder()
            val deadline = System.currentTimeMillis() + timeoutMs
            var bytesRead = 0
            while (System.currentTimeMillis() < deadline && bytesRead == 0) {
                if (inStream.available() > 0) {
                    val n = inStream.read(buffer)
                    if (n > 0) {
                        sb.append(String(buffer, 0, n, Charsets.ISO_8859_1))
                        bytesRead += n
                        // ELM327 responses end with '>' (prompt). Keep reading until prompt or timeout.
                        if (sb.toString().contains(">")) break
                    }
                } else {
                    delay(40)
                }
            }
            val raw = sb.toString().replace(">", "").trim()
            raw.ifEmpty { null }
        } catch (e: Exception) {
            null
        }
    }

    override fun isConnected(): Boolean = socket?.isConnected == true

    override suspend fun sendRaw(cmd: String): Unit = withContext(Dispatchers.IO) {
        try {
            output?.write((cmd + "\r").toByteArray(Charsets.US_ASCII))
            output?.flush() ?: Unit
        } catch (_: Exception) {
            Unit
        }
        Unit
    }

    override suspend fun disconnect(): Unit = withContext(Dispatchers.IO) {
        try {
            input?.close()
            output?.close()
            socket?.close()
        } catch (_: Exception) {
        } finally {
            socket = null
            input = null
            output = null
            _connectionState.value = DISCONNECTED
        }
        Unit
    }
}