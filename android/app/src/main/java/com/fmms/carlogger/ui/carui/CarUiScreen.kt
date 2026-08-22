package com.fmms.carlogger.ui.carui

import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.osmdroid.util.GeoPoint
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
        // State tab media (APPS/WEB/MAP) lưu vào prefs: xoay máy làm Activity
        // recreate và hai nhánh layout có saveable-key khác nhau nên
        // rememberSaveable không giữ được giá trị.
        var mediaMode by rememberSaveable { mutableStateOf(AppContainer.prefs.getMediaMode()) }
        LaunchedEffect(mediaMode) { AppContainer.prefs.setMediaMode(mediaMode) }

        var mapFull by rememberSaveable { mutableStateOf(AppContainer.prefs.getMapFull()) }
        LaunchedEffect(mapFull) { AppContainer.prefs.setMapFull(mapFull) }

        if (mediaMode == "map" && mapFull) {
            // Bản đồ tràn toàn khung — ẩn đồng hồ/tốc độ/gauge để lái tập trung
            Box(Modifier.fillMaxSize().padding(12.dp)) {
                MediaFrame(vm, colors, s, frameHeight = null, mode = mediaMode, onModeChange = { mediaMode = it }, isFull = mapFull, onToggleFull = { mapFull = !mapFull })
            }
        } else if (isWide) {
            // MÀN NGANG (gắn trên xe): trên = cụm đồng hồ trái + khung media phải,
            // dưới = dải gauge full-width. Tốc độ tự co theo chỗ trống để không chèn thẻ khác.
            Column(
                Modifier.fillMaxSize().padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(
                        Modifier.weight(0.42f).fillMaxHeight(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        ClockCard(timeFmt.format(now), dateFmt.format(now), lunarShort, colors, compact = true)
                        BoxWithConstraints(
                            Modifier.weight(1f).fillMaxWidth(),
                            contentAlignment = Alignment.Center,
                        ) {
                            val heroSize = minOf(maxWidth * 0.88f, maxHeight * 0.96f)
                            SpeedHero(speedText, animatedFraction, arcColor, t.gearLabel, colors, heroSize = heroSize)
                        }
                        FooterCard(state.trip.distanceKm, state.trip.durationSeconds, t.odometerSavedKm, t.odometerKm, t.gpsAccuracy, s, colors, compact = true)
                    }
                    Box(Modifier.weight(0.58f).fillMaxHeight()) {
                        MediaFrame(vm, colors, s, frameHeight = null, mode = mediaMode, onModeChange = { mediaMode = it }, isFull = mapFull, onToggleFull = { mapFull = !mapFull })
                    }
                }
                GaugeRow(t.coolantTempC, t.fuelLevelPercent, fuelColor, t.batteryVoltage, t.engineLoadPercent, s, colors)
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
                MediaFrame(vm, colors, s, frameHeight = 320.dp, mode = mediaMode, onModeChange = { mediaMode = it }, isFull = false, onToggleFull = {})
            }
        }
    }
}

// ---------------------------------------------------------------------
// Đồng hồ + ngày + âm lịch
// ---------------------------------------------------------------------

@Composable
private fun ClockCard(
    time: String,
    dateLine: String,
    lunarLine: String,
    colors: FmmsColors,
    compact: Boolean = false,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(if (compact) 16.dp else 20.dp))
            .background(colors.surface)
            .padding(horizontal = if (compact) 14.dp else 18.dp, vertical = if (compact) 8.dp else 10.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                time,
                color = colors.textPrimary,
                fontSize = if (compact) 32.sp else 42.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
            )
            Spacer(Modifier.weight(1f))
            Text(
                dateLine,
                color = colors.textSecondary,
                fontSize = if (compact) 11.sp else 13.sp,
                modifier = Modifier.padding(bottom = if (compact) 5.dp else 8.dp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            lunarLine,
            color = colors.amber,
            fontSize = if (compact) 11.sp else 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
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
    val numSize = when {
        heroSize >= 250.dp -> 92.sp
        heroSize >= 190.dp -> 64.sp
        else -> 48.sp
    }
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(heroSize)) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = if (heroSize >= 220.dp) 20.dp.toPx() else 14.dp.toPx()
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
                fontSize = numSize,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                lineHeight = numSize,
            )
            Text(
                "km/h",
                color = colors.textSecondary,
                fontSize = if (heroSize >= 250.dp) 17.sp else 12.sp,
                fontWeight = FontWeight.Medium,
            )
            if (!gearLabel.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Box(
                    Modifier.clip(CircleShape).background(colors.surfaceVariant).padding(horizontal = 10.dp, vertical = 2.dp),
                ) {
                    Text(gearLabel, color = colors.cyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
private fun MediaFrame(
    vm: DashboardViewModel,
    colors: FmmsColors,
    s: FmmsStrings,
    frameHeight: Dp?,
    mode: String,
    onModeChange: (String) -> Unit,
    isFull: Boolean,
    onToggleFull: () -> Unit,
) {
    val context = LocalContext.current
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
        // Header: ba chip chuyển chế độ
        Row(verticalAlignment = Alignment.CenterVertically) {
            ModeChip(s.mediaAppTab, mode == "app", colors) { onModeChange("app") }
            Spacer(Modifier.width(8.dp))
            ModeChip(s.mediaWebTab, mode == "web", colors) { onModeChange("web") }
            Spacer(Modifier.width(8.dp))
            ModeChip(s.mediaMapTab, mode == "map", colors) { onModeChange("map") }
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
        } else if (mode == "web") {
            WebPane(colors, s)
        } else {
            MapPane(vm, colors, s, isFull = isFull, onToggleFull = onToggleFull)
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

/** Trang mở mặc định khi chưa từng nhập URL nào trong khung WEB. */
private const val DEFAULT_WEB_URL = "https://fmms.vercel.app/"

private val WEB_BOOKMARKS = listOf(
    "FMMS" to "https://fmms.vercel.app/",
    "YouTube" to "https://m.youtube.com",
    "Google" to "https://www.google.com",
    "VnExpress" to "https://vnexpress.net",
    "Tuổi Trẻ" to "https://tuoitre.vn",
    "Wikipedia" to "https://vi.wikipedia.org",
)

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WebPane(colors: FmmsColors, s: FmmsStrings) {
    var input by rememberSaveable { mutableStateOf(AppContainer.prefs.getLastWebUrl() ?: DEFAULT_WEB_URL) }
    var currentUrl by rememberSaveable { mutableStateOf(AppContainer.prefs.getLastWebUrl() ?: DEFAULT_WEB_URL) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    var barVisible by rememberSaveable { mutableStateOf(true) }
    val focusManager = LocalFocusManager.current

    fun submit(raw: String) {
        val url = raw.trim()
        if (url.isEmpty()) return
        val full = if (url.startsWith("http://") || url.startsWith("https://")) url else "https://$url"
        input = full
        currentUrl = full
        AppContainer.prefs.setLastWebUrl(full)
        // điều hướng ngay trên WebView đang có (không tạo lại)
        webView?.loadUrl(full)
        // Đã vào trang thì cuộn thanh địa chỉ + bookmark để WebView tràn khung
        barVisible = false
        focusManager.clearFocus()
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.loadsImagesAutomatically = true
                    // Co trang theo đúng bề rộng khung + cho phóng to bằng cử chỉ
                    settings.useWideViewPort = true
                    settings.loadWithOverviewMode = true
                    settings.builtInZoomControls = true
                    settings.displayZoomControls = false
                    // Giữ mọi link http(s) trong khung; CHẶN intent:// market://... để
                    // các trang như YouTube không ép mở app ngoài.
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean {
                            val scheme = request?.url?.scheme ?: return false
                            return !(scheme.equals("http", true) || scheme.equals("https", true))
                        }
                    }
                    loadUrl(currentUrl)
                }.also { webView = it }
            },
            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
        )

        if (barVisible) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(colors.background),
            ) {
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
                Spacer(Modifier.height(6.dp))

                // Dải bookmark nhanh
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    WEB_BOOKMARKS.forEach { (label, url) ->
                        Box(
                            Modifier
                                .clip(CircleShape)
                                .background(colors.surfaceVariant)
                                .combinedClickable(onClick = { submit(url) })
                                .padding(horizontal = 12.dp, vertical = 5.dp),
                        ) {
                            Text(
                                label,
                                color = if (currentUrl == url) colors.cyan else colors.textSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        } else {
            // Nút mở lại thanh địa chỉ khi đang xem tràn màn hình
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 8.dp, end = 8.dp)
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(colors.surface.copy(alpha = 0.85f))
                    .combinedClickable(onClick = { barVisible = true }),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Language, "Show address bar", tint = colors.textPrimary, modifier = Modifier.size(20.dp))
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose { webView?.destroy(); webView = null }
    }
}

// ---------------------------------------------------------------------
// Khung MAP: OpenStreetMap miễn phí (osmdroid), chấm vị trí + vệt hành trình
// ---------------------------------------------------------------------

/** Gom các đối tượng osmdroid cần cập nhật runtime. */
private class MapHolder(
    val map: org.osmdroid.views.MapView,
    val marker: org.osmdroid.views.overlay.Marker,
    val trail: org.osmdroid.views.overlay.Polyline,
    val myLoc: org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay,
    val routeLine: org.osmdroid.views.overlay.Polyline,
    val destMarker: org.osmdroid.views.overlay.Marker,
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MapPane(
    vm: DashboardViewModel,
    colors: FmmsColors,
    s: FmmsStrings,
    isFull: Boolean,
    onToggleFull: () -> Unit,
) {
    val context = LocalContext.current
    var holder by remember { mutableStateOf<MapHolder?>(null) }
    var follow by rememberSaveable { mutableStateOf(true) }
    var route by remember { mutableStateOf<OsrmRoute?>(null) }
    var destPoint by remember { mutableStateOf<GeoPoint?>(null) }
    var navigating by remember { mutableStateOf(false) }
    var stepIdx by remember { mutableStateOf(0) }
    // (nội dung rẽ, khoảng cách còn lại)
    var banner by remember { mutableStateOf<Pair<String, String>?>(null) }
    var query by remember { mutableStateOf("") }
    var searching by remember { mutableStateOf(false) }
    var nightStyle by rememberSaveable { mutableStateOf(AppContainer.prefs.getMapStyle() != "day") }
    var toastMsg by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val rerouting = remember { java.util.concurrent.atomic.AtomicBoolean(false) }
    val onMapTap = remember { mutableStateOf<(GeoPoint) -> Unit>({}) }
    var tts by remember { mutableStateOf<android.speech.tts.TextToSpeech?>(null) }

    DisposableEffect(Unit) {
        val t = android.speech.tts.TextToSpeech(context) {}
        tts = t
        onDispose {
            t.stop()
            t.shutdown()
            tts = null
        }
    }

    fun speak(text: String) {
        val t = tts ?: return
        try {
            t.setLanguage(if (s.isVietnamese) java.util.Locale("vi", "VN") else java.util.Locale.US)
            t.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "fmms_nav")
        } catch (_: Exception) {
        }
    }

    fun applyStyle(map: org.osmdroid.views.MapView, night: Boolean) {
        if (night) {
            map.setTileSource(cartoDarkSource())
            applyNightLift(map)
        } else {
            map.overlayManager.tilesOverlay.setColorFilter(null)
            map.setTileSource(cartoVoyagerSource())
        }
        map.invalidate()
    }

    fun clearRoute() {
        route = null
        destPoint = null
        navigating = false
        banner = null
        stepIdx = 0
        tts?.stop()
        holder?.let { h ->
            h.routeLine.isEnabled = false
            h.destMarker.isEnabled = false
            h.map.invalidate()
        }
    }

    fun startNav() {
        val r = route ?: return
        navigating = true
        follow = true
        stepIdx = 0
        r.steps.firstOrNull()?.let {
            banner = it.text to fmtDist(it.meters)
            speak(it.text)
        }
        holder?.map?.controller?.zoomTo(18.5)
    }

    fun stopNav() {
        navigating = false
        banner = null
        tts?.stop()
        holder?.map?.controller?.zoomTo(17.0)
    }

    fun submitSearch() {
        val q = query.trim()
        if (q.isEmpty() || searching) return
        searching = true
        scope.launch {
            val gp = geocode(q)
            searching = false
            if (gp == null) {
                toastMsg = s.addrNotFound
            } else {
                query = ""
                onMapTap.value(gp)
            }
        }
    }

    // Mỗi lần có vị trí mới khi đang dẫn đường: kiểm tra lạc đường + bước rẽ tiếp theo
    fun navTick(r: OsrmRoute, gp: GeoPoint) {
        val next = stepIdx + 1
        if (next < r.steps.size) {
            val ns = r.steps[next]
            val remain = gp.distanceToAsDouble(ns.location)
            if (remain < 30.0) {
                stepIdx = next
                banner = ns.text to fmtDist(ns.meters)
                speak(ns.text)
            } else if (banner != null) {
                banner = Pair(banner!!.first, fmtDist(remain))
            }
        } else if (gp.distanceToAsDouble(r.points.last()) < 40.0) {
            banner = s.navArrive to ""
            speak(s.navArrive)
            navigating = false
        }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                // Cấu hình osmdroid TRƯỚC khi tạo MapView:
                // user-agent riêng (bắt buộc bởi chính sách tile OSM) + cache app-private.
                val cfg = org.osmdroid.config.Configuration.getInstance()
                cfg.userAgentValue = ctx.packageName
                cfg.osmdroidBasePath = java.io.File(ctx.cacheDir, "osmdroid")

                val map = org.osmdroid.views.MapView(ctx)
                applyStyle(map, nightStyle)
                map.setMultiTouchControls(true)
                map.zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
                map.controller.setZoom(17.0)
                map.controller.setCenter(GeoPoint(21.028, 105.834)) // Hà Nội khi chưa có GPS

                val myLoc = org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay(
                    org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider(ctx), map,
                )
                myLoc.enableMyLocation()
                myLoc.isDrawAccuracyEnabled = true

                // Icon xe = chấm cyan viền trắng vẽ bằng code
                val bmp = android.graphics.Bitmap.createBitmap(28, 28, android.graphics.Bitmap.Config.ARGB_8888)
                val c = android.graphics.Canvas(bmp)
                val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
                    color = android.graphics.Color.WHITE
                }
                c.drawCircle(14f, 14f, 13f, paint)
                paint.color = colors.cyan.toArgb()
                c.drawCircle(14f, 14f, 9f, paint)

                val marker = org.osmdroid.views.overlay.Marker(map).apply {
                    icon = android.graphics.drawable.BitmapDrawable(ctx.resources, bmp)
                    setAnchor(org.osmdroid.views.overlay.Marker.ANCHOR_CENTER, org.osmdroid.views.overlay.Marker.ANCHOR_CENTER)
                    isEnabled = false
                    title = "FMMS"
                }
                val trail = org.osmdroid.views.overlay.Polyline(map).apply {
                    outlinePaint.color = colors.cyan.toArgb()
                    outlinePaint.strokeWidth = 7f
                }
                // Lộ trình chỉ đường màu hổ phách + ghim điểm đến (icon mặc định osmdroid)
                val routeLine = org.osmdroid.views.overlay.Polyline(map).apply {
                    outlinePaint.color = android.graphics.Color.rgb(255, 179, 0)
                    outlinePaint.strokeWidth = 11f
                    isEnabled = false
                }
                val destMarker = org.osmdroid.views.overlay.Marker(map).apply {
                    setAnchor(org.osmdroid.views.overlay.Marker.ANCHOR_BOTTOM, org.osmdroid.views.overlay.Marker.ANCHOR_CENTER)
                    isEnabled = false
                }
                map.overlays.add(trail)
                map.overlays.add(routeLine)
                map.overlays.add(marker)
                map.overlays.add(destMarker)
                map.overlays.add(myLoc)

                // Chạm lên bản đồ = chọn điểm đến → tự chỉ đường từ vị trí xe
                map.overlays.add(
                    org.osmdroid.views.overlay.MapEventsOverlay(object : org.osmdroid.events.MapEventsReceiver {
                        override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                            if (p == null) return false
                            onMapTap.value(p)
                            return true
                        }

                        override fun longPressHelper(p: GeoPoint?): Boolean = false
                    }),
                )

                holder = MapHolder(map, marker, trail, myLoc, routeLine, destMarker)
                map
            },
            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
        )

        // ===== Thanh tìm kiếm kiểu Google Maps =====
        Row(
            Modifier
                .align(Alignment.TopStart)
                .padding(start = 10.dp, end = 10.dp, top = 10.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(colors.surfaceVariant)
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Search, contentDescription = null, tint = colors.cyan, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f)) {
                if (query.isEmpty()) {
                    Text(s.mapSearchHint, color = colors.textSecondary, fontSize = 13.sp, maxLines = 1)
                }
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp, color = colors.textPrimary),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { submitSearch() }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (route != null || query.isNotEmpty()) {
                Spacer(Modifier.width(6.dp))
                Icon(
                    Icons.Filled.Close,
                    contentDescription = "Clear search",
                    tint = colors.textSecondary,
                    modifier = Modifier
                        .size(18.dp)
                        .combinedClickable(onClick = {
                            query = ""
                            clearRoute()
                        }),
                )
            }
        }

        // ===== Cột nút phải kiểu Google Maps =====
        Column(
            Modifier.align(Alignment.BottomEnd).padding(end = 10.dp, bottom = 26.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            MapFab(icon = Icons.Filled.Layers, tint = colors.textPrimary, colors = colors) {
                nightStyle = !nightStyle
                AppContainer.prefs.setMapStyle(if (nightStyle) "night" else "day")
                holder?.let { applyStyle(it.map, nightStyle) }
            }
            MapFab(icon = if (isFull) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen, tint = colors.textPrimary, colors = colors) {
                onToggleFull()
            }
            MapFab(icon = Icons.Filled.MyLocation, tint = if (follow) colors.cyan else colors.textSecondary, colors = colors) {
                follow = !follow
                if (follow) {
                    holder?.let { h ->
                        h.myLoc.myLocation?.let { h.map.controller.animateTo(it) }
                    }
                }
            }
            MapFab(icon = Icons.Filled.Add, tint = colors.textPrimary, colors = colors) {
                holder?.map?.controller?.zoomIn()
            }
            MapFab(icon = Icons.Filled.Remove, tint = colors.textPrimary, colors = colors) {
                holder?.map?.controller?.zoomOut()
            }
        }

        // ===== Banner chỉ đạo đường (khi đang dẫn đường) =====
        banner?.let { b ->
            Row(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 54.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(colors.surfaceVariant)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Navigation, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(b.second, color = colors.textPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.width(8.dp))
                Text(
                    b.first,
                    color = colors.textPrimary,
                    fontSize = 13.sp,
                    maxLines = 2,
                    modifier = Modifier.widthIn(max = 300.dp),
                )
            }
        }

        // ===== Thẻ lộ trình dưới cùng =====
        route?.let { r ->
            if (!navigating) {
                Row(
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 26.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(colors.surfaceVariant)
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Navigation, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        String.format("%.1f km • %.0f %s", r.km, r.minutes, if (s.isVietnamese) "phút" else "min"),
                        color = colors.textPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.width(10.dp))
                    // Nút bắt đầu dẫn đường
                    Box(
                        Modifier
                            .clip(CircleShape)
                            .background(Color(0xFF14243A))
                            .combinedClickable(onClick = { startNav() })
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(3.dp))
                            Text(s.navStart, color = Color(0xFFFFB300), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        Icons.Filled.Close,
                        contentDescription = "Clear route",
                        tint = colors.textSecondary,
                        modifier = Modifier
                            .size(20.dp)
                            .combinedClickable(onClick = { clearRoute() }),
                    )
                }
            } else {
                // Nút kết thúc dẫn đường
                Row(
                    Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 26.dp)
                        .clip(CircleShape)
                        .background(colors.surfaceVariant)
                        .combinedClickable(onClick = { stopNav() })
                        .padding(horizontal = 16.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Close, contentDescription = null, tint = colors.red, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(s.navStop, color = colors.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        toastMsg?.let { msg ->
            LaunchedEffect(msg) {
                android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_SHORT).show()
                toastMsg = null
            }
        }

        // Attribution bắt buộc của OpenStreetMap/CARTO
        Text(
            "© OpenStreetMap © CARTO",
            color = colors.textSecondary,
            fontSize = 9.sp,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 10.dp, bottom = 6.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(colors.surface.copy(alpha = 0.75f))
                .padding(horizontal = 5.dp, vertical = 1.dp),
        )
    }

    // Tap trên map hoặc tìm kiếm = đặt đích → gọi OSRM vẽ lộ trình
    LaunchedEffect(Unit) {
        val handler: (GeoPoint) -> Unit = handlerFun@{ gp ->
            val h = holder ?: return@handlerFun
            destPoint = gp
            h.destMarker.position = gp
            h.destMarker.isEnabled = true
            h.destMarker.title = s.destPin
            h.map.invalidate()
            banner = null
            stepIdx = 0
            scope.launch {
                val st = vm.uiState.value.telemetry
                val sLat = st.latitude
                val sLng = st.longitude
                if (sLat == null || sLng == null) {
                    toastMsg = s.routeNoPath
                    return@launch
                }
                searching = true
                val result = fetchRoute(sLat to sLng, gp, s.isVietnamese)
                searching = false
                if (result == null) {
                    toastMsg = s.routeNoPath
                } else {
                    route = result
                    h.routeLine.setPoints(result.points)
                    h.routeLine.isEnabled = true
                    h.map.invalidate()
                }
            }
        }
        onMapTap.value = handler
    }

    // Cập nhật marker/vệt chạy theo telemetry + logic dẫn đường
    holder?.let { h ->
        LaunchedEffect(h, follow) {
            vm.uiState.collect { st ->
                val lat = st.telemetry.latitude ?: return@collect
                val lng = st.telemetry.longitude ?: return@collect
                val gp = GeoPoint(lat, lng)
                h.marker.position = gp
                h.marker.isEnabled = true
                val last = h.trail.actualPoints.lastOrNull() as? GeoPoint
                if (last == null || last.distanceToAsDouble(gp) > 5.0) {
                    h.trail.addPoint(gp)
                }
                if (follow) h.map.controller.animateTo(gp)

                val r = route
                if (navigating && r != null && !rerouting.get()) {
                    val dNear = nearestDistMeters(r.points, gp)
                    val dst = destPoint
                    if (dNear > 70.0 && dst != null && rerouting.compareAndSet(false, true)) {
                        // Lạc đường >70 m → tính lại lộ trình lặng lẽ
                        scope.launch {
                            val fresh = fetchRoute(gp.latitude to gp.longitude, dst, s.isVietnamese)
                            rerouting.set(false)
                            if (fresh != null) {
                                route = fresh
                                h.routeLine.setPoints(fresh.points)
                                h.routeLine.isEnabled = true
                                stepIdx = 0
                                fresh.steps.firstOrNull()?.let { f0 ->
                                    banner = f0.text to fmtDist(f0.meters)
                                    speak(f0.text)
                                }
                                h.map.invalidate()
                            }
                        }
                    } else {
                        navTick(r, gp)
                    }
                }
            }
        }
    }
}

/** Một bước rẽ trong lộ trình. */
private class NavStep(val location: GeoPoint, val meters: Double, val text: String)

/** Lộ trình OSRM: điểm geometry + tổng quãng đường/thời gian + các bước rẽ. */
private class OsrmRoute(val points: List<GeoPoint>, val km: Double, val minutes: Double, val steps: List<NavStep>)

/**
 * Gọi OSRM miễn phí (FOSSGIS trước, demo server dự phòng) lấy lộ trình lái xe
 * kèm từng bước rẽ (steps=true). Trả về null nếu lỗi/mất mạng.
 */
private suspend fun fetchRoute(
    start: Pair<Double, Double>,
    end: GeoPoint,
    vn: Boolean,
): OsrmRoute? = withContext(Dispatchers.IO) {
    val servers = listOf(
        "https://routing.openstreetmap.de/routed-car",
        "https://router.project-osrm.org",
    )
    for (base in servers) {
        try {
            val url = "$base/route/v1/driving/" +
                "${start.second},${start.first};${end.longitude},${end.latitude}" +
                "?overview=full&geometries=geojson&steps=true"
            val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 12000
            conn.setRequestProperty("User-Agent", "fmms-carlogger")
            @Suppress("BlockingMethodInNonTransactionalContext")
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            val json = org.json.JSONObject(body)
            val routeJ = json.getJSONArray("routes").getJSONObject(0)
            val coords = routeJ.getJSONObject("geometry").getJSONArray("coordinates")
            val pts = ArrayList<GeoPoint>(coords.length())
            for (i in 0 until coords.length()) {
                val cxy = coords.getJSONArray(i)
                pts.add(GeoPoint(cxy.getDouble(1), cxy.getDouble(0)))
            }
            val steps = ArrayList<NavStep>()
            val legs = routeJ.getJSONArray("legs")
            if (legs.length() > 0) {
                val stepsJ = legs.getJSONObject(0).getJSONArray("steps")
                for (i in 0 until stepsJ.length()) {
                    val st = stepsJ.getJSONObject(i)
                    val man = st.optJSONObject("maneuver") ?: continue
                    val locA = man.getJSONArray("location")
                    steps.add(
                        NavStep(
                            GeoPoint(locA.getDouble(1), locA.getDouble(0)),
                            st.getDouble("distance"),
                            osrmStepText(st, vn),
                        ),
                    )
                }
            }
            return@withContext OsrmRoute(
                pts,
                routeJ.getDouble("distance") / 1000.0,
                routeJ.getDouble("duration") / 60.0,
                steps,
            )
        } catch (_: Exception) {
            continue
        }
    }
    null
}

/** Đổi một bước maneuver của OSRM thành câu chỉ dẫn tiếng Việt/Anh. */
private fun osrmStepText(step: org.json.JSONObject, vn: Boolean): String {
    val m = step.optJSONObject("maneuver")
    val type = m?.optString("type") ?: ""
    val mod = m?.optString("modifier") ?: ""
    val name = step.optString("name", "")
    val onto = if (name.isBlank()) "" else if (vn) " vào $name" else " onto $name"
    return when (type) {
        "depart" -> if (vn) "Xuất phát$onto" else "Start$onto"
        "arrive" -> if (vn) "Đến nơi" else "You have arrived"
        "turn", "end of road" -> when (mod) {
            "left" -> if (vn) "Rẽ trái$onto" else "Turn left$onto"
            "right" -> if (vn) "Rẽ phải$onto" else "Turn right$onto"
            "slight left" -> if (vn) "Chếch trái$onto" else "Bear left$onto"
            "slight right" -> if (vn) "Chếch phải$onto" else "Bear right$onto"
            "sharp left" -> if (vn) "Quẹo gắt trái$onto" else "Sharp left$onto"
            "sharp right" -> if (vn) "Quẹo gắt phải$onto" else "Sharp right$onto"
            "uturn" -> if (vn) "Quay đầu" else "Make a U-turn"
            else -> if (vn) "Tiếp tục$onto" else "Continue$onto"
        }
        "continue" -> if (mod == "uturn") if (vn) "Quay đầu" else "Make a U-turn"
        else if (vn) "Tiếp tục$onto" else "Continue$onto"
        "new name" -> if (vn) "Đi tiếp$onto" else "Continue$onto"
        "merge" -> if (vn) "Nhập làn$onto" else "Merge$onto"
        "fork" -> when (mod) {
            "left" -> if (vn) "Đi nhánh trái$onto" else "Keep left$onto"
            "right" -> if (vn) "Đi nhánh phải$onto" else "Keep right$onto"
            else -> if (vn) "Đi theo nhánh$onto" else "Follow the fork$onto"
        }
        "roundabout", "rotary" -> if (vn) "Vào vòng xâu$onto" else "Take the roundabout$onto"
        else -> if (vn) "Tiếp tục$onto" else "Continue$onto"
    }
}

/** "350 m" nếu < ~1 km, ngược lại "1.2 km". */
private fun fmtDist(meters: Double): String =
    if (meters < 950.0) String.format("%.0f m", meters) else String.format("%.1f km", meters / 1000.0)

/** Khoảng cách gần nhất từ p tới danh sách điểm polyline (xấp xỉ điểm-điểm). */
private fun nearestDistMeters(pts: List<GeoPoint>, p: GeoPoint): Double {
    var best = Double.MAX_VALUE
    for (q in pts) {
        val d = q.distanceToAsDouble(p)
        if (d < best) best = d
    }
    return best
}

/** Geocode địa chỉ → toạ độ qua Nominatim (miễn phí, cần User-Agent riêng). */
private suspend fun geocode(query: String): GeoPoint? = withContext(Dispatchers.IO) {
    try {
        val url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
            java.net.URLEncoder.encode(query, "UTF-8")
        val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 12000
        conn.setRequestProperty("User-Agent", "fmms-carlogger")
        @Suppress("BlockingMethodInNonTransactionalContext")
        val body = conn.inputStream.bufferedReader().use { it.readText() }
        conn.disconnect()
        val arr = org.json.JSONArray(body)
        if (arr.length() == 0) null
        else {
            val o = arr.getJSONObject(0)
            GeoPoint(o.getString("lat").toDouble(), o.getString("lon").toDouble())
        }
    } catch (_: Exception) {
        null
    }
}
/** Nguồn tile tối của CARTO (dựa trên dữ liệu OpenStreetMap). */
private fun cartoDarkSource() = org.osmdroid.tileprovider.tilesource.XYTileSource(
    "CARTO_DARK",
    0, 19, 256, ".png",
    arrayOf(
        "https://a.basemaps.cartocdn.com/dark_all/",
        "https://b.basemaps.cartocdn.com/dark_all/",
        "https://c.basemaps.cartocdn.com/dark_all/",
        "https://d.basemaps.cartocdn.com/dark_all/",
    ),
    "© OpenStreetMap contributors © CARTO",
)

/**
 * Nâng tương phản tối đa cho tile CARTO dark: nền #090909 → xám than xanh
 * #2B313D, đường phụ → ~#777F96, đường chính → ~#93A0AD, nhãn trắng giữ trắng.
 * Dốc dốc (scale ~1.8) nên chênh lệch đường/nền rất rõ — dễ nhìn khi lái xe.
 */
private fun applyNightLift(map: org.osmdroid.views.MapView) {
    val lift = android.graphics.ColorMatrix(
        floatArrayOf(
            1.75f, 0f, 0f, 0f, 28f,
            0f, 1.80f, 0f, 0f, 33f,
            0f, 0f, 1.90f, 0f, 44f,
            0f, 0f, 0f, 1f, 0f,
        ),
    )
    map.overlayManager.tilesOverlay.setColorFilter(android.graphics.ColorMatrixColorFilter(lift))
}

/** Tile CARTO Voyager — bản đồ ngày sáng màu, kiểu Google Maps ban ngày. */
private fun cartoVoyagerSource() = org.osmdroid.tileprovider.tilesource.XYTileSource(
    "CARTO_VOYAGER",
    0, 19, 256, ".png",
    arrayOf(
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/",
    ),
    "© OpenStreetMap contributors © CARTO",
)

@Composable
@OptIn(ExperimentalFoundationApi::class)
private fun MapFab(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    colors: FmmsColors,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(colors.surface)
            .combinedClickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
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
    compact: Boolean = false,
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
            .clip(RoundedCornerShape(if (compact) 16.dp else 20.dp))
            .background(colors.surface)
            .padding(horizontal = if (compact) 12.dp else 16.dp, vertical = if (compact) 8.dp else 12.dp),
        verticalArrangement = Arrangement.spacedBy(if (compact) 3.dp else 6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${s.odometerLbl} ${odoSavedKm?.let { fmtKm(it) } ?: "—"} km",
                color = colors.textPrimary, fontSize = if (compact) 13.sp else 15.sp, fontWeight = FontWeight.Bold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (odoLiveKm != null && odoLiveKm.isFinite()) {
                Text(" • ${fmtKm(odoLiveKm)}", color = colors.textSecondary,
                    fontSize = if (compact) 10.sp else 12.sp, maxLines = 1)
            }
            Spacer(Modifier.weight(1f))
            GpsDot(gpsColor, gpsAccuracy, s.accuracyLbl, colors, compact)
        }
        Row {
            Text("${s.distance} ${fmtKm(tripKm)} km", color = colors.textSecondary,
                fontSize = if (compact) 11.sp else 13.sp, maxLines = 1)
            Spacer(Modifier.weight(1f))
            Text("${s.duration} ${formatDuration(tripSeconds)}", color = colors.textSecondary,
                fontSize = if (compact) 11.sp else 13.sp, maxLines = 1)
        }
    }
}

@Composable
private fun GpsDot(color: Color, accuracy: Double?, label: String, colors: FmmsColors, compact: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(color))
        Text(
            if (accuracy != null) " $label ±${accuracy.toInt()}m" else " GPS —",
            color = colors.textSecondary,
            fontSize = if (compact) 9.sp else 11.sp,
            maxLines = 1,
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
