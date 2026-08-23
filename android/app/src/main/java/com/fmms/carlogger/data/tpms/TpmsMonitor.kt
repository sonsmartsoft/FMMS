package com.fmms.carlogger.data.tpms

import android.content.Context
import com.fmms.carlogger.core.usb.Ch9326Uart
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Trạng thái 1 bánh. Áp suất kPa, nhiệt độ °C (đã trừ offset 40 của giao thức). */
data class TpmsWheel(
    val kPa: Int? = null,
    val tempC: Int? = null,
    val battery: Int? = null,
    val statusFlags: Int = 0,
    val alarmFlags: Int = 0,
    val lastSeenMs: Long = 0L,
) {
    val signalLoss: Boolean get() = statusFlags and 8 != 0
    val lowBattery: Boolean get() = statusFlags and 4 != 0
    val slowLeak: Boolean get() = statusFlags and 2 != 0
    val fastLeak: Boolean get() = statusFlags and 1 != 0
    val highTemp: Boolean get() = alarmFlags and 8 != 0
    val highPressure: Boolean get() = alarmFlags and 4 != 0
    val lowPressure: Boolean get() = alarmFlags and 2 != 0
}

data class TpmsState(
    val connected: Boolean = false,
    val permissionNeeded: Boolean = false,
    /** bánh theo vị trí: 0=trước-trái, 1=trước-phải, 2=sau-trái, 3=sau-phải */
    val wheels: Map<Int, TpmsWheel> = emptyMap(),
    val learningWheel: Int? = null,
)

/**
 * Đọc bộ thu TPMS ZESTECH qua USB (CH9326). Frame UART dạng ASCII:
 * `$<wheel><status><alarm><p><pp><tt>[bb]#` — xem TmpsProtocalUtils của app gốc.
 */
class TpmsMonitor(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val uart = Ch9326Uart(context)
    private var loopJob: Job? = null

    private val _state = MutableStateFlow(TpmsState())
    val state: StateFlow<TpmsState> = _state

    private var learnUntil = 0L

    fun start() {
        if (loopJob?.isActive == true) return
        uart.registerPermissionReceiver()
        loopJob = scope.launch { run() }
    }

    fun stop() {
        loopJob?.cancel()
        loopJob = null
        uart.close()
        uart.unregisterPermissionReceiver()
        _state.value = _state.value.copy(connected = false)
    }

    fun requestPermissionIfNeeded(): Boolean {
        if (uart.hasPermission()) return true
        uart.requestPermission()
        return false
    }

    fun startLearn(wheel: Int) {
        send("\$L$wheel#")
        learnUntil = System.currentTimeMillis() + 60_000L
        _state.value = _state.value.copy(learningWheel = wheel)
    }

    fun cancelLearn() {
        send("\$LX#")
        learnUntil = 0L
        _state.value = _state.value.copy(learningWheel = null)
    }

    fun setAutoQuery(on: Boolean) = send(if (on) "\$TO#" else "\$T1#")

    fun queryAllIds() = send("\$T4#")

    fun queryAllInfo() = send("\$W1#")

    private fun send(cmd: String) {
        uart.write(cmd.toByteArray(Charsets.US_ASCII))
    }

    private suspend fun run() {
        val buf = ByteArray(64)
        val ring = StringBuilder()
        var lastHeartbeat = 0L
        var lastQuery = 0L
        var failStreak = 0
        while (scope.isActive) {
            if (!uart.isConnected()) {
                val ok = uart.open()
                if (!ok) {
                    _state.value = _state.value.copy(
                        connected = false,
                        permissionNeeded = uart.findDevice() != null && !uart.hasPermission(),
                    )
                    delay(3000L)
                    continue
                }
                // Cổng đã mở: coi như nối bộ thu, chờ frame cảm biến về
                _state.value = _state.value.copy(connected = true, permissionNeeded = false)
                delay(200L)
            }
            // heartbeat + truy vấn định kỳ
            val now = System.currentTimeMillis()
            if (now - lastHeartbeat > 5000L) {
                send("\$PS#")
                lastHeartbeat = now
            }
            if (now - lastQuery > 15000L) {
                send("\$TO#")
                send("\$W1#")
                lastQuery = now
            }
            if (learnUntil != 0L && now > learnUntil) {
                learnUntil = 0L
                _state.value = _state.value.copy(learningWheel = null)
            }

            val n = uart.read(buf)
            if (n <= 0) {
                // Bộ thu bị rút / treo: sau vài lần đọc hỏng thì đóng để vòng lặp mở lại
                if (++failStreak >= 5) {
                    uart.close()
                    _state.value = _state.value.copy(connected = false)
                    failStreak = 0
                }
                continue
            }
            failStreak = 0
            for (i in 0 until n) {
                val c = buf[i].toInt().toChar()
                if (c == '$') {
                    ring.clear()
                    ring.append(c)
                } else if (ring.isNotEmpty()) {
                    ring.append(c)
                    if (c == '#') {
                        parseFrame(ring.toString())
                        ring.clear()
                    } else if (ring.length > 32) {
                        ring.clear()
                    }
                }
            }
        }
    }

    private fun parseFrame(frame: String) {
        // frame = "$....#"
        if (frame.length < 9 || !frame.startsWith("$") || !frame.endsWith("#")) return
        val s = frame.substring(1, frame.length - 1)
        val wheel = s[0]
        if (wheel !in '0'..'3') return
        runCatching {
            val status = s[1].toString().toInt()
            val alarm = s[2].toString().toInt()
            val pressDigit = s[3].toString().toInt()
            val pressHex = s.substring(4, 6).toInt(16)
            val kPa = pressDigit + pressHex * 10
            val tempRaw = s.substring(6, 8).toInt(16)
            val tempC = tempRaw - 40
            // Pin là trường TUỲ CHỌN: một số cảm biến/frame không gửi -> để trống
            val bbRaw = if (s.length >= 10) s.substring(8).trim() else ""
            val battery = bbRaw.takeWhile { it.isDigit() }.ifEmpty { null }?.toIntOrNull()
            android.util.Log.d(
                "TpmsMon",
                "frame=$frame len=${frame.length} bánh=${wheel - '0'} kPa=$kPa temp=$tempC pinRaw='$bbRaw'",
            )
            val w = TpmsWheel(
                kPa = kPa.takeIf { it > 0 },
                tempC = tempC,
                battery = battery?.takeIf { it in 1..100 },
                statusFlags = status,
                alarmFlags = alarm,
                lastSeenMs = System.currentTimeMillis(),
            )
            val wheels = _state.value.wheels.toMutableMap()
            wheels[wheel - '0'] = w
            _state.value = _state.value.copy(connected = true, wheels = wheels)
        }
    }
}
