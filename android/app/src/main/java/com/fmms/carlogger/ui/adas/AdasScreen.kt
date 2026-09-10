package com.fmms.carlogger.ui.adas

import android.content.Context
import android.graphics.Bitmap
import android.graphics.SurfaceTexture
import android.view.TextureView
import android.view.View
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.adas.AdasAlertEngine
import com.fmms.carlogger.core.adas.AdasAlertLevel
import com.fmms.carlogger.core.adas.AdasAlertState
import com.fmms.carlogger.core.adas.AdasAlertType
import com.fmms.carlogger.core.adas.AdasSettings
import com.fmms.carlogger.core.adas.AdasVisionProcessor
import com.fmms.carlogger.core.adas.AdasVisionOutput
import com.fmms.carlogger.core.adas.CameraCalibration
import com.fmms.carlogger.core.adas.DetectedVehicle
import com.fmms.carlogger.core.adas.FcwSensitivity
import kotlin.math.max

/**
 * Màn ADAS HUD theo phong cách Driving HUD của app nguồn (lily):
 *  - Camera sau toàn màn hình (dashcam) làm nền
 *  - Góc trên-trái: speedometer OBD dạng vòng cung
 *  - Overlay: vạch làn đường + khung xe đối tượng phát hiện
 *  - Dưới cùng: banner thông tin gọn gàng (khoảng cách, loại xe) khi có cảnh báo
 */
@Composable
fun AdasScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var settings by remember { mutableStateOf(AdasSettings()) }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var showCalibration by remember { mutableStateOf(false) }

    val visionProcessor = remember { AdasVisionProcessor(context, settings) }
    val alertEngine = remember { AdasAlertEngine(context, scope, settings) }

    val visionOutput by visionProcessor.visionFlow.collectAsState()
    val alertState by alertEngine.alertStateFlow.collectAsState()

    // Nạp căn chỉnh hình thang đã lưu (QuadCalib) từ SharedPreferences
    LaunchedEffect(Unit) {
        runCatching {
            val prefs = context.getSharedPreferences("fmms_adas", Context.MODE_PRIVATE)
            val saved = prefs.getString("camera_calibration", null)
            if (saved != null) {
                settings = settings.copy(calibration = CameraCalibration.fromCsv(saved))
                visionProcessor.updateSettings(settings)
            }
        }
    }

    // Lắng nghe tốc độ OBD thời gian thực
    val liveTelemetry by AppContainer.telemetryEngine.live.collectAsState()
    val speed = liveTelemetry.speedKmh ?: 0.0
    val rpm = liveTelemetry.rpm ?: 0.0
    val isObdConnected = speed > 0 || rpm > 0

    LaunchedEffect(visionOutput, speed) {
        alertEngine.evaluate(
            vision = visionOutput,
            obdSpeedKmh = speed,
            isObdConnected = isObdConnected
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            visionProcessor.release()
            alertEngine.release()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ── 1. Camera ngoài USB toàn màn hình (dashcam nền) ──
        AdasUsbCameraPreview(
            onFrame = { frame ->
                visionProcessor.analyzeBitmap(frame)
            },
            onStatusChange = { /* todo: hiển thị trạng thái truy cập */ }
        )

        // ── 2. Lớp phủ HUD: vạch làn + khung xe + banner cảnh báo ──
        AdasHudOverlay(
            visionOutput = visionOutput,
            alertState = alertState,
            speedKmh = speed,
            isObdConnected = isObdConnected
        )

        // ── 3. Speedometer OBD lớn góc trên-trái (kiểu HUD lily) ──
        SpeedHudBox(
            speedKmh = speed,
            rpm = rpm,
            isObdConnected = isObdConnected,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 16.dp, top = 16.dp)
        )

        // ── 4. Nút điều khiển tối giản góc trên-phải ──
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 16.dp, end = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(
                onClick = {
                    val newSettings = settings.copy(isVoiceAlertEnabled = !settings.isVoiceAlertEnabled)
                    settings = newSettings
                    visionProcessor.updateSettings(newSettings)
                    alertEngine.updateSettings(newSettings)
                },
                modifier = Modifier
                    .background(Color(0x66000000), CircleShape)
                    .size(42.dp)
            ) {
                Icon(
                    imageVector = if (settings.isVoiceAlertEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                    contentDescription = "Giọng nói",
                    tint = if (settings.isVoiceAlertEnabled) Color(0xFF10B981) else Color.White.copy(alpha = 0.6f)
                )
            }
            IconButton(
                onClick = { showCalibration = true },
                modifier = Modifier
                    .background(Color(0x66000000), CircleShape)
                    .size(42.dp)
            ) {
                Text("📐", fontSize = 18.sp)
            }
            IconButton(
                onClick = { showSettingsDialog = true },
                modifier = Modifier
                    .background(Color(0x66000000), CircleShape)
                    .size(42.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Cài đặt ADAS",
                    tint = Color.White
                )
            }
            IconButton(
                onClick = { onNavigateBack() },
                modifier = Modifier
                    .background(Color(0x66000000), CircleShape)
                    .size(42.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Quay lại",
                    tint = Color.White
                )
            }
        }

        // ── 5. Dialog cài đặt ──
        if (showSettingsDialog) {
            AdasSettingsDialog(
                currentSettings = settings,
                onDismiss = { showSettingsDialog = false },
                onSave = { newSettings ->
                    settings = newSettings
                    visionProcessor.updateSettings(newSettings)
                    alertEngine.updateSettings(newSettings)
                    showSettingsDialog = false
                }
            )
        }

        // ── 6. Màn căn chỉnh cam hình thang (QuadCalib kiểu lily) ──
        if (showCalibration) {
            CameraCalibrationOverlay(
                calibration = settings.calibration,
                onCalibrationChange = { newCalib ->
                    settings = settings.copy(calibration = newCalib)
                    visionProcessor.updateSettings(settings)
                },
                onReset = {
                    val def = CameraCalibration()
                    settings = settings.copy(calibration = def)
                    visionProcessor.updateSettings(settings)
                },
                onSave = {
                    context.getSharedPreferences("fmms_adas", Context.MODE_PRIVATE)
                        .edit().putString("camera_calibration", settings.calibration.toCsv()).apply()
                    showCalibration = false
                },
                onClose = { showCalibration = false }
            )
        }
    }
}

/**
 * Speedometer OBD lớn góc trên-trái, dạng vòng cung phong cách HUD.
 */
@Composable
private fun SpeedHudBox(
    speedKmh: Double,
    rpm: Double,
    isObdConnected: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .background(Color(0x99000000), RoundedCornerShape(20.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Vòng cung tốc độ
        Canvas(modifier = Modifier.size(92.dp)) {
            val stroke = 8.dp.toPx()
            val inset = stroke / 2
            val arcSize = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke)
            val topLeft = Offset(stroke / 2, stroke / 2)

            // Track xám
            drawArc(
                color = Color.White.copy(alpha = 0.25f),
                startAngle = 150f,
                sweepAngle = 240f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            // Giá trị: từ 0..180 km/h
            val fraction = ((speedKmh / 180f).toFloat().coerceIn(0f, 1f)).also { }
            val color = when {
                speedKmh >= 120 -> Color(0xFFEF4444)
                speedKmh >= 80 -> Color(0xFFF59E0B)
                else -> Color(0xFF38BDF8)
            }
            drawArc(
                color = color,
                startAngle = 150f,
                sweepAngle = 240f * fraction,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            // Kim kim loại mờ
            val angle = (150f + 240f * fraction) * (Math.PI / 180f)
            val radius = (size.width - stroke) / 2f
            val cx = size.width / 2f
            val cy = size.height / 2f
            drawLine(
                color = Color.White.copy(alpha = 0.85f),
                start = Offset(cx, cy),
                end = Offset(
                    cx + (radius - 4f) * Math.cos(angle).toFloat(),
                    cy + (radius - 4f) * Math.sin(angle).toFloat()
                ),
                strokeWidth = 2.5f,
                cap = StrokeCap.Round
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Số tốc độ lớn + RPM
        Column(horizontalAlignment = Alignment.Start) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = if (isObdConnected) "%.0f".format(speedKmh) else "--",
                    color = if (isObdConnected) Color(0xFFFFD54F) else Color.White.copy(alpha = 0.35f),
                    fontSize = 44.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace,
                    lineHeight = 42.sp
                )
                Text(
                    text = "km/h",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 6.dp)
                )
            }
            Text(
                text = if (isObdConnected) "%.0f vòng/phút".format(rpm) else "OBD chưa kết nối",
                color = if (isObdConnected) Color(0xFF10B981) else Color.White.copy(alpha = 0.4f),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

/**
 * Lớp phủ HUD: vạch làn + khung xe + banner cảnh báo + thanh trạng thái gọn.
 */
@Composable
private fun AdasHudOverlay(
    visionOutput: AdasVisionOutput,
    alertState: AdasAlertState,
    speedKmh: Double,
    isObdConnected: Boolean
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Vạch làn + khung xe trên Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            val lane = visionOutput.laneResult
            if (lane != null) {
                val horizonY = h * lane.horizonY
                val bottomY = h * 1.0f
                // Màu theo lily: teal #22E8E0 bình thường, đỏ #FF3B30 khi lệch làn
                val leftLaneColor = if (lane.isDepartingLeft) Color(0xFFFF3B30) else Color(0xFF22E8E0)
                val rightLaneColor = if (lane.isDepartingRight) Color(0xFFFF3B30) else Color(0xFF22E8E0)

                drawLine(
                    color = leftLaneColor,
                    start = Offset(w * lane.leftLaneStartX, bottomY),
                    end = Offset(w * lane.leftLaneEndX, horizonY),
                    strokeWidth = if (lane.isDepartingLeft) 8f else 5f,
                )
                drawLine(
                    color = rightLaneColor,
                    start = Offset(w * lane.rightLaneStartX, bottomY),
                    end = Offset(w * lane.rightLaneEndX, horizonY),
                    strokeWidth = if (lane.isDepartingRight) 8f else 5f,
                )
            }

            visionOutput.vehicles.forEach { vehicle ->
                drawVehicleTargetBox(vehicle, w, h)
            }
        }

        // Banner cảnh báo dưới cùng (gọn gàng kiểu HUD)
        if (alertState.type != AdasAlertType.NONE && alertState.level != AdasAlertLevel.SAFE) {
            val isCritical = alertState.level == AdasAlertLevel.CRITICAL
            val bannerBg = if (isCritical) Color(0xEE991B1B) else Color(0xDDB45309)

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 20.dp, start = 20.dp, end = 20.dp)
                    .background(bannerBg, RoundedCornerShape(14.dp))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = alertState.messageVi,
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.weight(1f)
                )
                if (alertState.distanceMeters != null) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "${alertState.primaryClass?.emoji ?: "🚗"} %.1f M".format(alertState.distanceMeters).replace('.', ','),
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                        alertState.ttcSec?.takeIf { it < 99f }?.let {
                            Text(
                                text = "TTC %.1fs".format(it),
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }
        }

        // Thanh trạng thái nhỏ trên (AI / Night / FPS)
        if (visionOutput.isAiModelActive || visionOutput.isNightMode) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 20.dp, bottom = 20.dp)
                    .background(Color(0x66000000), RoundedCornerShape(10.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (visionOutput.isAiModelActive) {
                    Text("AI", color = Color(0xFF10B981), fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                }
                if (visionOutput.isNightMode) {
                    Text("ĐÊM", color = Color(0xFF93C5FD), fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                }
                if (visionOutput.fps > 0) {
                    Text("%.0f FPS".format(visionOutput.fps), color = Color.White.copy(alpha = 0.5f), fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }

        // Chip khoảng cách xe gần nhất — hiển thị liên tục như app cũ, kể cả khi không có cảnh báo
        visionOutput.primaryVehicle?.takeIf { it.distanceMeters > 0f }?.let { vehicle ->
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 20.dp, bottom = 20.dp)
                    .background(
                        when (vehicle.alertLevel) {
                            AdasAlertLevel.CRITICAL -> Color(0xEE991B1B)
                            AdasAlertLevel.CAUTION -> Color(0xDDB45309)
                            AdasAlertLevel.SAFE -> Color(0x66000000)
                        },
                        RoundedCornerShape(12.dp)
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = vehicle.objectClass.emoji,
                    fontSize = 14.sp
                )
                Text(
                    text = "%.1f M".format(vehicle.distanceMeters).replace('.', ','),
                    color = when (vehicle.alertLevel) {
                        AdasAlertLevel.CRITICAL -> Color(0xFFFF3B30)
                        AdasAlertLevel.CAUTION -> Color(0xFFFFC400)
                        else -> Color(0xFF00E5D0)
                    },
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace
                )
                if (vehicle.relativeSpeedKmh < -1f) {
                    Text(
                        text = "%.0f km/h".format(vehicle.relativeSpeedKmh),
                        color = when (vehicle.relativeSpeedKmh) {
                            in Float.NEGATIVE_INFINITY..-8f -> Color(0xFFF87171)
                            else -> Color(0xFFFBBF24)
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

/**
 * Nguồn camera ngoài USB (libuvccamera native). Vẽ frame lên TextureView fullscreen.
 */
@Composable
private fun AdasUsbCameraPreview(
    onFrame: (Bitmap) -> Unit,
    onStatusChange: (String) -> Unit
) {
    val context = LocalContext.current
    val textureView = remember {
        TextureView(context).apply {
            alpha = 1f
        }
    }

    DisposableEffect(Unit) {
        val camera = UsbAdasCamera(
            context = context,
            onFrame = { frame ->
                // Gửi frame vào pipeline ADAS theo định kỳ (self-pacing qua grab thread)
                onFrame(frame)
            },
            onStatus = onStatusChange,
            onCameraReady = { ready -> if (!ready) onStatusChange("USB camera off") }
        )
        camera.setPreviewTexture(textureView)

        camera.start()

        onDispose {
            camera.stop()
        }
    }

    // TextureView (view interop) hiển thị frame
    AndroidView(
        factory = { textureView },
        modifier = Modifier.fillMaxSize(),
        update = { tv ->
            if (!tv.isAvailable) {
                tv.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
                    override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {}
                    override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}
                    override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean = true
                    override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
                }
            }
        }
    )
}

/**
 * Vẽ khung ADAS kiểu lily: corner-cut 0.28, màu theo level, kèm label "X,X M" phía trên.
 * Màu: CRITICAL=#FF3B30 (DANGER), CAUTION=#FFC400 (CLOSE), primary=#00E5D0, khác=#8AF0E4.
 */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawVehicleTargetBox(
    vehicle: DetectedVehicle,
    canvasWidth: Float,
    canvasHeight: Float
) {
    val rect = vehicle.bounds
    val left = rect.left * canvasWidth
    val top = rect.top * canvasHeight
    val right = rect.right * canvasWidth
    val bottom = rect.bottom * canvasHeight
    val width = right - left
    val height = bottom - top

    if (width < 4f || height < 4f) return

    val isDanger = vehicle.alertLevel == AdasAlertLevel.CRITICAL
    val isClose = vehicle.alertLevel == AdasAlertLevel.CAUTION
    val boxColor = when {
        isDanger -> Color(0xFFFF3B30)
        isClose -> Color(0xFFFFC400)
        vehicle.isPrimaryTarget -> Color(0xFF00E5D0)
        else -> Color(0xFF8AF0E4)
    }
    val cornerLen = width * 0.28f
    val cornerH = height * 0.28f
    val boxStrokeWidth = max(canvasWidth * 0.0028f, 2f)

    // Path góc cắt bo 4 góc giống lily (L2.b)
    val path = android.graphics.Path()
    path.moveTo(left, top + cornerH)
    path.lineTo(left, top)
    path.lineTo(left + cornerLen, top)
    path.moveTo(right - cornerLen, top)
    path.lineTo(right, top)
    path.lineTo(right, top + cornerH)
    path.moveTo(right, bottom - cornerH)
    path.lineTo(right, bottom)
    path.lineTo(right - cornerLen, bottom)
    path.moveTo(left + cornerLen, bottom)
    path.lineTo(left, bottom)
    path.lineTo(left, bottom - cornerH)
    val strokePaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
        style = android.graphics.Paint.Style.STROKE
        strokeCap = android.graphics.Paint.Cap.SQUARE
        color = boxColor.toArgb()
        strokeWidth = boxStrokeWidth
    }
    drawContext.canvas.nativeCanvas.drawPath(path, strokePaint)

    val distance = vehicle.distanceMeters
    if (distance.isNaN() || distance <= 0f) return

    // Label "12,5 M" phía trên box, dấu thập phân là dấu phẩy (format Việt)
    val labelText = "%.1f M".format(distance).replace('.', ',')
    val labelTextSize = max(canvasWidth * 0.026f, 12f)
    val native = drawContext.canvas.nativeCanvas
    val textPaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
        color = boxColor.toArgb()
        textSize = labelTextSize
        typeface = android.graphics.Typeface.DEFAULT_BOLD
        textAlign = android.graphics.Paint.Align.LEFT
        isAntiAlias = true
    }
    val textWidth = textPaint.measureText(labelText)
    val padH = 0.35f * labelTextSize
    val padV = 0.22f * labelTextSize
    var baseline = top - 2.0f * padV
    val minBaseline = labelTextSize + padV
    if (baseline < minBaseline) baseline = minBaseline

    val bgLeft = left
    val bgTop = (baseline - labelTextSize) - padV
    val bgRight = left + (2 * padH) + textWidth
    val bgBottom = baseline + padV
    val bgColor = if (vehicle.isPrimaryTarget) Color(0xCC0A1A18) else Color(0x990A1A18)
    val bgPaint = android.graphics.Paint().apply {
        color = bgColor.toArgb()
        isAntiAlias = true
    }
    drawContext.canvas.nativeCanvas.drawRect(bgLeft, bgTop, bgRight, bgBottom, bgPaint)
    drawContext.canvas.nativeCanvas.drawText(labelText, left + padH, baseline, textPaint)
}

@Composable
private fun AdasSettingsDialog(
    currentSettings: AdasSettings,
    onDismiss: () -> Unit,
    onSave: (AdasSettings) -> Unit
) {
    var state by remember { mutableStateOf(currentSettings) }

    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0F172A), RoundedCornerShape(24.dp))
                .padding(20.dp)
        ) {
            Column {
                Text(
                    text = "Cài đặt ADAS",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
                Spacer(modifier = Modifier.height(16.dp))

                AdasToggleItem(
                    title = "AI Neural Net (TFLite EDL0)",
                    subtitle = "Nhận diện đa lớp xe, xe máy, người đi bộ",
                    checked = state.useTfliteAi,
                    onCheckedChange = { state = state.copy(useTfliteAi = it) }
                )
                AdasToggleItem(
                    title = "Cảnh báo va chạm (FCW)",
                    subtitle = "Phát hiện xe phanh gấp / cự ly gần",
                    checked = state.isFcwEnabled,
                    onCheckedChange = { state = state.copy(isFcwEnabled = it) }
                )
                AdasToggleItem(
                    title = "Cảnh báo lệch làn (LDW)",
                    subtitle = "Kích hoạt khi tốc độ ≥ %.0f km/h".format(state.ldwMinSpeedKmh),
                    checked = state.isLdwEnabled,
                    onCheckedChange = { state = state.copy(isLdwEnabled = it) }
                )
                AdasToggleItem(
                    title = "Báo xe trước xuất phát (FVSA)",
                    subtitle = "Nhắc khi dừng đèn đỏ và xe trước đã đi",
                    checked = state.isFvsaEnabled,
                    onCheckedChange = { state = state.copy(isFvsaEnabled = it) }
                )
                AdasToggleItem(
                    title = "Âm thanh bíp tức thời",
                    subtitle = "Phát tiếng bíp khẩn cấp không độ trễ",
                    checked = state.isSoundBeepEnabled,
                    onCheckedChange = { state = state.copy(isSoundBeepEnabled = it) }
                )

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Độ nhạy cảnh báo va chạm: ${state.fcwSensitivity.name}",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FcwSensitivity.values().forEach { sens ->
                        val isSelected = state.fcwSensitivity == sens
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(
                                    if (isSelected) Color(0xFF0284C7) else Color(0xFF1E293B),
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable { state = state.copy(fcwSensitivity = sens) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = when (sens) {
                                    FcwSensitivity.LOW -> "Thấp"
                                    FcwSensitivity.MEDIUM -> "Vừa"
                                    FcwSensitivity.HIGH -> "Cao"
                                },
                                color = if (isSelected) Color.White else Color.White.copy(alpha = 0.6f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Chiều cao lắp Camera: %.2f mét".format(state.cameraMountHeightMeters),
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Slider(
                    value = state.cameraMountHeightMeters,
                    onValueChange = { state = state.copy(cameraMountHeightMeters = it) },
                    valueRange = 1.0f..2.2f,
                    steps = 11,
                    colors = SliderDefaults.colors(
                        thumbColor = Color(0xFF38BDF8),
                        activeTrackColor = Color(0xFF0284C7)
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0284C7), RoundedCornerShape(16.dp))
                        .clickable { onSave(state) }
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "LƯU CÀI ĐẶT",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }
    }
}

@Composable
private fun AdasToggleItem(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = subtitle,
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 11.sp
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Color(0xFF10B981),
                uncheckedThumbColor = Color.White.copy(alpha = 0.6f),
                uncheckedTrackColor = Color(0xFF334155)
            )
        )
    }
}

/**
 * Màn căn chỉnh cam kiểu lily (QuadCalib): kéo 4 góc hình thang + vạch ego.
 * Hình thang = vùng mặt đường nhìn qua kính lái; kéo để khớp làn thực tế.
 */
@Composable
private fun CameraCalibrationOverlay(
    calibration: CameraCalibration,
    onCalibrationChange: (CameraCalibration) -> Unit,
    onReset: () -> Unit,
    onSave: () -> Unit,
    onClose: () -> Unit
) {
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    var dragHandle by remember { mutableStateOf<String?>(null) }
    val density = LocalDensity.current
    val touchRadiusPx = with(density) { 28.dp.toPx() }

    Box(modifier = Modifier.fillMaxSize().background(Color(0x66000000))) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .onSizeChanged { canvasSize = it }
                .pointerInput(calibration, canvasSize) {
                    // Hit-test 4 góc + vạch ego theo tọa độ chuẩn hóa
                    fun normalizedAt(offset: Offset): String? {
                        if (canvasSize.width <= 0 || canvasSize.height <= 0) return null
                        val px = offset.x
                        val py = offset.y
                        val n = IntSize(canvasSize.width, canvasSize.height)
                        val points = mapOf(
                            "TL" to Offset(calibration.topLeftX * n.width, calibration.topY * n.height),
                            "TR" to Offset(calibration.topRightX * n.width, calibration.topY * n.height),
                            "BL" to Offset(calibration.botLeftX * n.width, calibration.botY * n.height),
                            "BR" to Offset(calibration.botRightX * n.width, calibration.botY * n.height),
                            "EGO" to Offset(calibration.egoX * n.width, calibration.botY * n.height)
                        )
                        val hit = points.minByOrNull { (it.value - Offset(px, py)).getDistance() }
                        return if (hit != null && (hit.value - Offset(px, py)).getDistance() <= touchRadiusPx) hit.key else null
                    }

                    detectDragGestures(
                        onDragStart = { dragHandle = normalizedAt(it) },
                        onDragEnd = { dragHandle = null },
                        onDragCancel = { dragHandle = null }
                    ) { change, dragAmount ->
                        change.consume()
                        val handle = dragHandle ?: return@detectDragGestures
                        if (canvasSize.width <= 0 || canvasSize.height <= 0) return@detectDragGestures
                        val dx = dragAmount.x / canvasSize.width
                        val dy = dragAmount.y / canvasSize.height
                        val next = when (handle) {
                            "TL" -> calibration.copy(
                                topLeftX = (calibration.topLeftX + dx).coerceIn(0f, 1f),
                                topY = (calibration.topY + dy).coerceIn(0.1f, 0.9f)
                            )
                            "TR" -> calibration.copy(
                                topRightX = (calibration.topRightX + dx).coerceIn(0f, 1f),
                                topY = (calibration.topY + dy).coerceIn(0.1f, 0.9f)
                            )
                            "BL" -> calibration.copy(
                                botLeftX = (calibration.botLeftX + dx).coerceIn(0f, 1f),
                                botY = (calibration.botY + dy).coerceIn(0.2f, 1f)
                            )
                            "BR" -> calibration.copy(
                                botRightX = (calibration.botRightX + dx).coerceIn(0f, 1f),
                                botY = (calibration.botY + dy).coerceIn(0.2f, 1f)
                            )
                            "EGO" -> calibration.copy(
                                egoX = (calibration.egoX + dx).coerceIn(0f, 1f)
                            )
                            else -> calibration
                        }
                        onCalibrationChange(next)
                    }
                }
        ) {
            val w = size.width
            val h = size.height
            val c = calibration

            fun pxX(nx: Float) = nx * w
            fun pxY(ny: Float) = ny * h

            val tl = Offset(pxX(c.topLeftX), pxY(c.topY))
            val tr = Offset(pxX(c.topRightX), pxY(c.topY))
            val bl = Offset(pxX(c.botLeftX), pxY(c.botY))
            val br = Offset(pxX(c.botRightX), pxY(c.botY))

            // Khung hình thang mặt đường (màu teal lily #22E8E0)
            drawLine(Color(0xFF22E8E0), tl, tr, 3f)
            drawLine(Color(0xFF22E8E0), tr, br, 3f)
            drawLine(Color(0xFF22E8E0), br, bl, 3f)
            drawLine(Color(0xFF22E8E0), bl, tl, 3f)

            // Vạch egoX (tâm xe) đứt nét màu vàng #FFD54F
            drawLine(
                color = Color(0xFFFFD54F),
                start = Offset(pxX(c.egoX), pxY(c.topY)),
                end = Offset(pxX(c.egoX), pxY(c.botY)),
                strokeWidth = 2f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f))
            )

            // 5 núm kéo (4 góc + ego)
            val handles = mapOf(
                "TL" to (tl to "TL%.0f".format(c.topLeftX * 100)),
                "TR" to (tr to "TR%.0f".format(c.topRightX * 100)),
                "BL" to (bl to "BL%.0f".format(c.botLeftX * 100)),
                "BR" to (br to "BR%.0f".format(c.botRightX * 100)),
                "EGO" to (Offset(pxX(c.egoX), pxY(c.botY)) to "E%.0f".format(c.egoX * 100))
            )

            handles.forEach { (key, pair) ->
                val center = pair.first
                val label = pair.second
                val isActive = dragHandle == key
                val outerRadius = if (isActive) 16f else 13f
                drawCircle(Color(0xEE000000), outerRadius, center)
                drawCircle(
                    color = if (key == "EGO") Color(0xFFFFD54F) else Color(0xFF22E8E0),
                    radius = if (isActive) 9f else 7f,
                    center = center
                )
                // Nhãn giá trị
                val textPaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                    color = android.graphics.Color.WHITE
                    textSize = 22f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    textAlign = android.graphics.Paint.Align.CENTER
                }
                drawContext.canvas.nativeCanvas.drawText(
                    label,
                    center.x,
                    center.y + 26f,
                    textPaint
                )
            }

            // Hướng dẫn
            val guidePaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.White.copy(alpha = 0.9f).toArgb()
                textSize = 26f
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                textAlign = android.graphics.Paint.Align.CENTER
            }
            drawContext.canvas.nativeCanvas.drawText(
                "KÉO 4 GÓC KHỚP LÀN ĐƯỜNG + VẠCH EGO",
                w / 2f,
                64f,
                guidePaint
            )
        }

        // Thanh điều khiển dưới
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .background(Color(0xCC1E293B), RoundedCornerShape(14.dp))
                    .clickable { onReset() }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Refresh, contentDescription = "Mặc định", tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("MẶC ĐỊNH", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
                }
            }
            Box(
                modifier = Modifier
                    .weight(2f)
                    .background(Color(0xFF0E7490), RoundedCornerShape(14.dp))
                    .clickable(onClick = onSave)
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "💾 LƯU CĂN CHỈNH: %.1f/%.1f/%.2f → %.2f".format(
                        calibration.topY, calibration.botY,
                        calibration.topLeftX, calibration.topRightX
                    ),
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        // Nút đóng
        IconButton(
            onClick = onClose,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
                .background(Color(0x66000000), CircleShape)
        ) {
            Icon(Icons.Default.Close, contentDescription = "Đóng", tint = Color.White)
        }
    }
}
