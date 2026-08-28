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
    const val CMD_ODOMETER = "01A6"

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

    /**
     * Locate the data payload that follows the "41XX" service echo, tolerating
     * CAN headers ("7E8 03 41 0D 00"), spaces/newlines and multi-ECU answers.
     */
    private fun serviceData(response: String, pid: String): String? {
        val c = clean(response)
        val idx = c.indexOf("41" + pid.substring(2))
        if (idx < 0) return null
        return c.substring(idx + 4)
    }

    /** Expects "41XX" + data bytes. Returns first 2 hex chars as Int. */
    private fun decodeOne(response: String, pid: String): Int? =
        serviceData(response, pid)?.let { it.take(2).toIntOrNull(16) }

    /** Expects "41XX" + 4 hex data bytes. Returns two Ints. */
    private fun decodeTwo(response: String, pid: String): Pair<Int, Int>? {
        val d = serviceData(response, pid) ?: return null
        if (d.length < 4) return null
        val a = d.substring(0, 2).toIntOrNull(16) ?: return null
        val b = d.substring(2, 4).toIntOrNull(16) ?: return null
        return a to b
    }

    /**
     * Decode ECU odometer (PID 01A6, 32-bit). J1979DA scale is ambiguous across
     * implementations (0.1 km/bit vs 1 km/bit), so both candidates are checked
     * against a reference (last known good / vehicle odo) and the closest
     * plausible one wins. Returns km or null.
     */
    fun decodeOdometer(response: String, referenceKm: Double?): Double? {
        val d = serviceData(response, CMD_ODOMETER) ?: return null
        if (d.length < 8) return null
        var raw = 0L
        for (i in 0 until 4) {
            val b = d.substring(i * 2, i * 2 + 2).toIntOrNull(16) ?: return null
            raw = (raw shl 8) or b.toLong()
        }
        if (raw <= 0L) return null
        val c1 = raw / 10.0
        val c2 = raw.toDouble()
        fun plausible(v: Double) = v > 10.0 && v < 3_000_000.0
        val ref = referenceKm?.takeIf { it > 0 }
        return when {
            ref != null && plausible(c1) && plausible(c2) ->
                if (kotlin.math.abs(c1 - ref) <= kotlin.math.abs(c2 - ref)) c1 else c2
            ref != null && plausible(c1) && kotlin.math.abs(c1 - ref) < 5_000.0 -> c1
            ref != null && plausible(c2) && kotlin.math.abs(c2 - ref) < 5_000.0 -> c2
            ref == null && plausible(c1) -> c1
            ref == null && plausible(c2) -> c2
            else -> null
        }
    }

    /**
     * Discover which PIDs are supported using 01x0 bitmask responses.
     * Returns set of supported pid commands (e.g. "010C").
     */
    fun discoverSupported(responses: Map<String, String>): Set<String> {
        val supported = mutableSetOf<String>()
        responses.forEach { (query, response) ->
            // Multi-ECU adapters answer with one line per ECU. Parse each line
            // separately — concatenating them corrupts byte offsets and can
            // produce short strings that crash substring() below.
            val lines = response.split(Regex("[\r\n]+"))
                .map { clean(it) }
            for (c in lines) {
                // Tolerate CAN headers ("7E803...") by locating the service echo.
                val marker = "41" + query.substring(2)
                val idx = c.indexOf(marker)
                if (idx < 0) continue
                val d = c.substring(idx + 4)
                // 4 data bytes = 8 hex chars minimum.
                if (d.length < 8) continue
                val base = Integer.parseInt(query.substring(2, 4), 16) // e.g. 0x00, 0x20
                val bytes = (0..3).map { i -> d.substring(i * 2, 2 + i * 2).toIntOrNull(16) ?: 0 }
                bytes.forEachIndexed { byteIndex, byte ->
                    for (bit in 7 downTo 0) {
                        if (byte and (1 shl bit) != 0) {
                            val pid = (base + byteIndex * 8 + (7 - bit)).toString(16).padStart(2, '0')
                            supported += "01$pid"
                        }
                    }
                }
            }
        }
        return supported
    }
}