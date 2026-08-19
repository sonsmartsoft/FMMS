package com.fmms.carlogger.ui.dashboard

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.ui.DashboardUiState
import com.fmms.carlogger.ui.DashboardViewModel
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import java.util.Calendar
import java.util.Locale

/**
 * Analog speedometer in the style of Lily's TỐC ĐỘ screen (dark FMMS theme):
 * big circular gauge 0→220 km/h with a red needle, live value, Max readout,
 * trip time / distance, and a GPS info strip (distance, accuracy, altitude).
 */
@Composable
fun SpeedometerScreen(vm: DashboardViewModel, onBack: () -> Unit) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val colors = LocalFmmsColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        // Header: ✕  TỐC ĐỘ
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) { Text("✕", color = colors.textPrimary, fontSize = 20.sp) }
            Spacer(modifier = Modifier.weight(1f))
            Text("TỐC ĐỘ", color = colors.textPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.size(48.dp))
        }

        Spacer(modifier = Modifier.height(8.dp))

        AnalogSpeedGauge(
            speedKmh = state.telemetry.speedKmh ?: 0.0,
            maxSpeedKmh = state.trip.maxSpeedKmh,
            accent = colors.red,
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Trip stats row
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                SpeedStat("Quãng đường", tripDistance(state), colors.cyan)
                SpeedStat("Thời gian", tripTime(state), colors.textPrimary)
                SpeedStat("Max.", state.trip.maxSpeedKmh.takeIf { it > 0 }?.let { "${it.toInt()} km/h" } ?: "0 km/h", colors.amber)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // GPS info strip
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Row(horizontalArrangement = Arrangement.SpaceAround) {
                    SpeedStat("Quãng đường", tripDistance(state), colors.textPrimary)
                    SpeedStat("Độ chính xác", accuracy(state), colors.textPrimary)
                    SpeedStat("Cao độ", "—", colors.textPrimary)
                }
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = colors.divider)
                Spacer(modifier = Modifier.height(12.dp))
                val hasFix = state.telemetry.latitude != null && state.telemetry.longitude != null
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(
                                color = if (hasFix) colors.emerald else colors.amber,
                                shape = CircleShape,
                            )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        if (hasFix) "GPS ĐÃ KẾT NỐI" else "Đang tìm tín hiệu GPS...",
                        color = if (hasFix) colors.emerald else colors.amber,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = state.telemetry.rawSource.let { if (it.isBlank()) "NONE" else it },
            color = colors.textSecondary,
            fontSize = 10.sp,
        )
    }
}

@Composable
private fun AnalogSpeedGauge(speedKmh: Double, maxSpeedKmh: Double, accent: Color) {
    val colors = LocalFmmsColors.current
    val max = 220f
    val frac = (speedKmh / max).toFloat().coerceIn(0f, 1f)
    val animated by animateFloatAsState(
        targetValue = frac,
        animationSpec = tween(durationMillis = 300),
        label = "speed",
    )
    val maxFrac = (maxSpeedKmh / max).toFloat().coerceIn(0f, 1f)

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(280.dp)) {
                val stroke = 18.dp.toPx()
                val inset = stroke / 2
                val arcSize = androidx.compose.ui.geometry.Size(
                    size.width - stroke,
                    size.height - stroke,
                )
                val topLeft = Offset(stroke / 2, stroke / 2)
                // Track
                drawArc(
                    color = colors.surfaceVariant,
                    startAngle = 135f,
                    sweepAngle = 270f,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
                // Max marker
                if (maxFrac > 0.01f) {
                    drawArc(
                        color = colors.amber.copy(alpha = 0.35f),
                        startAngle = 135f,
                        sweepAngle = 270f * maxFrac,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = stroke / 2, cap = StrokeCap.Round),
                    )
                }
                // Speed arc
                if (animated > 0.005f) {
                    drawArc(
                        color = accent,
                        startAngle = 135f,
                        sweepAngle = 270f * animated,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = stroke, cap = StrokeCap.Round),
                    )
                }
                // Needle
                val center = Offset(size.width / 2, size.height / 2)
                val angleRad = Math.toRadians(135.0 + 270.0 * animated)
                val needleLen = size.minDimension / 2 - stroke - 10.dp.toPx()
                val end = Offset(
                    center.x + needleLen * kotlin.math.cos(angleRad).toFloat(),
                    center.y + needleLen * kotlin.math.sin(angleRad).toFloat(),
                )
                drawLine(
                    color = colors.red,
                    start = center,
                    end = end,
                    strokeWidth = 5.dp.toPx(),
                    cap = StrokeCap.Round,
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "${speedKmh.toInt()}",
                    color = colors.red,
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Black,
                )
                Text("km/h", color = colors.textSecondary, fontSize = 14.sp)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text("0  20  40  60  80  100  120  140  160  180  200  220", color = colors.textSecondary, fontSize = 9.sp)
    }
}

@Composable
private fun SpeedStat(label: String, value: String, color: Color) {
    val colors = LocalFmmsColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 16.sp, fontWeight = FontWeight.Black)
    }
}

private fun tripDistance(state: DashboardUiState): String =
    String.format(Locale.US, "%.1f km", state.trip.distanceKm)

private fun tripTime(state: DashboardUiState): String {
    val secs = state.trip.durationSeconds
    val h = secs / 3600
    val m = (secs % 3600) / 60
    val s = secs % 60
    return if (h > 0) String.format(Locale.US, "%d:%02d:%02d", h, m, s)
    else String.format(Locale.US, "%02d:%02d", m, s)
}

private fun accuracy(state: DashboardUiState): String {
    val a = state.telemetry.gpsAccuracy
    return if (a != null && a > 0) "${a.toInt()}m" else "—"
}
