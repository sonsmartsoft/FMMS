package com.fmms.carlogger.ui.adas

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fmms.carlogger.core.adas.AdasAlertLevel
import com.fmms.carlogger.core.adas.AdasAlertState
import com.fmms.carlogger.core.adas.AdasAlertType
import com.fmms.carlogger.core.adas.AdasVisionOutput
import com.fmms.carlogger.core.adas.DetectedVehicle

@Composable
fun AdasHudOverlay(
    modifier: Modifier = Modifier,
    visionOutput: AdasVisionOutput,
    alertState: AdasAlertState,
    speedKmh: Double
) {
    val infiniteTransition = rememberInfiniteTransition(label = "adas_pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    Box(modifier = modifier.fillMaxSize()) {
        // ── 1. Canvas vẽ AR Lane Lines & 3D Target Bounding Boxes ──
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasWidth = size.width
            val canvasHeight = size.height

            // A. Vẽ vạch làn đường AR (Lane Trajectory)
            val lane = visionOutput.laneResult
            if (lane != null) {
                val horizonY = canvasHeight * lane.horizonY
                val bottomY = canvasHeight * 0.98f

                val leftBottomX = canvasWidth * lane.leftLaneStartX
                val leftTopX = canvasWidth * lane.leftLaneEndX
                val rightBottomX = canvasWidth * lane.rightLaneStartX
                val rightTopX = canvasWidth * lane.rightLaneEndX

                // Màu làn đường (Đỏ nếu lệch làn, Xanh ngọc nếu chuẩn làn)
                val leftLaneColor = if (lane.isDepartingLeft) Color(0xFFEF4444) else Color(0xFF06B6D4)
                val rightLaneColor = if (lane.isDepartingRight) Color(0xFFEF4444) else Color(0xFF06B6D4)

                // Lưới mặt đường AR (Road Plane Mesh)
                val meshPath = Path().apply {
                    moveTo(leftTopX, horizonY)
                    lineTo(rightTopX, horizonY)
                    lineTo(rightBottomX, bottomY)
                    lineTo(leftBottomX, bottomY)
                    close()
                }

                drawPath(
                    path = meshPath,
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color(0x0006B6D4),
                            if (lane.isDepartingLeft || lane.isDepartingRight) Color(0x35EF4444) else Color(0x2506B6D4)
                        ),
                        startY = horizonY,
                        endY = bottomY
                    )
                )

                // Vạch trái
                drawLine(
                    color = leftLaneColor,
                    start = Offset(leftBottomX, bottomY),
                    end = Offset(leftTopX, horizonY),
                    strokeWidth = if (lane.isDepartingLeft) 10f else 6f,
                    pathEffect = if (lane.isDepartingLeft) null else PathEffect.dashPathEffect(floatArrayOf(30f, 15f), 0f)
                )

                // Vạch phải
                drawLine(
                    color = rightLaneColor,
                    start = Offset(rightBottomX, bottomY),
                    end = Offset(rightTopX, horizonY),
                    strokeWidth = if (lane.isDepartingRight) 10f else 6f,
                    pathEffect = if (lane.isDepartingRight) null else PathEffect.dashPathEffect(floatArrayOf(30f, 15f), 0f)
                )
            }

            // B. Vẽ khung xe và nhãn đối tượng AI
            visionOutput.vehicles.forEach { vehicle ->
                drawVehicleTargetBox(vehicle, canvasWidth, canvasHeight, pulseAlpha)
            }
        }

        // ── 2. Banner Cảnh Báo Khẩn Cấp (Emergency Alert Banner) ──
        if (alertState.type != AdasAlertType.NONE && alertState.level != AdasAlertLevel.SAFE) {
            val isCritical = alertState.level == AdasAlertLevel.CRITICAL
            val bannerBg = if (isCritical) {
                Color(0xEE991B1B)
            } else {
                Color(0xDDB45309)
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 70.dp, start = 20.dp, end = 20.dp)
                    .background(bannerBg, RoundedCornerShape(16.dp))
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .align(Alignment.TopCenter)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = alertState.messageVi,
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black
                        )
                        if (alertState.distanceMeters != null) {
                            Text(
                                text = "Khoảng cách: %.1f m • TTC: %.1fs".format(
                                    alertState.distanceMeters,
                                    alertState.ttcSec ?: 0f
                                ),
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }

        // ── 3. Thẻ Chỉ Số Trực Quan (Khoảng cách & Tốc độ OBD) ──
        Box(
            modifier = Modifier
                .padding(bottom = 24.dp, start = 20.dp, end = 20.dp)
                .align(Alignment.BottomCenter)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .background(Color(0xCC0F172A), RoundedCornerShape(20.dp))
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                // Tốc độ OBD
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "%.0f".format(speedKmh),
                        color = Color(0xFF38BDF8),
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "KM/H (OBD)",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.width(20.dp))
                Box(modifier = Modifier.width(1.dp).height(32.dp).background(Color.White.copy(alpha = 0.2f)))
                Spacer(modifier = Modifier.width(20.dp))

                // Khoảng cách xe trước & Loại phương tiện
                val primary = visionOutput.primaryVehicle
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = if (primary != null) "%.1f m".format(primary.distanceMeters) else "-- m",
                        color = when (primary?.alertLevel) {
                            AdasAlertLevel.CRITICAL -> Color(0xFFEF4444)
                            AdasAlertLevel.CAUTION -> Color(0xFFF59E0B)
                            else -> Color(0xFF10B981)
                        },
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = if (primary != null) {
                            "${primary.objectClass.emoji} ${primary.objectClass.labelVi} • TTC: %.1fs".format(primary.timeToCollisionSec)
                        } else {
                            "XE PHÍA TRƯỚC"
                        },
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/**
 * Vẽ khung ngắm 3D AR bao quanh xe phía trước
 */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawVehicleTargetBox(
    vehicle: DetectedVehicle,
    canvasWidth: Float,
    canvasHeight: Float,
    pulseAlpha: Float
) {
    val rect = vehicle.bounds
    val left = rect.left * canvasWidth
    val top = rect.top * canvasHeight
    val right = rect.right * canvasWidth
    val bottom = rect.bottom * canvasHeight
    val width = right - left
    val height = bottom - top

    val boxColor = when (vehicle.alertLevel) {
        AdasAlertLevel.CRITICAL -> Color(0xFFEF4444).copy(alpha = pulseAlpha)
        AdasAlertLevel.CAUTION -> Color(0xFFF59E0B)
        AdasAlertLevel.SAFE -> Color(0xFF10B981)
    }

    val cornerLen = minOf(width, height) * 0.28f
    val strokeWidth = if (vehicle.alertLevel == AdasAlertLevel.CRITICAL) 7f else 4f

    // 4 Góc ngắm AR (Target Brackets)
    // Góc trên - trái
    drawLine(boxColor, Offset(left, top), Offset(left + cornerLen, top), strokeWidth)
    drawLine(boxColor, Offset(left, top), Offset(left, top + cornerLen), strokeWidth)

    // Góc trên - phải
    drawLine(boxColor, Offset(right, top), Offset(right - cornerLen, top), strokeWidth)
    drawLine(boxColor, Offset(right, top), Offset(right, top + cornerLen), strokeWidth)

    // Góc dưới - trái
    drawLine(boxColor, Offset(left, bottom), Offset(left + cornerLen, bottom), strokeWidth)
    drawLine(boxColor, Offset(left, bottom), Offset(left, bottom - cornerLen), strokeWidth)

    // Góc dưới - phải
    drawLine(boxColor, Offset(right, bottom), Offset(right - cornerLen, bottom), strokeWidth)
    drawLine(boxColor, Offset(right, bottom), Offset(right, bottom - cornerLen), strokeWidth)

    // Tâm ngắm hồng ngoại
    val centerX = left + width / 2f
    val centerY = top + height / 2f
    drawCircle(
        color = boxColor.copy(alpha = 0.6f),
        radius = 8f,
        center = Offset(centerX, centerY),
        style = Stroke(width = 2f)
    )
}
