package com.fmms.carlogger.ui.carui

import android.annotation.SuppressLint
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.ui.DashboardViewModel
import com.fmms.carlogger.ui.common.AppPickerDialog
import com.fmms.carlogger.ui.common.DrawableIconView
import com.fmms.carlogger.ui.common.ShortcutApp
import com.fmms.carlogger.ui.common.launchApp
import com.fmms.carlogger.ui.common.launchableApps
import com.fmms.carlogger.ui.i18n.FmmsStrings
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.FmmsColors
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import com.fmms.carlogger.util.LunarCalendar
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Tab "Car UI" — bảng đồng hồ ô tô lấy cảm hứng từ app Lily:
 * đồng hồ lớn + ngày/tháng + chip âm lịch, tốc độ khổng lồ có vòng cung,
 * dàn gauge nhỏ (nhiệt nước / xăng / ắc quy / tải), footer ODO + hành trình.
 * Phần map của Lily được thay bằng khung đa phương tiện:
 * lưới nút mở app ngoài (cam hành trình 360, YouTube…) hoặc WebView nhúng trang web.
 */
@Composable
fun CarUiScreen(vm: DashboardViewModel) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    val colors = LocalFmmsColors.current
    val s = LocalStrings.current

    var now by remember { mutableStateOf(Date()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = Date()
            delay(10_000L)
        }
    }

    val locale = if (s.isVietnamese) Locale("vi") else Locale.US
    val timeFmt = remember(locale) { SimpleDateFormat("HH:mm", locale) }
    val dateFmt = remember(locale) { SimpleDateFormat("EEEE, dd/MM/yyyy", locale) }
    val lunarLabel = remember { LunarCalendar.fullLunarLabel(LunarCalendar.today()) }
    val lunarShort = remember(lunarLabel) {
        // "Mồng 5 tháng Tám năm Bính Ngọ" -> gọn cho chip: bỏ phần năm
        lunarLabel.replace(Regex("\\s*năm\\s+.*$"), "")
    }

    val t = state.telemetry
    val speedVal = t.speedKmh ?: t.gpsSpeedKmh ?: 0.0
    val speedText = if (speedVal.isFinite()) speedVal.toInt().coerceAtLeast(0).toString() else "—"
    val fraction = ((if (speedVal.isFinite()) speedVal else 0.0) / 120.0).coerceIn(0.0, 1.0).toFloat()
    val animatedFraction by animateFloatAsState(
        targetValue = fraction,
        animationSpec = tween(durationMillis = 350),
        label = "speedArc",
    )
    val arcColor = when {
        fraction > 0.75f -> colors.red
        fraction > 0.5f -> colors.amber
        else -> colors.cyan
    }
    val fuelColor = fuelLevelColor(t.fuelLevelPercent, colors)

    BoxWithConstraints(Modifier.fillMaxSize().background(colors.background)) {
        val isWide = maxWidth >= 560.dp

        if (isWide) {
            // MÀN NGANG (gắn trên xe): trái = cụm đồng hồ, phải = khung media như map của Lily
            Row(
                Modifier.fillMaxSize().padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(
                    Modifier.weight(0.42f).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    ClockCard(timeFmt.format(now), dateFmt.format(now), lunarShort, colors)
                    Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        SpeedHero(speedText, animatedFraction, arcColor, t.gearLabel, colors, heroSize = 230.dp)
                    }
                    GaugeRow(t.coolantTempC, t.fuelLevelPercent, fuelColor, t.batteryVoltage, t.engineLoadPercent, s, colors)
                    FooterCard(state.trip.distanceKm, state.trip.durationSeconds, t.odometerSavedKm, t.odometerKm, t.gpsAccuracy, s, colors)
                }
                Box(Modifier.weight(0.58f).fillMaxHeight()) {
                    MediaFrame(colors, s, frameHeight = null)
                }
            }
        } else {
            Column(
                Modifier.fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                ClockCard(timeFmt.format(now), dateFmt.format(now), lunarShort, colors)
                Box(Modifier.fillMaxWidth().height(270.dp), contentAlignment = Alignment.Center) {
                    SpeedHero(speedText, animatedFraction, arcColor, t.gearLabel, colors, heroSize = 250.dp)
                }
                GaugeRow(t.coolantTempC, t.fuelLevelPercent, fuelColor, t.batteryVoltage, t.engineLoadPercent, s, colors)
                FooterCard(state.trip.distanceKm, state.trip.durationSeconds, t.odometerSavedKm, t.odometerKm, t.gpsAccuracy, s, colors)
                MediaFrame(colors, s, frameHeight = 320.dp)
            }
        }
    }
}

// ---------------------------------------------------------------------
// Đồng hồ + ngày + âm lịch
// ---------------------------------------------------------------------

@Composable
private fun ClockCard(time: String, dateLine: String, lunarLine: String, colors: FmmsColors) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(colors.surface)
            .padding(horizontal = 18.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(time, color = colors.textPrimary, fontSize = 42.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            Text(dateLine, color = colors.textSecondary, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        }
        Text(lunarLine, color = colors.amber, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

// ---------------------------------------------------------------------
// Tốc độ khổng lồ + vòng cung
// ---------------------------------------------------------------------

@Composable
private fun SpeedHero(
    speedText: String,
    fraction: Float,
    arcColor: Color,
    gearLabel: String?,
    colors: FmmsColors,
    heroSize: Dp,
) {
    val track = colors.surfaceVariant
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(heroSize)) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 20.dp.toPx()
            drawArc(
                color = track,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            if (fraction > 0.005f) {
                drawArc(
                    color = arcColor,
                    startAngle = 135f,
                    sweepAngle = 270f * fraction,
                    useCenter = false,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                speedText,
                color = colors.textPrimary,
                fontSize = if (heroSize >= 260.dp) 92.sp else 76.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                lineHeight = if (heroSize >= 260.dp) 92.sp else 76.sp,
            )
            Text("km/h", color = colors.textSecondary, fontSize = 17.sp, fontWeight = FontWeight.Medium)
            if (!gearLabel.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Box(
                    Modifier.clip(CircleShape).background(colors.surfaceVariant).padding(horizontal = 12.dp, vertical = 4.dp),
                ) {
                    Text(gearLabel, color = colors.cyan, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------
// Khung đa phương tiện: APP (lưới nút mở app) | WEB (WebView nhúng)
// ---------------------------------------------------------------------

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MediaFrame(colors: FmmsColors, s: FmmsStrings, frameHeight: Dp?) {
    val context = LocalContext.current
    var mode by rememberSaveable { mutableStateOf("app") }
    var shortcuts by remember { mutableStateOf(AppContainer.prefs.getAppShortcuts()) }
    var showPicker by remember { mutableStateOf(false) }
    var toast by remember { mutableStateOf<String?>(null) }

    fun save(list: List<String>) {
        shortcuts = list
        AppContainer.prefs.setAppShortcuts(list)
    }

    toast?.let { msg ->
        LaunchedEffect(msg) {
            android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_SHORT).show()
            toast = null
        }
    }

    val frameModifier = Modifier
        .then(if (frameHeight != null) Modifier.height(frameHeight) else Modifier.fillMaxHeight())
        .fillMaxWidth()
        .clip(RoundedCornerShape(20.dp))
        .background(colors.surface)

    Column(frameModifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
        // Header: hai chip chuyển chế độ
        Row(verticalAlignment = Alignment.CenterVertically) {
            ModeChip(s.mediaAppTab, mode == "app", colors) { mode = "app" }
            Spacer(Modifier.width(8.dp))
            ModeChip(s.mediaWebTab, mode == "web", colors) { mode = "web" }
        }
        Spacer(Modifier.height(8.dp))

        if (mode == "app") {
            val apps = remember(shortcuts) {
                val all = runCatching { launchableApps(context) }.getOrElse { emptyList() }
                shortcuts.mapNotNull { pkg -> all.firstOrNull { it.packageName == pkg } }
            }
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(apps, key = { it.packageName }) { app ->
                    AppTile(app, colors, s,
                        onClick = {
                            val ok = launchApp(context, app.packageName)
                            if (!ok) toast = s.cannotOpenApp
                        },
                        onLongClick = {
                            save(shortcuts - app.packageName)
                            toast = s.unpinnedFmt.format(app.label)
                        })
                }
                item(key = "add") {
                    Box(
                        Modifier
                            .size(72.dp)
                            .background(colors.surfaceVariant, RoundedCornerShape(16.dp))
                            .combinedClickable(onClick = { showPicker = true }),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = s.chooseAppToPin, tint = colors.cyan, modifier = Modifier.size(28.dp))
                    }
                }
            }
        } else {
            WebPane(colors, s)
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

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ModeChip(label: String, selected: Boolean, colors: FmmsColors, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(CircleShape)
            .background(if (selected) colors.cyan.copy(alpha = 0.16f) else colors.surfaceVariant)
            .combinedClickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            color = if (selected) colors.cyan else colors.textSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AppTile(
    app: ShortcutApp,
    colors: FmmsColors,
    s: FmmsStrings,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(colors.background)
            .combinedClickable(onClick = onClick, onLongClick = onLongClick)
            .padding(vertical = 10.dp, horizontal = 4.dp),
    ) {
        DrawableIconView(app.icon, size = 40)
        Spacer(Modifier.height(4.dp))
        Text(
            app.label,
            color = colors.textPrimary,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WebPane(colors: FmmsColors, s: FmmsStrings) {
    var input by rememberSaveable { mutableStateOf(AppContainer.prefs.getLastWebUrl() ?: "") }
    var currentUrl by rememberSaveable { mutableStateOf(AppContainer.prefs.getLastWebUrl() ?: "") }
    var webView by remember { mutableStateOf<WebView?>(null) }

    fun submit(raw: String) {
        val url = raw.trim()
        if (url.isEmpty()) return
        val full = if (url.startsWith("http://") || url.startsWith("https://")) url else "https://$url"
        input = full
        currentUrl = full
        AppContainer.prefs.setLastWebUrl(full)
    }

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = input,
            onValueChange = { input = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(s.webUrlHint, color = colors.textSecondary, fontSize = 13.sp) },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
            keyboardActions = KeyboardActions(onGo = { submit(input) }),
            trailingIcon = {
                Icon(
                    Icons.Filled.ArrowForward,
                    contentDescription = "Go",
                    tint = colors.cyan,
                    modifier = Modifier
                        .size(22.dp)
                        .combinedClickable(onClick = { submit(input) }),
                )
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = colors.textPrimary,
                unfocusedTextColor = colors.textPrimary,
                focusedBorderColor = colors.cyan,
                unfocusedBorderColor = colors.divider,
                cursorColor = colors.cyan,
            ),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp, color = colors.textPrimary),
        )
        Spacer(Modifier.height(8.dp))

        if (currentUrl.isBlank()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(s.webUrlHint, color = colors.textSecondary, fontSize = 13.sp, textAlign = TextAlign.Center)
            }
        } else {
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.loadsImagesAutomatically = true
                        webViewClient = WebViewClient()
                        loadUrl(currentUrl)
                    }.also { webView = it }
                },
                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
            )
        }
    }

    DisposableEffect(Unit) {
        onDispose { webView?.destroy(); webView = null }
    }
}

// ---------------------------------------------------------------------
// Gauge nhỏ + footer ODO/hành trình
// ---------------------------------------------------------------------

@Composable
private fun GaugeRow(
    coolantC: Double?,
    fuelPct: Double?,
    fuelColor: Color,
    voltage: Double?,
    loadPct: Double?,
    s: FmmsStrings,
    colors: FmmsColors,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        GaugeCell(s.coolantLbl, coolantC?.let { "${it.toInt()}" } ?: "—", "°C",
            when {
                (coolantC ?: 0.0) >= 110.0 -> colors.red
                (coolantC ?: 0.0) >= 95.0 -> colors.amber
                coolantC == null -> colors.textSecondary
                else -> colors.textPrimary
            }, colors, Modifier.weight(1f))
        GaugeCell(s.fuelLvlShort, fuelPct?.let { "${it.toInt()}" } ?: "—", "%", fuelColor, colors, Modifier.weight(1f))
        GaugeCell(s.voltageLbl, voltage?.let { String.format(Locale.US, "%.1f", it) } ?: "—", "V",
            when {
                voltage != null && voltage < 11.8 -> colors.red
                voltage == null -> colors.textSecondary
                else -> colors.textPrimary
            }, colors, Modifier.weight(1f))
        GaugeCell(s.engineLoadLbl, loadPct?.let { "${it.toInt()}" } ?: "—", "%",
            if (loadPct == null) colors.textSecondary else colors.textPrimary, colors, Modifier.weight(1f))
    }
}

@Composable
private fun GaugeCell(
    label: String,
    value: String,
    unit: String,
    valueColor: Color,
    colors: FmmsColors,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surface)
            .padding(vertical = 10.dp, horizontal = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, color = valueColor, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(unit, color = colors.textSecondary, fontSize = 11.sp, modifier = Modifier.padding(start = 2.dp, bottom = 2.dp))
        }
    }
}

@Composable
private fun FooterCard(
    tripKm: Double,
    tripSeconds: Long,
    odoSavedKm: Double?,
    odoLiveKm: Double?,
    gpsAccuracy: Double?,
    s: FmmsStrings,
    colors: FmmsColors,
) {
    val gpsColor = when {
        gpsAccuracy == null -> colors.textSecondary
        gpsAccuracy <= 15.0 -> colors.emerald
        gpsAccuracy <= 30.0 -> colors.amber
        else -> colors.red
    }
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(colors.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${s.odometerLbl} ${odoSavedKm?.let { fmtKm(it) } ?: "—"} km",
                color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            if (odoLiveKm != null && odoLiveKm.isFinite()) {
                Text(" • live ${fmtKm(odoLiveKm)} km", color = colors.textSecondary, fontSize = 12.sp, maxLines = 1)
            }
            Spacer(Modifier.weight(1f))
            GpsDot(gpsColor, gpsAccuracy, s.accuracyLbl, colors)
        }
        Row {
            Text("${s.distance} ${fmtKm(tripKm)} km", color = colors.textSecondary, fontSize = 13.sp)
            Spacer(Modifier.weight(1f))
            Text("${s.duration} ${formatDuration(tripSeconds)}", color = colors.textSecondary, fontSize = 13.sp)
        }
    }
}

@Composable
private fun GpsDot(color: Color, accuracy: Double?, label: String, colors: FmmsColors) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(color))
        Text(
            if (accuracy != null) " $label ±${accuracy.toInt()}m" else " GPS —",
            color = colors.textSecondary,
            fontSize = 11.sp,
        )
    }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

private fun fuelLevelColor(pct: Double?, colors: FmmsColors): Color = when {
    pct == null || !pct.isFinite() -> colors.textSecondary
    pct < 10.0 -> colors.red
    pct <= 50.0 -> colors.amber
    else -> colors.emerald
}

private fun fmtKm(km: Double): String = if (km >= 100.0) "${km.toInt()}" else String.format(Locale.US, "%.1f", km)

private fun formatDuration(seconds: Long): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val sec = seconds % 60
    return String.format(Locale.US, "%02d:%02d:%02d", h, m, sec)
}
