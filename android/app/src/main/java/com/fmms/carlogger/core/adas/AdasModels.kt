package com.fmms.carlogger.core.adas

import android.graphics.RectF

/**
 * Phân loại đối tượng được nhận diện bởi TFLite AI Neural Net
 */
enum class DetectedObjectClass(val labelVi: String, val emoji: String, val typicalHeightMeters: Float) {
    CAR("Ô tô", "🚗", 1.50f),
    BUS("Xe buýt", "🚌", 3.20f),
    TRUCK("Xe tải", "🚚", 3.00f),
    MOTORCYCLE("Xe máy", "🛵", 1.25f),
    BICYCLE("Xe đạp", "🚲", 1.20f),
    PEDESTRIAN("Người đi bộ", "🚶", 1.70f),
    UNKNOWN("Phương tiện", "🚘", 1.50f)
}

/**
 * Trạng thái mức độ cảnh báo ADAS
 */
enum class AdasAlertLevel {
    SAFE,       // An toàn (Xanh lá)
    CAUTION,    // Chú ý / Cảnh báo nhẹ (Vàng cam)
    CRITICAL    // Nguy hiểm khẩn cấp (Đỏ nhấp nháy)
}

/**
 * Loại cảnh báo ADAS
 */
enum class AdasAlertType {
    NONE,
    FCW,        // Forward Collision Warning - Cảnh báo va chạm phía trước
    LDW_LEFT,   // Lane Departure Warning Left - Lệch làn bên trái
    LDW_RIGHT,  // Lane Departure Warning Right - Lệch làn bên phải
    FVSA,       // Front Vehicle Start Alert - Xe trước đã di chuyển
    HMW         // Headway Monitoring - Khoảng cách quá gần
}

/**
 * Đối tượng phía trước được phát hiện bởi AI Camera / Vision Engine
 */
data class DetectedVehicle(
    val id: Int,
    val bounds: RectF,                  // Tọa độ chuẩn hóa (0f..1f) trên khung hình
    val distanceMeters: Float,          // Khoảng cách ước tính (mét)
    val relativeSpeedKmh: Float,        // Vận tốc tương đối (km/h, < 0 là đang tiến lại gần)
    val timeToCollisionSec: Float,      // Thời gian tới va chạm (TTC = distance / relative_speed)
    val alertLevel: AdasAlertLevel,
    val isPrimaryTarget: Boolean,       // Là xe nguy hiểm nhất ở làn chính giữa (Ego Lane)
    val objectClass: DetectedObjectClass = DetectedObjectClass.CAR,
    val confidence: Float = 1.0f
)

/**
 * Kết quả nhận diện vạch kẻ đường
 */
data class LaneDetectionResult(
    val hasLeftLane: Boolean,
    val hasRightLane: Boolean,
    val leftLaneStartX: Float,          // Tọa độ X đáy (0f..1f)
    val leftLaneEndX: Float,            // Tọa độ X đỉnh (0f..1f)
    val rightLaneStartX: Float,
    val rightLaneEndX: Float,
    val horizonY: Float,                // Đường chân trời (0f..1f)
    val vehicleCenterOffset: Float,     // Độ lệch tâm xe (-1.0: lệch trái cực đại, +1.0: lệch phải)
    val isDepartingLeft: Boolean,
    val isDepartingRight: Boolean
)

/**
 * Trạng thái cảnh báo tổng hợp hiện tại
 */
data class AdasAlertState(
    val type: AdasAlertType = AdasAlertType.NONE,
    val level: AdasAlertLevel = AdasAlertLevel.SAFE,
    val messageVi: String = "",
    val distanceMeters: Float? = null,
    val ttcSec: Float? = null,
    val primaryClass: DetectedObjectClass? = null,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Căn chỉnh camera hình thang (QuadCalib) — tương đương LV0 của app lily.
 * Các tọa độ đều chuẩn hóa 0f..1f; các giá trị refM/horizonY/dashPeriodM/nnScore/camHeightM
 * lưu riêng nếu có (cờ chưa hiệu chuẩn = NaN).
 */
data class CameraCalibration(
    val topY: Float = 0.62f,        // Vị trí chân trời (hàng trên hình thang)
    val botY: Float = 0.92f,        // Đáy hình thang (hàng dưới)
    val topLeftX: Float = 0.40f,    // Góc trên-trái
    val topRightX: Float = 0.60f,   // Góc trên-phải
    val botLeftX: Float = 0.08f,    // Góc dưới-trái
    val botRightX: Float = 0.92f,   // Góc dưới-phải
    val egoX: Float = 0.50f         // Vị trí xe ở làn giữa
) {
    fun toCsv(): String = listOf(topY, botY, topLeftX, topRightX, botLeftX, botRightX, egoX)
        .joinToString(",") { it.toString() }

    companion object {
        fun fromCsv(csv: String?): CameraCalibration {
            val parts = csv?.split(",")?.mapNotNull { it.toFloatOrNull() }.orEmpty()
            if (parts.size < 7) return CameraCalibration()
            return CameraCalibration(
                topY = parts[0], botY = parts[1], topLeftX = parts[2], topRightX = parts[3],
                botLeftX = parts[4], botRightX = parts[5], egoX = parts[6]
            )
        }
    }
}

/**
 * Cài đặt tham số ADAS
 */
data class AdasSettings(
    val isFcwEnabled: Boolean = true,
    val isLdwEnabled: Boolean = true,
    val isFvsaEnabled: Boolean = true,
    val isHmwEnabled: Boolean = true,
    val isVoiceAlertEnabled: Boolean = true,
    val isSoundBeepEnabled: Boolean = true,
    val ldwMinSpeedKmh: Float = 45f,            // Tốc độ tối thiểu kích hoạt cảnh báo lệch làn (OBD speed)
    val fcwSensitivity: FcwSensitivity = FcwSensitivity.MEDIUM,
    val cameraMountHeightMeters: Float = 1.35f, // Chiều cao camera gắn kính lái (m)
    val cameraPitchOffsetDegrees: Float = 0f,   // Góc nghiêng camera (độ)
    val calibration: CameraCalibration = CameraCalibration(), // Hình thang căn chỉnh (QuadCalib lily)
    val useTfliteAi: Boolean = true             // Kích hoạt mô hình TFLite Deep Learning (EDL0)
)

enum class FcwSensitivity(val warningTtcSec: Float, val criticalTtcSec: Float) {
    HIGH(warningTtcSec = 2.8f, criticalTtcSec = 1.8f),
    MEDIUM(warningTtcSec = 2.4f, criticalTtcSec = 1.4f),
    LOW(warningTtcSec = 1.9f, criticalTtcSec = 1.0f)
}
