package com.fmms.carlogger.core.obd

data class OBDDataSample(
    val speedKmh: Float? = null,
    val rpm: Float? = null,
    val engineLoadPercent: Float? = null,
    val coolantTempC: Float? = null,
    val fuelLevelPercent: Float? = null,
    val batteryVoltage: Float? = null,
    val rawSource: String? = null
)

/**
 * Handles ELM327 Initialization (ATZ, ATE0, ATSP0) and PID Parsers (Speed, RPM, Coolant, Load, Fuel).
 */
class ELM327ProtocolManager(private val obdManager: OBDConnectionManager) {

    fun initializeProtocol(): Boolean {
        obdManager.sendCommand("ATZ")
        obdManager.sendCommand("ATE0")
        obdManager.sendCommand("ATL0")
        obdManager.sendCommand("ATS0")
        obdManager.sendCommand("ATH0")
        val protocol = obdManager.sendCommand("ATSP0")
        return protocol.contains("OK", ignoreCase = true) || protocol.contains("ELM327", ignoreCase = true)
    }

    fun parseSpeed(raw: String): Float? {
        val clean = raw.replace(" ", "").replace(">", "").trim()
        if (clean.startsWith("410D")) {
            val hex = clean.substring(4, 6)
            return hex.toIntOrNull(16)?.toFloat()
        }
        return null
    }

    fun parseRpm(raw: String): Float? {
        val clean = raw.replace(" ", "").replace(">", "").trim()
        if (clean.startsWith("410C") && clean.length >= 8) {
            val a = clean.substring(4, 6).toIntOrNull(16) ?: return null
            val b = clean.substring(6, 8).toIntOrNull(16) ?: return null
            return ((a * 256) + b) / 4.0f
        }
        return null
    }

    fun parseCoolant(raw: String): Float? {
        val clean = raw.replace(" ", "").replace(">", "").trim()
        if (clean.startsWith("4105") && clean.length >= 6) {
            val a = clean.substring(4, 6).toIntOrNull(16) ?: return null
            return (a - 40).toFloat()
        }
        return null
    }

    fun parseFuelLevel(raw: String): Float? {
        val clean = raw.replace(" ", "").replace(">", "").trim()
        if (clean.startsWith("412F") && clean.length >= 6) {
            val a = clean.substring(4, 6).toIntOrNull(16) ?: return null
            return (a * 100.0f) / 255.0f
        }
        return null
    }
}
