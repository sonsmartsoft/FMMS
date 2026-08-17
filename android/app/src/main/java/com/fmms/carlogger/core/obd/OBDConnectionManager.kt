package com.fmms.carlogger.core.obd

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Manages OBD transport selection (SPP vs BLE), auto-reconnect (mandatory per spec §11),
 * and the ELM327 protocol initialization. Connection-ready clients use [elms].
 */
class OBDConnectionManager(
    context: Context,
    private val scope: CoroutineScope,
    private val settings: () -> String?,
    private val onStateChanged: ((OBDConnectionState) -> Unit)? = null,
) {
    private val appContext = context.applicationContext
    private val transport = BluetoothClassicTransport()

    private val _connectionState = MutableStateFlow<OBDConnectionState>(OBDConnectionState.DISCONNECTED)
    val connectionState: StateFlow<OBDConnectionState> = _connectionState

    val elms = ELM327ProtocolManager(transport)

    private val mutex = Mutex()
    private var reconnectJob: Job? = null
    private var lastMacAddress: String? = null
    private var shouldBeConnected = false

    fun start() {
        lastMacAddress = settings()
        if (lastMacAddress.isNullOrBlank()) {
            _connectionState.value = OBDConnectionState.DISCONNECTED
            return
        }
        shouldBeConnected = true
        attemptConnect()
    }

    fun connect(macAddress: String) {
        lastMacAddress = macAddress
        shouldBeConnected = true
        attemptConnect()
    }

    fun disconnect(reason: String = "user") {
        shouldBeConnected = false
        reconnectJob?.cancel()
        scope.launch {
            mutex.withLock { transport.disconnect() }
            _connectionState.value = OBDConnectionState.DISCONNECTED
        }
    }

    /** Trigger a reconnect without user action (e.g. reboot recovery, link loss). */
    fun requestReconnect() {
        if (shouldBeConnected && lastMacAddress != null) attemptConnect()
    }

    private fun attemptConnect() {
        val mac = lastMacAddress ?: return
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            while (shouldBeConnected) {
                if (transport.isConnected()) {
                    // Even when the socket reports connected, verify the link is
                    // actually alive: a stale socket (silent BT drop) must trigger
                    // a real reconnect, not sit idle forever.
                    if (!isLinkAlive()) {
                        _connectionState.value = OBDConnectionState.RECONNECTING
                        mutex.withLock { transport.disconnect() }
                        continue
                    }
                    delay(3000)
                    continue
                }
                _connectionState.value = if (_connectionState.value == OBDConnectionState.CONNECTED) {
                    OBDConnectionState.RECONNECTING
                } else {
                    OBDConnectionState.CONNECTING
                }
                val ok = mutex.withLock {
                    val connected = transport.connect(mac)
                    if (connected) {
                        try {
                            elms.initialize()
                        } catch (_: Exception) {
                        }
                    }
                    connected && transport.isConnected()
                }
                if (ok) {
                    _connectionState.value = OBDConnectionState.CONNECTED
                    onStateChanged?.invoke(OBDConnectionState.CONNECTED)
                    delay(3000)
                } else {
                    _connectionState.value = OBDConnectionState.ERROR
                    onStateChanged?.invoke(OBDConnectionState.ERROR)
                    delay(5000)
                }
            }
        }
    }

    /** Lightweight liveness probe: if the ELM was initialised, a dead socket
     *  makes a cheap AT command time out. */
    private suspend fun isLinkAlive(): Boolean {
        if (!elms.isInitialised) return true
        return kotlinx.coroutines.withTimeoutOrNull(1500) {
            elms.transportCommand("AT@1")
        } != null
    }

    fun getLastMacAddress(): String? = lastMacAddress

    companion object {
        const val PREF_OBD_MAC = "obd_device_mac"
        const val PREF_OBD_NAME = "obd_device_name"
    }
}