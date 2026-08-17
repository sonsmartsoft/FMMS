package com.fmms.carlogger.core.obd

/**
 * OBD-II PID definition per spec §13.
 */
data class PidDefinition(
    val command: String,
    val description: String,
    val unit: String,
    val pollingRateMs: Long,
    val parser: (response: String) -> Double?,
)

object PidDefinitions {

    const val CMD_RPM = "010C"
    const val CMD_SPEED = "010D"
    const val CMD_LOAD = "0104"
    const val CMD_COOLANT = "0105"
    const val CMD_STFT = "0106"
    const val CMD_LTFT = "0107"
    const val CMD_MAP = "010B"
    const val CMD_IAT = "010F"
    const val CMD_MAF = "0110"
    const val CMD_THROTTLE = "0111"
    const val CMD_FUEL_LEVEL = "012F"
    const val CMD_RUNTIME = "0131"
    const val CMD_VOLTAGE = "0142"
    const val CMD_FUEL_RATE = "015E"

    /** Discovery commands per spec §13. */
    val DISCOVERY_PIDS: List<String> = listOf("0100", "0120", "0140", "0160", "0180", "01A0")

    fun all(): List<PidDefinition> = listOf(
        PidDefinition(CMD_RPM, "Engine RPM", "rpm", 250) { r -> decodeTwo(r, CMD_RPM)?.let { (a, b) -> (a * 256 + b) / 4.0 } },
        PidDefinition(CMD_SPEED, "Vehicle Speed", "km/h", 250) { r -> decodeOne(r, CMD_SPEED)?.toDouble() },
        PidDefinition(CMD_LOAD, "Engine Load", "%", 1000) { r -> decodeOne(r, CMD_LOAD)?.let { it * 100.0 / 255.0 } },
        PidDefinition(CMD_COOLANT, "Coolant Temp", "°C", 1000) { r -> decodeOne(r, CMD_COOLANT)?.let { it - 40.0 } },
        PidDefinition(CMD_STFT, "STFT Bank 1", "%", 1000) { r -> decodeOne(r, CMD_STFT)?.let { ((it - 128) * 100.0) / 128.0 } },
        PidDefinition(CMD_LTFT, "LTFT Bank 1", "%", 5000) { r -> decodeOne(r, CMD_LTFT)?.let { ((it - 128) * 100.0) / 128.0 } },
        PidDefinition(CMD_MAP, "Intake Manifold Pressure", "kPa", 1000) { r -> decodeOne(r, CMD_MAP)?.toDouble() },
        PidDefinition(CMD_IAT, "Intake Air Temp", "°C", 1000) { r -> decodeOne(r, CMD_IAT)?.let { it - 40.0 } },
        PidDefinition(CMD_MAF, "MAF", "g/s", 1000) { r -> decodeTwo(r, CMD_MAF)?.let { (a, b) -> (a * 256 + b).toDouble() / 100.0 } },
        PidDefinition(CMD_THROTTLE, "Throttle Position", "%", 1000) { r -> decodeOne(r, CMD_THROTTLE)?.let { it * 100.0 / 255.0 } },
        PidDefinition(CMD_FUEL_LEVEL, "Fuel Tank Level", "%", 5000) { r -> decodeOne(r, CMD_FUEL_LEVEL)?.let { it * 100.0 / 255.0 } },
        PidDefinition(CMD_RUNTIME, "Engine Runtime", "sec", 5000) { r -> decodeTwo(r, CMD_RUNTIME)?.let { (a, b) -> (a * 256 + b).toDouble() } },
        PidDefinition(CMD_VOLTAGE, "Control Module Voltage", "V", 1000) { r -> decodeTwo(r, CMD_VOLTAGE)?.let { (a, b) -> (a * 256 + b).toDouble() / 1000.0 } },
        PidDefinition(CMD_FUEL_RATE, "Engine Fuel Rate", "L/h", 1000) { r -> decodeTwo(r, CMD_FUEL_RATE)?.let { (a, b) -> (a * 256 + b).toDouble() / 20.0 } },
    )

    private fun clean(response: String): String =
        response.replace(Regex("[^0-9A-Fa-f]"), "").replace(">", "").trim()

    /** Expects "41XX" + data bytes. Returns first 2 hex chars as Int. */
    private fun decodeOne(response: String, pid: String): Int? {
        val c = clean(response)
        if (!c.startsWith("41" + pid.substring(2))) return null
        return c.substring(4, 6).toIntOrNull(16)
    }

    /** Expects "41XX" + 4 hex data bytes. Returns two Ints. */
    private fun decodeTwo(response: String, pid: String): Pair<Int, Int>? {
        val c = clean(response)
        if (!c.startsWith("41" + pid.substring(2))) return null
        if (c.length < 12) return null
        val a = c.substring(4, 6).toIntOrNull(16) ?: return null
        val b = c.substring(6, 8).toIntOrNull(16) ?: return null
        return a to b
    }

    /**
     * Discover which PIDs are supported using 01x0 bitmask responses.
     * Returns set of supported pid commands (e.g. "010C").
     */
    fun discoverSupported(responses: Map<String, String>): Set<String> {
        val supported = mutableSetOf<String>()
        responses.forEach { (query, response) ->
            val c = clean(response)
            if (!c.startsWith("41" + query.substring(2))) return@forEach
            if (c.length < 12) return@forEach
            val base = Integer.parseInt(query.substring(2, 4), 16) // e.g. 0x00, 0x20
            val bytes = (0..3).map { i -> c.substring(6 + i * 2, 8 + i * 2).toIntOrNull(16) ?: 0 }
            bytes.forEachIndexed { byteIndex, byte ->
                for (bit in 7 downTo 0) {
                    if (byte and (1 shl bit) != 0) {
                        val pid = (base + byteIndex * 8 + (7 - bit)).toString(16).padStart(2, '0')
                        supported += "01$pid"
                    }
                }
            }
        }
        return supported
    }
}