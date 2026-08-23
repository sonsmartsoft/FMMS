package com.fmms.carlogger.core.obd

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.os.Build
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.UUID

/**
 * BLE GATT transport for ELM327 adapters (e.g. KONNWEI KW906 dual-mode).
 * The vendor MAXOBD app uses GATT exclusively and holds a stable link,
 * while the adapter's Classic SPP mode stalls/PAGE_TIMEOUTs — so this is
 * the preferred transport.
 *
 * Protocol: write ASCII commands ("\r"-terminated) to a writable
 * characteristic; responses stream back as notifications until '>' prompt.
 */
class BleOBDTransport(context: Context) : OBDTransport {

    override val name: String = "KW906-BLE-GATT"

    private val appContext = context.applicationContext

    private val _connectionState = MutableStateFlow<OBDConnectionState>(OBDConnectionState.DISCONNECTED)
    override val connectionState: StateFlow<OBDConnectionState> = _connectionState

    private var gatt: BluetoothGatt? = null
    private var txChar: BluetoothGattCharacteristic? = null
    private var rxChar: BluetoothGattCharacteristic? = null

    private val rx = StringBuilder()
    @Volatile private var promptSeen = false

    private val writeMutex = Mutex()
    private var writeAck: CompletableDeferred<Boolean>? = null
    private var descAck: CompletableDeferred<Boolean>? = null
    private var mtuValue: Int = 23

    private companion object {
        val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        val KNOWN_SERVICES = listOf(
            // Common OBD-over-BLE profiles, tried first by service prefix.
            Triple("fff0", "fff1", "fff2"), // FFF1 notify / FFF2 write
            Triple("18f0", "18f6", "18f5"), // 18F6 notify / 18F5 write
            Triple("6e400001-b5a3-f393-e0a9-e50e24dcca9e",
                   "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
                   "6e400002-b5a3-f393-e0a9-e50e24dcca9e"), // Nordic UART
        )
        val SKIP_SERVICES = setOf(
            "00001800-0000-1000-8000-00805f9b34fb", // GAP
            "00001801-0000-1000-8000-00805f9b34fb", // GATT
            "0000180a-0000-1000-8000-00805f9b34fb", // Device Info
            "0000180f-0000-1000-8000-00805f9b34fb", // Battery
        )
        const val TRANSPORT_LE = 2
    }

    private val callback = object : BluetoothGattCallback() {

        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> g.requestMtu(185)
                BluetoothProfile.STATE_DISCONNECTED -> {
                    _connectionState.value = OBDConnectionState.DISCONNECTED
                    cleanup(g)
                }
            }
        }

        override fun onMtuChanged(g: BluetoothGatt, mtu: Int, status: Int) {
            mtuValue = mtu
            g.discoverServices()
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                _connectionState.value = OBDConnectionState.ERROR
                return
            }
            pickCharacteristics(g)
            if (txChar == null || rxChar == null) {
                _connectionState.value = OBDConnectionState.ERROR
                return
            }
            enableNotifications(g)
        }

        override fun onDescriptorWrite(g: BluetoothGatt, d: BluetoothGattDescriptor, status: Int) {
            descAck?.complete(status == BluetoothGatt.GATT_SUCCESS)
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
            writeAck?.complete(status == BluetoothGatt.GATT_SUCCESS)
        }

        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
            @Suppress("DEPRECATION") val value = c.value ?: return
            appendRx(value)
        }

        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) {
            appendRx(value)
        }
    }

    private fun appendRx(value: ByteArray) {
        val text = String(value, Charsets.ISO_8859_1)
        synchronized(rx) {
            rx.append(text)
            if ('>' in text) promptSeen = true
        }
    }

    private fun pickCharacteristics(g: BluetoothGatt) {
        fun uuidOf(c: BluetoothGattCharacteristic) = c.uuid.toString().lowercase()

        // 1) Known profiles
        for ((svcPrefix, notifyPrefix, writePrefix) in KNOWN_SERVICES) {
            val svc = g.services.firstOrNull {
                it.uuid.toString().lowercase().startsWith(svcPrefix.substring(0, 4))
            } ?: continue
            svc.characteristics
                .firstOrNull { uuidOf(it).startsWith(notifyPrefix.substring(0, 4)) && notifyProp(it) }
                ?.let { rxChar = it }
            svc.characteristics
                .firstOrNull { uuidOf(it).startsWith(writePrefix.substring(0, 4)) && writeProp(it) }
                ?.let { txChar = it }
            if (txChar != null && rxChar != null) return
        }

        // 2) Generic: same service holding a notifiable + a writable characteristic
        for (svc in g.services) {
            if (svc.uuid.toString().lowercase() in SKIP_SERVICES) continue
            rxChar = svc.characteristics.firstOrNull { notifyProp(it) }
            txChar = svc.characteristics.firstOrNull { writeProp(it) }
            if (txChar != null && rxChar != null) return
        }
    }

    private fun notifyProp(c: BluetoothGattCharacteristic) =
        (c.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0

    private fun writeProp(c: BluetoothGattCharacteristic) =
        (c.properties and (BluetoothGattCharacteristic.PROPERTY_WRITE or
                BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0

    private fun enableNotifications(g: BluetoothGatt) {
        val c = rxChar ?: return
        g.setCharacteristicNotification(c, true)
        val desc = c.getDescriptor(CCCD)
        if (desc == null) {
            // No CCCD — some adapters push notifications regardless.
            _connectionState.value = OBDConnectionState.CONNECTED
            return
        }
        desc.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        descAck = CompletableDeferred()
        val ok = if (Build.VERSION.SDK_INT >= 33) {
            g.writeDescriptor(desc, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) ==
                    BluetoothGatt.GATT_SUCCESS
        } else {
            @Suppress("DEPRECATION") g.writeDescriptor(desc)
        }
        if (!ok) {
            _connectionState.value = OBDConnectionState.CONNECTED
            return
        }
        // Wait briefly for the descriptor ack; proceed anyway on timeout.
        val done = kotlinx.coroutines.runBlocking {
            withTimeoutOrNull(3000) { descAck?.await(); true } ?: false
        }
        _connectionState.value = if (done || true) OBDConnectionState.CONNECTED else OBDConnectionState.CONNECTED
    }

    @SuppressLint("MissingPermission")
    override suspend fun connect(macAddress: String): Boolean = withContext(Dispatchers.IO) {
        if (gatt?.connect() == true && txChar != null) {
            _connectionState.value = OBDConnectionState.CONNECTED
            return@withContext true
        }
        _connectionState.value = OBDConnectionState.CONNECTING
        try {
            val mgr = appContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter: BluetoothAdapter = mgr?.adapter ?: run {
                _connectionState.value = OBDConnectionState.ERROR
                return@withContext false
            }
            if (!adapter.isEnabled) {
                _connectionState.value = OBDConnectionState.ERROR
                return@withContext false
            }
            val device: BluetoothDevice = adapter.getRemoteDevice(macAddress)

            synchronized(rx) { rx.setLength(0); promptSeen = false }
            txChar = null; rxChar = null

            val g = if (Build.VERSION.SDK_INT >= 23) {
                device.connectGatt(appContext, false, callback, TRANSPORT_LE)
            } else {
                device.connectGatt(appContext, false, callback)
            }
            gatt = g

            // Wait for full readiness: connected + services + characteristics ready.
            val ready = withTimeoutOrNull(15_000) {
                while (!(txChar != null && rxChar != null &&
                            _connectionState.value == OBDConnectionState.CONNECTED ||
                            _connectionState.value == OBDConnectionState.ERROR)
                ) delay(50)
                _connectionState.value == OBDConnectionState.CONNECTED
            }
            if (ready != true) {
                try { g.close() } catch (_: Exception) {}
                gatt = null
                _connectionState.value = OBDConnectionState.ERROR
                return@withContext false
            }
            true
        } catch (e: SecurityException) {
            _connectionState.value = OBDConnectionState.ERROR
            false
        } catch (e: Exception) {
            _connectionState.value = OBDConnectionState.ERROR
            false
        }
    }

    private fun cleanup(g: BluetoothGatt) {
        try { g.close() } catch (_: Exception) {}
        if (gatt === g) gatt = null
        txChar = null; rxChar = null
    }

    private suspend fun writeChunks(data: ByteArray): Boolean = writeMutex.withLock {
        val g = gatt ?: return false
        val c = txChar ?: return false
        val chunkSize = (mtuValue - 3).coerceIn(1, 512)
        var i = 0
        while (i < data.size) {
            val end = minOf(i + chunkSize, data.size)
            val slice = data.copyOfRange(i, end)
            val ack = CompletableDeferred<Boolean>()
            writeAck = ack
            val submitted = try {
                if (Build.VERSION.SDK_INT >= 33) {
                    g.writeCharacteristic(c, slice,
                        if ((c.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0)
                            BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                        else BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT) ==
                            BluetoothGatt.GATT_SUCCESS
                } else {
                    @Suppress("DEPRECATION")
                    run {
                        c.writeType =
                            if ((c.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0)
                                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                            else BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                        c.value = slice
                        g.writeCharacteristic(c)
                    }
                }
            } catch (e: SecurityException) { false }
            if (!submitted) return false
            val ok = withTimeoutOrNull(2000) { ack.await() } ?: false
            if (!ok) return false
            i = end
        }
        true
    }

    override suspend fun sendRaw(cmd: String) {
        writeChunks((cmd + "\r").toByteArray(Charsets.US_ASCII))
    }

    override suspend fun captureStream(cmd: String, durationMs: Long): String? = withContext(Dispatchers.IO) {
        if (gatt == null || txChar == null) return@withContext null
        synchronized(rx) { rx.setLength(0); promptSeen = false }
        val sent = writeChunks((cmd + "\r").toByteArray(Charsets.US_ASCII))
        if (!sent) return@withContext null
        // AT MA stream vô hạn — chỉ gom dữ liệu theo thời lượng rồi dừng
        // bằng một ký tự bất kỳ (ELM thoát monitor khi nhận byte).
        delay(durationMs)
        sendRaw(".")
        delay(150)
        val out = synchronized(rx) { rx.toString() }
        synchronized(rx) { rx.setLength(0); promptSeen = false }
        out.ifEmpty { null }
    }

    override suspend fun sendCommandAndWait(cmd: String, timeoutMs: Long): String? = withContext(Dispatchers.IO) {
        if (gatt == null || txChar == null) return@withContext null

        // Drain stale bytes so responses never desync from commands.
        synchronized(rx) { rx.setLength(0); promptSeen = false }

        val sent = writeChunks((cmd + "\r").toByteArray(Charsets.US_ASCII))
        if (!sent) return@withContext null

        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (promptSeen) break
            delay(25)
        }
        val raw = synchronized(rx) {
            rx.toString().replace(">", "").trim()
        }
        raw.ifEmpty { null }
    }

    override fun isConnected(): Boolean =
        gatt != null && txChar != null && rxChar != null &&
                _connectionState.value == OBDConnectionState.CONNECTED

    override suspend fun disconnect(): Unit = withContext(Dispatchers.IO) {
        val g = gatt
        try {
            g?.disconnect()
            delay(150)
            g?.close()
        } catch (_: Exception) {
        } finally {
            gatt = null
            txChar = null; rxChar = null
            _connectionState.value = OBDConnectionState.DISCONNECTED
        }
    }
}
