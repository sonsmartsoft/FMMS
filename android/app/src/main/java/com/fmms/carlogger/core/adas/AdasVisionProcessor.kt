package com.fmms.carlogger.core.adas

import android.content.Context
import android.graphics.Bitmap
import android.graphics.RectF
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.nio.ByteBuffer
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Kết quả đầu ra từ bộ xử lý hình ảnh thị giác máy tính ADAS
 */
data class AdasVisionOutput(
    val vehicles: List<DetectedVehicle> = emptyList(),
    val primaryVehicle: DetectedVehicle? = null,
    val laneResult: LaneDetectionResult? = null,
    val isAiModelActive: Boolean = false,
    val isNightMode: Boolean = false,
    val averageLuminance: Int = 128,
    val fps: Float = 0f,
    val frameTimestampMs: Long = System.currentTimeMillis()
)

/**
 * Bộ xử lý thị giác máy tính ADAS thời gian thực (CameraX Image Analysis + TFLite AI Model)
 */
class AdasVisionProcessor(
    private val context: Context,
    private var settings: AdasSettings = AdasSettings()
) : ImageAnalysis.Analyzer {

    private val _visionFlow = MutableStateFlow(AdasVisionOutput())
    val visionFlow: StateFlow<AdasVisionOutput> = _visionFlow.asStateFlow()

    // TFLite AI Detector
    private var tfliteDetector: AdasTfliteDetector? = null

    private var lastFrameTime = System.currentTimeMillis()
    private var frameCount = 0
    private var currentFps = 0f

    // Lịch sử vị trí xe trước để tính vận tốc tương đối (Smoothing & Tracking)
    private var lastPrimaryDistance = -1f
    private var lastPrimaryTimeMs = 0L
    private var smoothedRelativeSpeedKmh = 0f

    init {
        try {
            tfliteDetector = AdasTfliteDetector(context)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun updateSettings(newSettings: AdasSettings) {
        this.settings = newSettings
    }

    @androidx.annotation.OptIn(ExperimentalGetImage::class)
    override fun analyze(image: ImageProxy) {
        val now = System.currentTimeMillis()
        frameCount++
        if (now - lastFrameTime >= 1000) {
            currentFps = frameCount * 1000f / (now - lastFrameTime)
            frameCount = 0
            lastFrameTime = now
        }

        try {
            val width = image.width
            val height = image.height
            val planes = image.planes
            if (planes.isEmpty()) {
                image.close()
                return
            }

            val yBuffer = planes[0].buffer
            val rowStride = planes[0].rowStride

            // 0. Tính độ sáng trung bình toàn cảnh (Adaptive Night / Daylight Detection)
            val meanLuma = computeAverageLuminance(yBuffer, width, height, rowStride)
            val isNight = meanLuma < 60

            // 1. Phân tích vạch kẻ làn đường thích ứng theo độ sáng (Adaptive Lane Detection)
            val laneResult = detectLaneLines(yBuffer, width, height, rowStride, meanLuma)

            // 2. Nhận diện xe và chướng ngại vật (TFLite AI Model hoặc Heuristic Fallback)
            var isAiActive = false
            var detectedVehicles = emptyList<DetectedVehicle>()

            if (settings.useTfliteAi && tfliteDetector?.isReady() == true) {
                try {
                    val bitmap = image.toBitmap()
                    val rawDetections = tfliteDetector?.detect(bitmap, minScoreThreshold = 0.38f) ?: emptyList()
                    if (rawDetections.isNotEmpty()) {
                        detectedVehicles = processAiDetections(rawDetections, width, height, now)
                        isAiActive = true
                    }
                } catch (e: Exception) {
                    // Fallback sang heuristic nếu convert bitmap lỗi
                    isAiActive = false
                }
            }

            // Heuristic Fallback nếu AI không trả về kết quả
            if (detectedVehicles.isEmpty()) {
                detectedVehicles = detectLeadVehiclesHeuristic(yBuffer, width, height, rowStride, meanLuma, now)
            }

            val primaryVehicle = detectedVehicles.firstOrNull { it.isPrimaryTarget }

            _visionFlow.value = AdasVisionOutput(
                vehicles = detectedVehicles,
                primaryVehicle = primaryVehicle,
                laneResult = laneResult,
                isAiModelActive = isAiActive,
                isNightMode = isNight,
                averageLuminance = meanLuma,
                fps = currentFps,
                frameTimestampMs = now
            )
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            image.close()
        }
    }

    /**
     * Tính độ sáng trung bình khung hình
     */
    private fun computeAverageLuminance(
        yBuffer: ByteBuffer,
        width: Int,
        height: Int,
        rowStride: Int
    ): Int {
        var sum = 0L
        var count = 0
        val stepY = height / 10
        val stepX = width / 10

        for (y in (height * 0.2f).toInt()..(height * 0.8f).toInt() step stepY) {
            val rowOffset = y * rowStride
            if (rowOffset + width > yBuffer.capacity()) continue
            for (x in (width * 0.2f).toInt()..(width * 0.8f).toInt() step stepX) {
                sum += (yBuffer.get(rowOffset + x).toInt() and 0xFF)
                count++
            }
        }
        return if (count > 0) (sum / count).toInt() else 128
    }

    /**
     * Xử lý kết quả từ TFLite AI Neural Network
     */
    private fun processAiDetections(
        rawDetections: List<RawDetection>,
        imageWidth: Int,
        imageHeight: Int,
        nowMs: Long
    ): List<DetectedVehicle> {
        val vehicles = mutableListOf<DetectedVehicle>()

        for ((index, raw) in rawDetections.withIndex()) {
            val box = raw.box
            val boxHeightNorm = max(0.02f, box.height())
            val boxBottomNorm = box.bottom
            val boxCenterNormX = box.centerX()

            // Là xe ở làn chính giữa (Ego lane) nếu tâm nằm trong khoảng 0.35..0.65
            val isCenterLane = boxCenterNormX in 0.32f..0.68f

            // Tính khoảng cách quang học kết hợp chiều cao thực của phân lớp (Car/Bus/Truck/Bike/Person)
            val mountHeight = settings.cameraMountHeightMeters
            val normGroundY = max(0.01f, boxBottomNorm - 0.50f)
            
            // Công thức phối cảnh: d = H / tan(pitch + alpha)
            val geomDist = max(2.5f, (mountHeight / (normGroundY * 1.85f)))
            // Công thức tỷ lệ chiều cao: d = (focal * H_real) / h_pixel
            val heightDist = max(2.5f, (1.65f * raw.objectClass.typicalHeightMeters) / boxHeightNorm)
            
            // Dung hợp khoảng cách trọng số
            val estimatedDistance = (geomDist * 0.6f) + (heightDist * 0.4f)

            var relativeSpeed = 0f
            var ttc = 99.9f

            if (isCenterLane) {
                if (lastPrimaryDistance > 0 && lastPrimaryTimeMs > 0) {
                    val dtSec = (nowMs - lastPrimaryTimeMs) / 1000f
                    if (dtSec in 0.03f..1.5f) {
                        val deltaD = estimatedDistance - lastPrimaryDistance
                        val instantRelSpeed = (deltaD / dtSec) * 3.6f
                        smoothedRelativeSpeedKmh = (smoothedRelativeSpeedKmh * 0.65f) + (instantRelSpeed * 0.35f)
                        relativeSpeed = smoothedRelativeSpeedKmh

                        if (relativeSpeed < -1.5f) {
                            val closingSpeedMs = abs(relativeSpeed) / 3.6f
                            ttc = max(0.4f, estimatedDistance / closingSpeedMs)
                        }
                    }
                }
                lastPrimaryDistance = estimatedDistance
                lastPrimaryTimeMs = nowMs
            }

            // Xác định mức độ cảnh báo
            val alertLevel = when {
                ttc < settings.fcwSensitivity.criticalTtcSec || estimatedDistance < 5.5f -> AdasAlertLevel.CRITICAL
                ttc < settings.fcwSensitivity.warningTtcSec || estimatedDistance < 13.0f -> AdasAlertLevel.CAUTION
                else -> AdasAlertLevel.SAFE
            }

            vehicles.add(
                DetectedVehicle(
                    id = index + 1,
                    bounds = box,
                    distanceMeters = estimatedDistance,
                    relativeSpeedKmh = relativeSpeed,
                    timeToCollisionSec = ttc,
                    alertLevel = alertLevel,
                    isPrimaryTarget = isCenterLane,
                    objectClass = raw.objectClass,
                    confidence = raw.score
                )
            )
        }

        // Sắp xếp ưu tiên xe làn giữa và khoảng cách gần nhất lên đầu
        return vehicles.sortedWith(compareByDescending<DetectedVehicle> { it.isPrimaryTarget }.thenBy { it.distanceMeters })
    }

    /**
     * Nhận diện vạch làn đường thích ứng theo độ sáng (Adaptive Dynamic Threshold)
     */
    private fun detectLaneLines(
        yBuffer: ByteBuffer,
        width: Int,
        height: Int,
        rowStride: Int,
        meanLuma: Int
    ): LaneDetectionResult {
        val horizonY = 0.52f
        val roiStartY = (height * 0.58f).toInt()
        val roiEndY = (height * 0.90f).toInt()
        val scanStepY = (roiEndY - roiStartY) / 4

        // Tự động điều chỉnh ngưỡng biên độ theo độ sáng ngày / đêm
        val edgeThreshold = when {
            meanLuma < 50 -> 25  // Ban đêm: hạ ngưỡng để bắt vạch mờ
            meanLuma > 170 -> 55 // Nắng gắt: tăng ngưỡng chống bóng chói
            else -> 42
        }

        var leftLaneSumX = 0f
        var leftLaneCount = 0
        var rightLaneSumX = 0f
        var rightLaneCount = 0

        val centerX = width / 2

        for (y in roiStartY..roiEndY step scanStepY) {
            val rowOffset = y * rowStride
            if (rowOffset + width > yBuffer.capacity()) continue

            // Quét bên trái
            for (x in (centerX - 20) downTo 20 step 4) {
                val idx = rowOffset + x
                val diff = (yBuffer.get(idx).toInt() and 0xFF) - (yBuffer.get(idx - 6).toInt() and 0xFF)
                if (diff > edgeThreshold) {
                    leftLaneSumX += x.toFloat() / width
                    leftLaneCount++
                    break
                }
            }

            // Quét bên phải
            for (x in (centerX + 20) until (width - 20) step 4) {
                val idx = rowOffset + x
                val diff = (yBuffer.get(idx).toInt() and 0xFF) - (yBuffer.get(idx + 6).toInt() and 0xFF)
                if (diff > edgeThreshold) {
                    rightLaneSumX += x.toFloat() / width
                    rightLaneCount++
                    break
                }
            }
        }

        val hasLeft = leftLaneCount > 0
        val hasRight = rightLaneCount > 0

        val leftStartX = if (hasLeft) (leftLaneSumX / leftLaneCount) else 0.18f
        val leftEndX = 0.42f
        val rightStartX = if (hasRight) (rightLaneSumX / rightLaneCount) else 0.82f
        val rightEndX = 0.58f

        val laneMidpoint = (leftStartX + rightStartX) / 2f
        val vehicleOffset = (0.5f - laneMidpoint) * 2f

        val isDepartingLeft = hasLeft && leftStartX > 0.35f
        val isDepartingRight = hasRight && rightStartX < 0.65f

        return LaneDetectionResult(
            hasLeftLane = hasLeft,
            hasRightLane = hasRight,
            leftLaneStartX = leftStartX,
            leftLaneEndX = leftEndX,
            rightLaneStartX = rightStartX,
            rightLaneEndX = rightEndX,
            horizonY = horizonY,
            vehicleCenterOffset = vehicleOffset,
            isDepartingLeft = isDepartingLeft,
            isDepartingRight = isDepartingRight
        )
    }

    /**
     * Nhận diện phương tiện bằng Heuristic (Fallback khi không có AI)
     */
    private fun detectLeadVehiclesHeuristic(
        yBuffer: ByteBuffer,
        width: Int,
        height: Int,
        rowStride: Int,
        meanLuma: Int,
        nowMs: Long
    ): List<DetectedVehicle> {
        val vehicles = mutableListOf<DetectedVehicle>()

        val roiTop = (height * 0.50f).toInt()
        val roiBottom = (height * 0.85f).toInt()
        val roiLeft = (width * 0.30f).toInt()
        val roiRight = (width * 0.70f).toInt()

        var bestMatchBottomY = 0
        var bestMatchLeftX = 0
        var bestMatchRightX = 0
        var maxContourEnergy = 0

        val stepY = 8
        val stepX = 8
        val darkThreshold = if (meanLuma < 60) 45 else 65

        for (y in (roiBottom - 10) downTo roiTop step stepY) {
            val rowOffset = y * rowStride
            if (rowOffset + width > yBuffer.capacity()) continue

            var darkPixelCount = 0
            var leftEdge = 0
            var rightEdge = 0

            for (x in roiLeft..roiRight step stepX) {
                val lum = yBuffer.get(rowOffset + x).toInt() and 0xFF
                if (lum < darkThreshold) {
                    darkPixelCount++
                    if (leftEdge == 0) leftEdge = x
                    rightEdge = x
                }
            }

            val span = rightEdge - leftEdge
            if (darkPixelCount >= 4 && span in (width * 0.12f).toInt()..(width * 0.55f).toInt()) {
                val energy = darkPixelCount * span
                if (energy > maxContourEnergy) {
                    maxContourEnergy = energy
                    bestMatchBottomY = y
                    bestMatchLeftX = leftEdge
                    bestMatchRightX = rightEdge
                }
            }
        }

        if (bestMatchBottomY > 0) {
            val normBottom = bestMatchBottomY.toFloat() / height
            val normTop = max(0.48f, normBottom - ((bestMatchRightX - bestMatchLeftX).toFloat() / width * 0.8f))
            val normLeft = max(0.05f, bestMatchLeftX.toFloat() / width - 0.03f)
            val normRight = min(0.95f, bestMatchRightX.toFloat() / width + 0.03f)

            val bounds = RectF(normLeft, normTop, normRight, normBottom)
            val mountHeight = settings.cameraMountHeightMeters
            val normGroundY = max(0.01f, normBottom - 0.50f)
            val estimatedDistance = max(3.0f, (mountHeight / (normGroundY * 1.85f)))

            var relativeSpeed = 0f
            var ttc = 99.9f

            if (lastPrimaryDistance > 0 && lastPrimaryTimeMs > 0) {
                val dtSec = (nowMs - lastPrimaryTimeMs) / 1000f
                if (dtSec in 0.03f..1.5f) {
                    val deltaD = estimatedDistance - lastPrimaryDistance
                    val instantRelSpeed = (deltaD / dtSec) * 3.6f
                    smoothedRelativeSpeedKmh = (smoothedRelativeSpeedKmh * 0.7f) + (instantRelSpeed * 0.3f)
                    relativeSpeed = smoothedRelativeSpeedKmh

                    if (relativeSpeed < -2f) {
                        val closingSpeedMs = abs(relativeSpeed) / 3.6f
                        ttc = max(0.5f, estimatedDistance / closingSpeedMs)
                    }
                }
            }

            lastPrimaryDistance = estimatedDistance
            lastPrimaryTimeMs = nowMs

            val alertLevel = when {
                ttc < settings.fcwSensitivity.criticalTtcSec || estimatedDistance < 6.0f -> AdasAlertLevel.CRITICAL
                ttc < settings.fcwSensitivity.warningTtcSec || estimatedDistance < 14.0f -> AdasAlertLevel.CAUTION
                else -> AdasAlertLevel.SAFE
            }

            vehicles.add(
                DetectedVehicle(
                    id = 1,
                    bounds = bounds,
                    distanceMeters = estimatedDistance,
                    relativeSpeedKmh = relativeSpeed,
                    timeToCollisionSec = ttc,
                    alertLevel = alertLevel,
                    isPrimaryTarget = true,
                    objectClass = DetectedObjectClass.CAR,
                    confidence = 0.85f
                )
            )
        } else {
            lastPrimaryDistance = -1f
        }

        return vehicles
    }

    fun release() {
        try {
            tfliteDetector?.close()
            tfliteDetector = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
