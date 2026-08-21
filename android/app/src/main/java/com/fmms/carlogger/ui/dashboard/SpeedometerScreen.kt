package com.fmms.carlogger.ui.dashboard

import android.content.Intent
import android.graphics.drawable.Drawable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.domain.model.LiveTelemetry
import com.fmms.carlogger.ui.DashboardUiState
import com.fmms.carlogger.ui.DashboardViewModel
import com.fmms.carlogger.ui.theme.FmmsColors
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import java.util.Locale

/**
 * Analog speedometer (dark FMMS theme): big circular gauge 0→220 km/h with a red
 * needle, a MINI gauge (1/3 size) beside it showing a selectable OBD metric
 * (tap to cycle RPM → coolant → fuel → voltage → engine load), trip stats,
 * an app-shortcut strip, and a GPS info strip.
 */
@Composable
fun SpeedometerScreen(vm: DashboardViewModel) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val colors = LocalFmmsColors.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        // Header — đóng bằng cách bấm icon trên thanh điều hướng
        Text(
            "TỐC ĐỘ",
            color = colors.textPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Gauge chính + mini OBD căn TRÁI; màn rộng thì bên phải là panel KPI động cơ
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            val miniSize = (maxWidth / 4.6f).coerceIn(84.dp, 110.dp)
            val mainSize = (miniSize * 3f).coerceIn(230.dp, 300.dp)
            val areaWidth = maxWidth
            val isWideGauge = areaWidth >= 620.dp
            if (isWideGauge) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.Start,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AnalogSpeedGauge(
                            modifier = Modifier.width(mainSize),
                            speedKmh = state.telemetry.speedKmh?.takeIf { it.isFinite() && it >= 0 } ?: 0.0,
                            maxSpeedKmh = state.trip.maxSpeedKmh?.takeIf { it.isFinite() && it > 0 } ?: 0.0,
                            accent = colors.red,
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        MiniObdGauge(
                            telemetry = state.telemetry,
                            size = miniSize,
                            colors = colors,
                        )
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    EngineKpiPanel(
                        telemetry = state.telemetry,
                        modifier = Modifier.width((areaWidth * 0.44f).coerceAtMost(420.dp)),
                        colors = colors,
                    )
                }
            } else {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AnalogSpeedGauge(
                            modifier = Modifier.width(mainSize),
                            speedKmh = state.telemetry.speedKmh?.takeIf { it.isFinite() && it >= 0 } ?: 0.0,
                            maxSpeedKmh = state.trip.maxSpeedKmh?.takeIf { it.isFinite() && it > 0 } ?: 0.0,
                            accent = colors.red,
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        MiniObdGauge(
                            telemetry = state.telemetry,
                            size = miniSize,
                            colors = colors,
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    EngineKpiPanel(
                        telemetry = state.telemetry,
                        modifier = Modifier.fillMaxWidth(),
                        colors = colors,
                    )
                }
            }
        }

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
                SpeedStat("Max.", state.trip.maxSpeedKmh.takeIf { it.isFinite() && it > 0 }?.let { "${it.toInt()} km/h" } ?: "0 km/h", colors.amber)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Dải phím tắt ứng dụng khác
        AppShortcutStrip(colors = colors)

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

// ---------------------------------------------------------------------
// Main analog speed gauge
// ---------------------------------------------------------------------

@Composable
private fun AnalogSpeedGauge(modifier: Modifier, speedKmh: Double, maxSpeedKmh: Double, accent: Color) {
    val colors = LocalFmmsColors.current
    val frac = (speedKmh / 220.0).toFloat().coerceIn(0f, 1f)
    val animated by animateFloatAsState(
        targetValue = frac,
        animationSpec = tween(durationMillis = 300),
        label = "speed",
    )

    BoxWithConstraints(modifier = modifier, contentAlignment = Alignment.Center) {
        val gaugeSize = minOf(maxWidth, maxHeight)
        GaugeCanvas(
            size = gaugeSize,
            maxValue = 220.0,
            value = speedKmh.coerceIn(0.0, 220.0),
            markerValue = maxSpeedKmh.takeIf { it > 0 && it.isFinite() },
            accent = accent,
            tickStep = 10,
            majorStep = 20,
            labelStep = 20,
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "${speedKmh.toInt()}",
                color = colors.red,
                fontSize = (gaugeSize.value * 0.185f).sp,
                fontWeight = FontWeight.Black,
            )
            Text("km/h", color = colors.textSecondary, fontSize = (gaugeSize.value * 0.047f).sp)
        }
    }
}

// ---------------------------------------------------------------------
// Mini OBD gauge — tap to cycle metric
// ---------------------------------------------------------------------

private data class MiniMetric(
    val label: String,
    val unit: String,
    val maxValue: Double,
    val value: (LiveTelemetry) -> Double?,
)

private val miniMetrics = listOf(
    MiniMetric("RPM", "rpm", 8000.0) { it.rpm },
    MiniMetric("NHIỆT NƯỚC", "°C", 140.0) { it.coolantTempC },
    MiniMetric("MỨC XĂNG", "%", 100.0) { it.fuelLevelPercent },
    MiniMetric("ĐIỆN ÁP", "V", 16.0) { it.batteryVoltage },
    MiniMetric("TẢI ĐỘNG CƠ", "%", 100.0) { it.engineLoadPercent },
)

/** Panel chỉ số động cơ dạng KPI số to — đặt bên phải gauge ở màn rộng. */
@Composable
private fun EngineKpiPanel(telemetry: LiveTelemetry, modifier: Modifier = Modifier, colors: FmmsColors) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp)) {
            Text(
                "ĐỘNG CƠ • OBD",
                color = colors.textSecondary,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                KpiCell("RPM", telemetry.rpm?.takeIf { it.isFinite() }?.let { String.format(Locale.US, "%.0f", it) } ?: "—", "", colors.cyan, Modifier.weight(1f), colors)
                KpiCell("NHIỆT NƯỚC", telemetry.coolantTempC?.takeIf { it.isFinite() }?.let { String.format(Locale.US, "%.0f", it) } ?: "—", "°C", colors.amber, Modifier.weight(1f), colors)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                KpiCell("MỨC XĂNG", telemetry.fuelLevelPercent?.takeIf { it.isFinite() }?.let { String.format(Locale.US, "%.0f", it) } ?: "—", "%", Color(0xFF34D399), Modifier.weight(1f), colors)
                KpiCell("ĐIỆN ÁP", telemetry.batteryVoltage?.takeIf { it.isFinite() }?.let { String.format(Locale.US, "%.1f", it) } ?: "—", "V", colors.purple, Modifier.weight(1f), colors)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                KpiCell("TẢI ĐỘNG CƠ", telemetry.engineLoadPercent?.takeIf { it.isFinite() }?.let { String.format(Locale.US, "%.0f", it) } ?: "—", "%", colors.textPrimary, Modifier.weight(1f), colors)
                Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun KpiCell(label: String, value: String, unit: String, color: Color, modifier: Modifier = Modifier, colors: FmmsColors) {
    Column(modifier = modifier) {
        Text(label, color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, color = color, fontSize = 26.sp, fontWeight = FontWeight.Black)
            if (unit.isNotEmpty()) {
                Spacer(Modifier.width(2.dp))
                Text(unit, color = color.copy(alpha = 0.7f), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MiniObdGauge(telemetry: LiveTelemetry, size: Dp, colors: FmmsColors) {
    var index by rememberSaveable { mutableIntStateOf(0) }
    val metric = miniMetrics[index % miniMetrics.size]
    val raw = metric.value(telemetry)
    val display = raw?.takeIf { it.isFinite() }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BoxWithConstraints(
            modifier = Modifier
                .width(size)
                .clip(RoundedCornerShape(14.dp))
                .combinedClickable(onClick = { index = (index + 1) % miniMetrics.size }),
            contentAlignment = Alignment.Center,
        ) {
            GaugeCanvas(
                size = size,
                maxValue = metric.maxValue,
                value = (display ?: 0.0).coerceIn(0.0, metric.maxValue),
                markerValue = null,
                accent = colors.purple,
                tickStep = 6,
                majorStep = Int.MAX_VALUE,
                labelStep = null,
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    display?.let { String.format(Locale.US, "%.0f", it) } ?: "—",
                    color = colors.cyan,
                    fontSize = (size.value * 0.2f).sp,
                    fontWeight = FontWeight.Black,
                )
                Text(metric.unit, color = colors.textSecondary, fontSize = (size.value * 0.085f).sp)
            }
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            metric.label,
            color = colors.textSecondary,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
        Text(
            "chạm để đổi",
            color = colors.textSecondary.copy(alpha = 0.6f),
            fontSize = 8.sp,
        )
    }
}

// ---------------------------------------------------------------------
// Shared gauge canvas (270° arc from 135°, ticks, optional labels & needle)
// ---------------------------------------------------------------------

@Composable
private fun GaugeCanvas(
    size: Dp,
    maxValue: Double,
    value: Double,
    markerValue: Double?,
    accent: Color,
    tickStep: Int,
    majorStep: Int,
    labelStep: Int?,
) {
    val colors = LocalFmmsColors.current
    val frac = (value / maxValue).toFloat().coerceIn(0f, 1f)
    val animated by animateFloatAsState(
        targetValue = frac,
        animationSpec = tween(durationMillis = 300),
        label = "gauge",
    )
    val markerFrac = markerValue?.div(maxValue)?.toFloat()?.coerceIn(0f, 1f) ?: 0f

    Canvas(modifier = Modifier.size(size)) {
        val stroke = (size.value * 0.06f).dp.toPx()
        val arcSize = androidx.compose.ui.geometry.Size(
            this.size.width - stroke,
            this.size.height - stroke,
        )
        val topLeft = Offset(stroke / 2, stroke / 2)
        val center = Offset(this.size.width / 2, this.size.height / 2)
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
        // Tick marks
        val tickOuter = this.size.minDimension / 2 - 2.dp.toPx()
        var v = 0.0
        while (v <= maxValue + 1e-6) {
            val f = (v / maxValue).toFloat()
            val ang = Math.toRadians(135.0 + 270.0 * f)
            val major = majorStep == Int.MAX_VALUE || (v % majorStep == 0.0)
            val tickLen = when {
                major -> (size.value * 0.04f).dp.toPx()
                else -> (size.value * 0.023f).dp.toPx()
            }
            val cos = kotlin.math.cos(ang).toFloat()
            val sin = kotlin.math.sin(ang).toFloat()
            drawLine(
                color = if (major) colors.textPrimary else colors.textSecondary,
                start = Offset(center.x + (tickOuter - tickLen) * cos, center.y + (tickOuter - tickLen) * sin),
                end = Offset(center.x + tickOuter * cos, center.y + tickOuter * sin),
                strokeWidth = if (major) 2.5.dp.toPx() else 1.2.dp.toPx(),
                cap = StrokeCap.Round,
            )
            v += tickStep
        }
        // Scale labels along the arc
        if (labelStep != null) {
            val labelPaint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                color = colors.textSecondary.toArgb()
                textAlign = android.graphics.Paint.Align.CENTER
                textSize = (size.value * 0.037f).sp.toPx()
                typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
            }
            val labelRadius = tickOuter - (size.value * 0.09f).dp.toPx()
            var lv = 0
            while (lv <= maxValue) {
                val ang = Math.toRadians(135.0 + 270.0 * (lv / maxValue))
                val x = center.x + labelRadius * kotlin.math.cos(ang).toFloat()
                val yBaseline = center.y + labelRadius * kotlin.math.sin(ang).toFloat() -
                    (labelPaint.ascent() + labelPaint.descent()) / 2f
                drawContext.canvas.nativeCanvas.drawText(lv.toString(), x, yBaseline, labelPaint)
                lv += labelStep
            }
        }
        // Marker arc (e.g. trip max speed)
        if (markerFrac > 0.01f) {
            drawArc(
                color = colors.amber.copy(alpha = 0.35f),
                startAngle = 135f,
                sweepAngle = 270f * markerFrac,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke / 2, cap = StrokeCap.Round),
            )
        }
        // Value arc
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
        val angleRad = Math.toRadians(135.0 + 270.0 * animated)
        val needleLen = this.size.minDimension / 2 - stroke - 10.dp.toPx()
        drawLine(
            color = colors.red,
            start = center,
            end = Offset(
                center.x + needleLen * kotlin.math.cos(angleRad).toFloat(),
                center.y + needleLen * kotlin.math.sin(angleRad).toFloat(),
            ),
            strokeWidth = 5.dp.toPx(),
            cap = StrokeCap.Round,
        )
    }
}

// ---------------------------------------------------------------------
// App shortcut strip
// ---------------------------------------------------------------------

private data class ShortcutApp(val packageName: String, val label: String, val icon: Drawable?)

private fun launchableApps(context: android.content.Context): List<ShortcutApp> {
    val pm = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    return pm.queryIntentActivities(intent, 0)
        .asSequence()
        .mapNotNull { info ->
            val pkg = info.activityInfo?.packageName ?: return@mapNotNull null
            if (pkg == context.packageName) null
            else ShortcutApp(pkg, info.loadLabel(pm)?.toString() ?: pkg, info.loadIcon(pm))
        }
        .distinctBy { it.packageName }
        .sortedBy { it.label.lowercase(Locale.US) }
        .toList()
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AppShortcutStrip(colors: FmmsColors) {
    val context = LocalContext.current
    var shortcuts by remember { mutableStateOf(AppContainer.prefs.getAppShortcuts()) }
    var showPicker by remember { mutableStateOf(false) }
    var toast by remember { mutableStateOf<String?>(null) }

    toast?.let { msg ->
        LaunchedEffect(msg) {
            android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_SHORT).show()
            toast = null
        }
    }

    fun save(list: List<String>) {
        shortcuts = list
        AppContainer.prefs.setAppShortcuts(list)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(
                "PHÍM TẮT ỨNG DỤNG",
                color = colors.textSecondary,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                shortcuts.forEach { pkg ->
                    val app = remember(pkg) {
                        runCatching { launchableApps(context).firstOrNull { it.packageName == pkg } }.getOrNull()
                    }
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(end = 12.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .combinedClickable(
                                    onClick = {
                                        runCatching {
                                            context.packageManager.getLaunchIntentForPackage(pkg)
                                                ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                                ?.let { context.startActivity(it) }
                                        }.onFailure { toast = "Không mở được app" }
                                    },
                                    onLongClick = {
                                        save(shortcuts - pkg)
                                        toast = "Đã bỏ ghim ${app?.label ?: pkg}"
                                    },
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (app?.icon != null) {
                                android.widget.ImageView(context).apply { app.icon.let { setImageDrawable(it) } }.let { iv ->
                                    AndroidViewFromImageView(iv)
                                }
                            } else {
                                Text("?", color = colors.textPrimary, fontSize = 18.sp, fontWeight = FontWeight.Black)
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            app?.label ?: pkg.substringAfterLast('.'),
                            color = colors.textSecondary,
                            fontSize = 9.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.width(52.dp),
                            textAlign = TextAlign.Center,
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(colors.surfaceVariant, RoundedCornerShape(10.dp))
                        .combinedClickable(onClick = { showPicker = true }),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("+", color = colors.cyan, fontSize = 24.sp, fontWeight = FontWeight.Black)
                }
            }
        }
    }

    if (showPicker) {
        AppPickerDialog(
            colors = colors,
            onDismiss = { showPicker = false },
            onPick = { app ->
                if (app.packageName !in shortcuts) save(shortcuts + app.packageName)
                showPicker = false
            },
        )
    }
}

/** Wrapper hiển thị Drawable icon của app ngoài trong Compose. */
@Composable
private fun AndroidViewFromImageView(iv: android.widget.ImageView) {
    androidx.compose.ui.viewinterop.AndroidView(
        factory = { iv },
        modifier = Modifier.size(34.dp),
    )
}

@Composable
@OptIn(ExperimentalFoundationApi::class)
private fun AppPickerDialog(colors: FmmsColors, onDismiss: () -> Unit, onPick: (ShortcutApp) -> Unit) {
    val context = LocalContext.current
    val apps = remember { runCatching { launchableApps(context) }.getOrElse { emptyList() } }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("ĐÓNG", color = colors.cyan) }
        },
        title = { Text("Chọn ứng dụng để ghim", color = colors.textPrimary, fontSize = 16.sp) },
        text = {
            if (apps.isEmpty()) {
                Text("Không tìm thấy ứng dụng nào.", color = colors.textSecondary, fontSize = 13.sp)
            } else {
                LazyColumn(modifier = Modifier.size(width = 280.dp, height = 360.dp)) {
                    items(apps, key = { it.packageName }) { app ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .combinedClickable(onClick = { onPick(app) })
                                .padding(vertical = 6.dp, horizontal = 4.dp),
                        ) {
                            app.icon?.let { drawable ->
                                androidx.compose.ui.viewinterop.AndroidView(
                                    factory = { ctx -> android.widget.ImageView(ctx).apply { setImageDrawable(drawable) } },
                                    modifier = Modifier.size(32.dp),
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                app.label,
                                color = colors.textPrimary,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        },
    )
}

// ---------------------------------------------------------------------
// Small stat cell
// ---------------------------------------------------------------------

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
