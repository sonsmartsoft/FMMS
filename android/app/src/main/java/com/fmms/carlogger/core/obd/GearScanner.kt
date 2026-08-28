package com.fmms.carlogger.core.obd

import kotlinx.coroutines.delay

/**
 * Dò tín hiệu vị trí hộp số (P/R/N/D) trên bus CAN bằng cách nghe toàn bộ
 * lưu lượng (AT MA) trong từng trạng thái số, rồi phân tích vi sai:
 * byte nào ỔN ĐỊNH trong mỗi trạng thái nhưng KHÁC NHAU giữa các trạng thái
 * là ứng viên mang mã số hộp số.
 *
 * Quy trình: máy nổ → ghi ~6s ở P, R, N, D (người dùng chuyển số giữa các lần).
 */
class GearScanner(
    private val elms: ELM327ProtocolManager,
    private val transport: OBDTransport,
) {
    data class Frame(val id: String, val bytes: List<Int>)

    data class Stage(val gear: String, val raw: String, val frames: List<Frame>) {
        val frameCount: Int get() = frames.size
    }

    data class Candidate(
        val id: String,
        val byteIdx: Int,
        /** Giá trị hex ổn định của từng trạng thái; null = trạng thái không đủ dữ liệu. */
        val values: Map<String, String?>,
        val score: Int,
    )

    /** Bật header ID + dấu cách để dòng CAN dễ tách trường. */
    suspend fun setup() {
        elms.sendCommand("AT S1")
        elms.sendCommand("AT H1")
    }

    suspend fun teardown() {
        elms.sendCommand("AT H0")
        elms.sendCommand("AT S0")
    }

    /**
     * Nghe toàn bộ bus trong [chunks] đợt x [chunkMs] ms — BLE chuyển dữ liệu
     * chậm hơn bus nên mỗi đợt ngắn sẽ BUFFER FULL; gom nhiều đợt vẫn đủ mẫu
     * vì khung CAN định kỳ lặp lại hàng chục lần/giây.
     */
    suspend fun capture(
        gearLabel: String,
        chunks: Int = 6,
        chunkMs: Long = 5000L,
        onChunk: (done: Int, framesSoFar: Int) -> Unit = { _, _ -> },
    ): Stage {
        val sb = StringBuilder()
        var frames = 0
        repeat(chunks) { i ->
            val raw = transport.captureStream("ATMA", chunkMs) ?: ""
            sb.append(raw).append('\n')
            frames += parseFrames(raw).size
            onChunk(i + 1, frames)
        }
        return Stage(gearLabel.uppercase(), sb.toString(), parseFrames(sb.toString()))
    }

    companion object {
        /**
         * Dòng có header dạng "7E8 06 41 0C ..." (11-bit, ID 3 hex) hoặc
         * "18DAF110 06 ..." (29-bit, ID 8 hex). Bỏ qua các dòng rác/echo lệnh.
         */
        fun parseFrames(raw: String): List<Frame> {
            val out = mutableListOf<Frame>()
            for (line0 in raw.split('\n', '\r')) {
                val line = line0.trim().uppercase().replace(" ", "")
                if (line.length < 5) continue
                // 11-bit: tổng dài = 3 + 2n → luôn chẵn sau ID 3 hex.
                // 29-bit: tổng dài = 8 + 2n. Thử 3 trước, rơi về 8 nếu lẻ.
                val idLen = when {
                    line.length > 3 && (line.length - 3) % 2 == 0 -> 3
                    line.length > 8 && (line.length - 8) % 2 == 0 -> 8
                    else -> continue
                }
                val id = line.take(idLen)
                val data = line.drop(idLen)
                if (data.isEmpty() || data.length % 2 != 0) continue
                if (id.any { !(it.isDigit() || it in 'A'..'F') }) continue
                if (!data.all { it.isDigit() || it in 'A'..'F' }) continue
                // ISO-TP: bỏ khung điều khiển (PCI) cho gọn? KHÔNG — giữ nguyên
                // mọi byte vì ta so sánh độ ổn định theo vị trí tuyệt đối.
                val bytes = data.chunked(2).take(12).map { it.toInt(16) }
                out.add(Frame(id, bytes))
            }
            return out
        }

        /**
         * Phân tích vi sai: với từng (ID, vị trí byte), yêu cầu mỗi trạng thái
         * có ≥4 khung và giá trị byte đó không đổi trong suốt trạng thái;
         * chấp nhận khi ≥2 trạng thái ổn định nhưng giá trị khác nhau.
         * score = số giá trị phân biệt (tối đa 4 với P/R/N/D).
         */
        fun analyze(stages: List<Stage>): List<Candidate> {
            data class Acc(var count: Int = 0, val values: MutableSet<Int> = mutableSetOf())

            val ids = stages.map { s -> s.frames.map { it.id }.toSet() }
                .reduceOrNull { a, b -> a + b } ?: emptySet()
            val cands = mutableListOf<Candidate>()
            for (id in ids) {
                val perStageBytes = stages.map { st ->
                    st.frames.filter { it.id == id }
                }
                val totalPerStage = perStageBytes.map { it.size }
                if (totalPerStage.count { it >= 3 } < 2) continue
                val maxLen = perStageBytes.minOfOrNull { fs -> fs.maxOfOrNull { it.bytes.size } ?: 0 } ?: 0
                for (idx in 0 until minOf(maxLen, 8)) {
                    var distinctVals = mutableSetOf<Int>()
                    var qualifying = 0
                    val valueMap = mutableMapOf<String, String?>()
                    var ok = true
                    stages.forEachIndexed { si, st ->
                        val frames = perStageBytes[si]
                        val vals = frames.mapNotNull { f -> f.bytes.getOrNull(idx) }
                        if (vals.size >= 3 && vals.distinct().size == 1) {
                            qualifying++
                            distinctVals.add(vals.first())
                            valueMap[st.gear] = "%02X".format(vals.first())
                        } else {
                            valueMap[st.gear] = null
                            if (vals.isNotEmpty() && vals.distinct().size > 1) ok = false
                        }
                    }
                    if (!ok) continue
                    if (distinctVals.size >= 2) {
                        cands.add(
                            Candidate(id, idx, valueMap, distinctVals.size * 10 + qualifying)
                        )
                    }
                }
            }
            return cands.sortedWith(
                compareByDescending<Candidate> { it.score }.thenBy { it.id }.thenBy { it.byteIdx }
            ).take(24)
        }

        fun buildLogFile(stages: List<Stage>, candidates: List<Candidate>): String {
            val sb = StringBuilder()
            sb.appendLine("FMMS gear scan — ${System.currentTimeMillis()}")
            for (st in stages) {
                sb.appendLine()
                sb.appendLine("=== GEAR ${st.gear} (${st.frameCount} frames) ===")
                sb.append(st.raw.trim())
                sb.appendLine()
            }
            sb.appendLine()
            sb.appendLine("=== CANDIDATES ===")
            for (c in candidates) {
                val vs = c.values.entries.joinToString(" ") { "${it.key}=${it.value ?: "--"}" }
                sb.appendLine("${c.id} B${c.byteIdx} $vs (score=${c.score})")
            }
            return sb.toString()
        }
    }
}
