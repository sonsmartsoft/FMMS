package com.fmms.carlogger.ui.adas

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Cameraswitch
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.adas.AdasAlertEngine
import com.fmms.carlogger.core.adas.AdasSettings
import com.fmms.carlogger.core.adas.AdasVisionProcessor
import com.fmms.carlogger.core.adas.FcwSensitivity

@Composable
fun AdasScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var settings by remember { mutableStateOf(AdasSettings()) }
    var useFrontCamera by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }

    val visionProcessor = remember { AdasVisionProcessor(context, settings) }
    val alertEngine = remember { AdasAlertEngine(context, scope, settings) }

    val visionOutput by visionProcessor.visionFlow.collectAsState()
    val alertState by alertEngine.alertStateFlow.collectAsState()

    // Lắng nghe dữ liệu tốc độ thời gian thực từ OBD
    val liveTelemetry by AppContainer.telemetryEngine.live.collectAsState()
    val speed = liveTelemetry.speedKmh ?: 0.0
    val rpm = liveTelemetry.rpm ?: 0.0
    val isObdConnected = speed > 0 || rpm > 0

    // Cập nhật Alert Engine mỗi khi có khung hình mới hoặc tốc độ OBD thay đổi
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
        // ── 1. Luồng Camera Trực Tiếp ──
        AdasCameraPreview(
            visionProcessor = visionProcessor,
            useFrontCamera = useFrontCamera
        )

        // ── 2. Lớp Phủ HUD AR & Cảnh Báo Thông Minh ──
        AdasHudOverlay(
            visionOutput = visionOutput,
            alertState = alertState,
            speedKmh = speed
        )

        // ── 3. Thanh Điều Khiển Trên Cùng (Top Cockpit Bar) ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, start = 16.dp, end = 16.dp)
                .align(Alignment.TopCenter),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Nút Quay lại
            IconButton(
                onClick = onNavigateBack,
                modifier = Modifier
                    .background(Color(0x880F172A), CircleShape)
                    .size(44.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Quay lại",
                    tint = Color.White
                )
            }

            // Tên Module & Badge Trạng thái AI / Night Mode
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .background(Color(0xCC0F172A), RoundedCornerShape(20.dp))
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            if (visionOutput.isAiModelActive) Color(0xFF10B981) else Color(0xFFF59E0B),
                            CircleShape
                        )
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (visionOutput.isAiModelActive) "AI ADAS (EDL0)" else "ADAS VISION",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                if (visionOutput.isNightMode) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = "🌙", fontSize = 11.sp)
                }
                if (visionOutput.fps > 0) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "%.0f FPS".format(visionOutput.fps),
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            // Cụm Nút Thao Tác (Đổi Camera, Bật/Tắt Âm Thanh, Cài Đặt)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // Đổi Camera Trước/Sau
                IconButton(
                    onClick = { useFrontCamera = !useFrontCamera },
                    modifier = Modifier
                        .background(Color(0x880F172A), CircleShape)
                        .size(44.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Cameraswitch,
                        contentDescription = "Đổi Camera",
                        tint = Color.White
                    )
                }

                // Bật/Tắt Giọng Nói Tiếng Việt
                IconButton(
                    onClick = {
                        val newSettings = settings.copy(isVoiceAlertEnabled = !settings.isVoiceAlertEnabled)
                        settings = newSettings
                        visionProcessor.updateSettings(newSettings)
                        alertEngine.updateSettings(newSettings)
                    },
                    modifier = Modifier
                        .background(Color(0x880F172A), CircleShape)
                        .size(44.dp)
                ) {
                    Icon(
                        imageVector = if (settings.isVoiceAlertEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                        contentDescription = "Giọng nói",
                        tint = if (settings.isVoiceAlertEnabled) Color(0xFF10B981) else Color.White.copy(alpha = 0.5f)
                    )
                }

                // Cài Đặt Tham Số ADAS
                IconButton(
                    onClick = { showSettingsDialog = true },
                    modifier = Modifier
                        .background(Color(0x880F172A), CircleShape)
                        .size(44.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Cài đặt ADAS",
                        tint = Color.White
                    )
                }
            }
        }

        // ── 4. Dialog Tùy Chỉnh ADAS ──
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
    }
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
                    text = "⚙️ Cài đặt FMMS ADAS",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
                Spacer(modifier = Modifier.height(16.dp))

                // TFLite AI Model toggle
                AdasToggleItem(
                    title = "AI Neural Net (TFLite EDL0)",
                    subtitle = "Nhận diện đa lớp xe, xe máy, người đi bộ",
                    checked = state.useTfliteAi,
                    onCheckedChange = { state = state.copy(useTfliteAi = it) }
                )

                // FCW
                AdasToggleItem(
                    title = "Cảnh báo va chạm (FCW)",
                    subtitle = "Phát hiện xe phanh gấp / cự ly gần",
                    checked = state.isFcwEnabled,
                    onCheckedChange = { state = state.copy(isFcwEnabled = it) }
                )

                // LDW
                AdasToggleItem(
                    title = "Cảnh báo lệch làn (LDW)",
                    subtitle = "Kích hoạt khi tốc độ ≥ %.0f km/h".format(state.ldwMinSpeedKmh),
                    checked = state.isLdwEnabled,
                    onCheckedChange = { state = state.copy(isLdwEnabled = it) }
                )

                // FVSA
                AdasToggleItem(
                    title = "Báo xe trước xuất phát (FVSA)",
                    subtitle = "Nhắc nhở khi dừng đèn đỏ và xe trước đã đi",
                    checked = state.isFvsaEnabled,
                    onCheckedChange = { state = state.copy(isFvsaEnabled = it) }
                )

                // Âm thanh bíp
                AdasToggleItem(
                    title = "Âm thanh Bíp tức thời",
                    subtitle = "Phát tiếng bíp khẩn cấp không độ trễ",
                    checked = state.isSoundBeepEnabled,
                    onCheckedChange = { state = state.copy(isSoundBeepEnabled = it) }
                )

                // Độ nhạy FCW
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
                                text = when(sens) {
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

                // Chiều cao camera
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

                // Nút Lưu
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
