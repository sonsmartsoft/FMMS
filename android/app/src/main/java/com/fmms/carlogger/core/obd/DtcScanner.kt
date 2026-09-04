package com.fmms.carlogger.core.obd

import org.json.JSONObject

/**
 * OBD-II DTC scanner per spec. Reads:
 *  - Mode 01 01: MIL status + DTC count
 *  - Mode 03:    confirmed DTCs
 *  - Mode 07:    pending DTCs
 *  - Mode 0A:    permanent DTCs (optional)
 *  - Mode 02:    freeze-frame data (engine snapshot at fault time)
 */
data class DtcScanResult(
    val milOn: Boolean,
    val dtcCount: Int,
    val confirmedCodes: List<String>,
    val pendingCodes: List<String>,
    val permanentCodes: List<String>,
    val freezeFrame: JSONObject?,
)

object DtcScanner {

    /** Decode a 2-byte DTC into the standard e.g. 'P0300' string. First byte
     *  high nibble selects family (0=P,1=C,2=B,3=U). */
    fun decodeDtc(a: Int, b: Int): String {
        val family = when ((a ushr 6) and 0x03) {
            0 -> 'P'
            1 -> 'C'
            2 -> 'B'
            else -> 'U'
        }
        val second = (a ushr 4) and 0x03
        val third = a and 0x0F
        val fourth = (b ushr 4) and 0x0F
        val fifth = b and 0x0F
        return "%c%d%X%X%X".format(family, second, third, fourth, fifth)
    }

    /** Extract the list of free hex tokens from a raw ELM response (skips the
     *  service echo "43"/"47"/"4A", CAN headers "7E8", and "0"/prompt noise). */

    /** Raw parse producing a list of decoded DTC codes from a Mode 03/07/0A response. */
    fun parseDtcResponse(response: String?): List<String> {
        if (response.isNullOrBlank()) return emptyList()
        val hex = response.replace(Regex("[^0-9A-Fa-f]"), "")
        // Locate the service echo (43 for mode 03, 47 for 07, 4A for 0A).
        val marker = when {
            hex.contains("47", true) -> hex.indexOf("47", 2)
            hex.contains("4A", true) -> hex.indexOf("4A", 2)
            else -> hex.indexOf("43", 2)
        }
        val start = if (marker >= 0) marker + 2 else hex.indexOf("43", 2).let { if (it >= 0) it + 2 else 0 }
        val data = hex.substring(start).trim()
        if (data.length < 4) return emptyList()
        val tokens = data.chunked(4).mapNotNull { pair ->
            if (pair.length < 4) return@mapNotNull null
            val a = pair.substring(0, 2).toIntOrNull(16) ?: return@mapNotNull null
            val b = pair.substring(2, 4).toIntOrNull(16) ?: return@mapNotNull null
            if (a == 0 && b == 0) return@mapNotNull null // filler after last real code
            decodeDtc(a, b)
        }
        return tokens
    }

    /** Parse Mode 01 01: returns (milOn, dtcCount) or null if invalid. */
    fun parseMil(response: String?): Pair<Boolean, Int>? {
        if (response.isNullOrBlank()) return null
        val hex = response.replace(Regex("[^0-9A-Fa-f]"), "")
        val idx = hex.indexOf("41", 2)
        if (idx < 0) return null
        val data = hex.substring(idx + 2)
        if (data.length < 2) return null
        val a = data.substring(0, 2).toIntOrNull(16) ?: return null
        val milOn = (a and 0x80) != 0
        val count = a and 0x7F
        return milOn to count
    }

    /** Build a freeze-frame JSON from PID reads. Values are best-effort; nulls
     *  are omitted so the JSON stays compact. */
    fun buildFreezeFrame(
        rpm: Double?,
        speedKmh: Double?,
        coolantTempC: Double?,
        engineLoadPercent: Double?,
        intakeAirTempC: Double?,
        mafGps: Double?,
        fuelPressureKpa: Double?,
    ): JSONObject = JSONObject().apply {
        rpm?.takeIf { it.isFinite() && it > 0 }?.let { put("rpm", it.toInt()) }
        speedKmh?.takeIf { it.isFinite() && it >= 0 }?.let { put("speed_kmh", it) }
        coolantTempC?.takeIf { it.isFinite() }?.let { put("coolant_temp_c", it.toInt()) }
        engineLoadPercent?.takeIf { it.isFinite() && it >= 0 }?.let { put("engine_load_pct", it) }
        intakeAirTempC?.takeIf { it.isFinite() }?.let { put("intake_air_temp_c", it.toInt()) }
        mafGps?.takeIf { it.isFinite() && it > 0 }?.let { put("maf_gps", it) }
        fuelPressureKpa?.takeIf { it.isFinite() && it > 0 }?.let { put("fuel_pressure_kpa", it) }
    }

    /** Decode a raw DTC code string (e.g. "P0300") to description-friendly terms. */
    val DTC_COMMAND_CONFIRMED = "03"
    val DTC_COMMAND_PENDING = "07"
    val DTC_COMMAND_PERMANENT = "0A"
    val DTC_COMMAND_MIL = "0101"
}
