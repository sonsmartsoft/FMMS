package com.fmms.carlogger.core.obd

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.Context
import android.os.Handler
import android.os.Looper
import com.fmms.carlogger.core.obd.OBDConnectionState.CONNECTED
import com.fmms.carlogger.core.obd.OBDConnectionState.CONNECTING
import com.fmms.carlogger.core.obd.OBDConnectionState.DISCONNECTED
import com.fmms.carlogger.core.obd.OBDConnectionState.ERROR
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext

/**
 * BLE transport for ELM327 BLE adapters (alternative to SPP).
 * Uses BluetoothGatt with AT command over a characteristic.
 * NOTE: fallback path — primary flow is Bluetooth SPP.
 */
class BluetoothBleTransport(
    private val context: Context,
    private val serviceUuid: String = "0000fff0-0000-1000-8000-00805f9b34fb",
    private val notifyCharacteristicUuid: String = "0000fff1-0000-1000-8000-00805f9b34fb",
    private val writeCharacteristicUuid: String = "0000fff2-0000-1000-8000-00805f9b34fb",
) : OBDTransport {

    override val name: String = "KW906-BLE"

    private val _connectionState = MutableStateFlow<OBDConnectionState>(DISCONNECTED)
    override val connectionState: StateFlow<OBDConnectionState> = _connectionState

    private val responseBuffer = StringBuilder()
    private val pendingCommand = CompletableDeferred<String>()
    private val mainHandler = Handler(Looper.getMainLooper())

    private var gatt: android.bluetooth.BluetoothGatt? = null

    override suspend fun connect(macAddress: String): Boolean = withContext(Dispatchers.IO) {
        _connectionState.value = CONNECTING
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: return@withContext false
            val device: BluetoothDevice = adapter.getRemoteDevice(macAddress)
            val result = CompletableDeferred<Boolean>()
            mainHandler.post {
                gatt = device.connectGatt(context, false, object : android.bluetooth.BluetoothGattCallback() {

                    private val targetService = java.util.UUID.fromString(serviceUuid)
                    private val targetWrite = java.util.UUID.fromString(writeCharacteristicUuid)
                    private val targetNotify = java.util.UUID.fromString(notifyCharacteristicUuid)

                    override fun onConnectionStateChange(
                        g: android.bluetooth.BluetoothGatt,
                        status: Int,
                        newState: Int,
                    ) {
                        if (newState == android.bluetooth.BluetoothProfile.STATE_CONNECTED) {
                            g.discoverServices()
                        } else {
                            _connectionState.value = DISCONNECTED
                            result.complete(false)
                        }
                    }

                    override fun onServicesDiscovered(g: android.bluetooth.BluetoothGatt, status: Int) {
                        val service = g.getService(targetService) ?: run {
                            result.complete(false)
                            return
                        }
                        val writeChar = service.getCharacteristic(targetWrite)
                        val notifyChar = service.getCharacteristic(targetNotify)
                        if (writeChar == null || notifyChar == null) {
                            result.complete(false)
                            return
                        }
                        g.setCharacteristicNotification(notifyChar, true)
                        val descriptor = notifyChar.getDescriptor(
                            java.util.UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
                        )
                        descriptor?.value = android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        g.writeDescriptor(descriptor)
                        gatt = g
                        _connectionState.value = CONNECTED
                        result.complete(true)
                    }

                    override fun onCharacteristicChanged(
                        g: android.bluetooth.BluetoothGatt,
                        characteristic: android.bluetooth.BluetoothGattCharacteristic,
                        value: ByteArray,
                    ) {
                        val text = String(value, Charsets.ISO_8859_1)
                        responseBuffer.append(text)
                        if (responseBuffer.toString().contains(">") || text.trim().endsWith("OK")) {
                            pendingCommand.complete(responseBuffer.toString().replace(">", "").trim())
                            responseBuffer.clear()
                        }
                    }
                })
            }
            result.await()
        } catch (e: Exception) {
            _connectionState.value = ERROR
            false
        }
    }

    override suspend fun sendCommandAndWait(cmd: String, timeoutMs: Long): String? {
        val g = gatt ?: return null
        val service = g.getService(java.util.UUID.fromString(serviceUuid)) ?: return null
        val writeChar = service.getCharacteristic(java.util.UUID.fromString(writeCharacteristicUuid)) ?: return null
        return try {
            responseBuffer.clear()
            mainHandler.post {
                writeChar.value = (cmd + "\r").toByteArray(Charsets.US_ASCII)
                g.writeCharacteristic(writeChar)
            }
            // Wait for response after write
            val response = kotlinx.coroutines.withTimeout(timeoutMs) { pendingCommand.await() }
            response.ifEmpty { null }
        } catch (_: Exception) {
            null
        }
    }

    override fun isConnected(): Boolean = _connectionState.value == CONNECTED

    override suspend fun sendRaw(cmd: String): Unit {
        val g = gatt ?: return
        val service = g.getService(java.util.UUID.fromString(serviceUuid)) ?: return
        val writeChar = service.getCharacteristic(java.util.UUID.fromString(writeCharacteristicUuid)) ?: return
        mainHandler.post {
            writeChar.value = (cmd + "\r").toByteArray(Charsets.US_ASCII)
            g.writeCharacteristic(writeChar)
        }
        Unit
    }

    override suspend fun captureStream(cmd: String, durationMs: Long): String? =
        withContext(Dispatchers.IO) {
            val before = responseBuffer.length
            sendRaw(cmd)
            delay(durationMs)
            sendRaw(".")
            delay(150)
            val out = synchronized(responseBuffer) {
                if (responseBuffer.length > before) responseBuffer.substring(before) else ""
            }
            out.ifEmpty { null }
        }

    override suspend fun disconnect(): Unit {
        mainHandler.post { gatt?.disconnect(); gatt?.close(); gatt = null }
        _connectionState.value = DISCONNECTED
        Unit
    }
}