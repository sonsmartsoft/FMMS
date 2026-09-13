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

    /** Tách response thành các token hex độc lập; bỏ rác không phải hex. */
    private fun tokens(response: String?): List<String> {
        if (response.isNullOrBlank()) return emptyList()
        return response
            .replace(Regex("[^0-9A-Fa-f\\s]"), " ")
            .uppercase()
            .split(Regex("\\s+"))
            .filter { it.isNotEmpty() && it.all { ch -> ch.isDigit() || ch in 'A'..'F' } }
    }

    /** Hex byte thứ 8 của token (0..255) hoặc null nếu token không phải byte. */
    private fun byteOf(token: String): Int? =
        if (token.length == 2) token.toIntOrNull(16) else null

    /** Header CAN: 11-bit (3 hex, ví dụ 7E8) hoặc 29-bit (8 hex, ví dụ 18DAF110). */
    private fun isHeader(token: String): Boolean = token.length == 3 || token.length == 8

    /**
     * Dịch ISO-TP: sau mỗi header CAN là byte PCI quy định khung:
     *  - 0x00-0x07 : single frame (độ dài data = PCI). → bỏ PCI.
     *  - 0x10-0x1F : first frame, theo sau là 1 byte length. → bỏ PCI + len.
     *  - 0x20-0x2F : consecutive frame. → bỏ PCI.
     *  - 0x30-0x3F : flow control. → bỏ PCI.
     *  Service-echo "43"/"47"/"4A" (>0x3F) sau header ¬ LÀ PCI → PHẢI giữ.
     *  ELM trả mỗi ECU một dòng cách nhau bằng \r (hoặc \n) — gọi với TỪNG dòng.
     */
    private fun stripIsoTp(raw: List<String>): List<String> {
        val out = mutableListOf<String>()
        var afterHeader = false
        var i = 0
        while (i < raw.size) {
            val tok = raw[i]
            if (isHeader(tok)) {
                afterHeader = true
                i++
                continue
            }
            if (afterHeader) {
                afterHeader = false
                val pc = byteOf(tok)
                if (pc != null && pc < 0x40) {
                    if (pc in 0x10..0x1F && i + 1 < raw.size) {
                        i++ // first frame: bỏ thêm 1 byte length
                    }
                    i++
                    continue
                }
            }
            out.add(tok)
            i++
        }
        return out
    }

    /** Raw parse producing a list of decoded DTC codes from a Mode 03/07/0A response.
     *  ELM trả mỗi ECU/mỗi response trên một DÒNG riêng ("7E9 02 43 00" rồi
     *  "7E8 02 43 00"), các dòng cách nhau bằng \r hoặc \n. Phải parse TỪNG DÒNG
     *  để tránh service-echo "43"/"47" của ECU sau bị đọc nhầm thành byte DTC
     *  (bug ghost C0300/C0700). */
    fun parseDtcResponse(response: String?): List<String> {
        if (response.isNullOrBlank()) return emptyList()
        val out = mutableListOf<String>()
        // Tách dòng theo \r\n, \r, hoặc \n (một số adapter dùng \r đơn).
        val lines = response.split(Regex("[\\r\\n]+"))
        for (line in lines) {
            val clean = stripIsoTp(tokens(line))
            // Tìm service-echo "43"/"47"/"4A" (token byte đầu tiên trong vùng data).
            val serviceIdx = clean.indexOfFirst { val b = byteOf(it); b == 0x43 || b == 0x47 || b == 0x4A }
            if (serviceIdx < 0) continue
            val data = clean.drop(serviceIdx + 1)
            if (data.size < 2) continue
            // DTC = 2 byte liên tiếp (4 hex). Bỏ filler 0000 ở cuối.
            val codes = data.chunked(2).mapNotNull { pair ->
                if (pair.size < 2) return@mapNotNull null
                val a = pair[0].toIntOrNull(16) ?: return@mapNotNull null
                val b = pair[1].toIntOrNull(16) ?: return@mapNotNull null
                if (a == 0 && b == 0) return@mapNotNull null // filler sau mã thật
                decodeDtc(a, b)
            }
            out.addAll(codes)
        }
        return out.distinct()
    }

    /** Parse Mode 01 01: returns (milOn, dtcCount) or null if invalid.
     *  Cấu trúc response: "41 01 <stateByte>" (headers OFF) hoặc "7E8 41 01 <stateByte>"
     *  (headers ON). Phải bỏ PID-echo "41 01" rồi mới đọc byte trạng thái. */
    fun parseMil(response: String?): Pair<Boolean, Int>? {
        val clean = stripIsoTp(tokens(response))
        val sidIdx = clean.indexOfFirst { byteOf(it) == 0x41 }
        if (sidIdx < 0) return null
        // clean[sidIdx]="41" (SID), clean[sidIdx+1]="01" (PID) → byte trạng thái = +2.
        // Nếu clone chèn thêm byte DLC trước PID thì dịch 1: dùng token kế trực tiếp.
        val pidIdx = sidIdx + 1
        val pidTok = clean.getOrNull(pidIdx)
        val stateHex = if (pidTok != null && byteOf(pidTok) == 0x01) {
            clean.getOrNull(pidIdx + 1)
        } else {
            pidTok
        }
        val a = stateHex?.toIntOrNull(16) ?: return null
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
