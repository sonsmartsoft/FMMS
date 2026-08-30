package com.fmms.carlogger.ui.carui

import android.annotation.SuppressLint
import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.view.Surface
import android.view.SurfaceHolder
import android.view.TextureView
import android.view.SurfaceView
import android.graphics.SurfaceTexture
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.runtime.collectAsState
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Fullscreen
import androidx.activity.compose.BackHandler
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.MyLocation
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
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
fun CarUiScreen(vm: DashboardViewModel, screenVisible: Boolean = true) {
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

    val density = LocalDensity.current
    var rootOrigin by remember { mutableStateOf(Offset.Zero) }
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .background(colors.background)
            .onGloballyPositioned { rootOrigin = it.positionInRoot() },
    ) {
        val isWide = maxWidth >= 560.dp
        // State tab media (APPS/WEB/TPMS) lưu vào prefs: xoay máy làm Activity
        // recreate và hai nhánh layout có saveable-key khác nhau nên
        // rememberSaveable không giữ được giá trị.
        var mediaMode by rememberSaveable {
            mutableStateOf(AppContainer.prefs.getMediaMode().let { m -> if (m == "map") "tpms" else m })
        }
        // Không lưu "cam360" vào prefs: mở lại app sẽ không tự nảy vào camera
        LaunchedEffect(mediaMode) {
            AppContainer.prefs.setMediaMode(if (mediaMode == "cam360") "app" else mediaMode)
        }

        // Web phóng to toàn màn hình (như map trước đây); BACK để thu nhỏ
        var webFull by rememberSaveable { mutableStateOf(AppContainer.prefs.getWebFull()) }
        LaunchedEffect(webFull) { AppContainer.prefs.setWebFull(webFull) }
        BackHandler(enabled = screenVisible && mediaMode == "web" && webFull) { webFull = false }

        // Một WebView duy nhất dùng chung cho chế độ thường và toàn màn hình:
        // đổi nhánh layout chỉ chuyển nó sang container khác, trang không bị tải lại.
        val sharedWeb = remember { mutableStateOf<WebView?>(null) }
        DisposableEffect(Unit) {
            onDispose {
                sharedWeb.value?.destroy()
                sharedWeb.value = null
            }
        }

        // Toàn màn hình: ẩn thanh hệ thống (vuốt nhẹ ở mép để gọi lại).
        // Chỉ áp dụng khi Car UI đang hiển thị; rời tab thì trả lại thanh hệ thống.
        val view = LocalView.current
        DisposableEffect(screenVisible, webFull) {
            val window = (view.context as? android.app.Activity)?.window
            if (window != null) {
                val wantHide = webFull && screenVisible
                WindowCompat.setDecorFitsSystemWindows(window, !wantHide)
                val ctl = WindowInsetsControllerCompat(window, view)
                ctl.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                if (wantHide) ctl.hide(WindowInsetsCompat.Type.systemBars())
                else ctl.show(WindowInsetsCompat.Type.systemBars())
            }
            onDispose { }
        }
        LaunchedEffect(screenVisible) {
            if (!screenVisible) com.fmms.carlogger.ui.carui.WebPip.canEnter = false
        }

        // Vị trí ô chứa web trong layout thường (lớp web nổi sẽ đè đúng chỗ đó)
        var webSlot by remember { mutableStateOf<DpRect?>(null) }
        // Lớp web phải SỐNG LIÊN TỤC kể cả khi đang ở tab APPS/TPMS để nhạc/video
        // không dừng; chỉ đẩy nó ra sau (zIndex âm) cho thẻ khác đè lên.
        var webEverUsed by remember {
            mutableStateOf(AppContainer.prefs.getMediaMode() == "web")
        }
        LaunchedEffect(mediaMode) {
            if (mediaMode == "web") webEverUsed = true
            else if (webFull) webFull = false
        }

        if (isWide) {
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
                        MediaFrame(vm, colors, s, frameHeight = null, mode = mediaMode, onModeChange = { mediaMode = it }, isFull = false, onToggleFull = { webFull = true }, sharedWeb = sharedWeb, onWebSlotBounds = { r ->
                    webSlot = DpRect(
                        left = with(density) { (r.left - rootOrigin.x).toDp() },
                        top = with(density) { (r.top - rootOrigin.y).toDp() },
                        width = with(density) { r.width.toDp() },
                        height = with(density) { r.height.toDp() },
                    )
                })
                    }
                }
                GaugeRow(t.coolantTempC, t.fuelLevelPercent, fuelColor, t.rpm, t.engineLoadPercent, s, colors)
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
                GaugeRow(t.coolantTempC, t.fuelLevelPercent, fuelColor, t.rpm, t.engineLoadPercent, s, colors)
                FooterCard(state.trip.distanceKm, state.trip.durationSeconds, t.odometerSavedKm, t.odometerKm, t.gpsAccuracy, s, colors)
                MediaFrame(vm, colors, s, frameHeight = 320.dp, mode = mediaMode, onModeChange = { mediaMode = it }, isFull = false, onToggleFull = {}, sharedWeb = sharedWeb, onWebSlotBounds = { r ->
                    webSlot = DpRect(
                        left = with(density) { (r.left - rootOrigin.x).toDp() },
                        top = with(density) { (r.top - rootOrigin.y).toDp() },
                        width = with(density) { r.width.toDp() },
                        height = with(density) { r.height.toDp() },
                    )
                })
            }
        }

        // Lớp WebView nổi: WebView chỉ gắn MỘT chỗ duy nhất trong cây View và LUÔN
        // giữ kích thước full — khi thu nhỏ chỉ SCALE hiển thị, không đổi kích thước
        // view nên video (YouTube...) không bao giờ bị dừng khi phóng to/thu nhỏ.
        val webTarget = if (mediaMode == "web" && webFull)
            DpRect(12.dp, 12.dp, maxWidth - 24.dp, maxHeight - 24.dp)
        else webSlot
        if (webEverUsed && webTarget != null) {
            WebOverlayLayer(
                webTarget,
                colors,
                s,
                isFull = webFull,
                onToggleFull = { webFull = !webFull },
                sharedWeb = sharedWeb,
                active = mediaMode == "web",
            )
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
    sharedWeb: androidx.compose.runtime.MutableState<WebView?>,
    /** Báo ra vùng hiển thị web trong layout thường (px, theo gốc Compose). */
    onWebSlotBounds: (androidx.compose.ui.geometry.Rect) -> Unit = {},
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
        // Header: hai chip chuyển chế độ (bỏ 360 — fixture không dùng được)
        Row(verticalAlignment = Alignment.CenterVertically) {
            ModeChip(s.mediaAppTab, mode == "app", colors) { onModeChange("app") }
            Spacer(Modifier.width(8.dp))
            ModeChip(s.mediaWebTab, mode == "web", colors) { onModeChange("web") }
            Spacer(Modifier.width(8.dp))
            ModeChip(s.mediaMapTab, mode == "tpms", colors) { onModeChange("tpms") }
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
            // Ô giữ chỗ: lớp WebView nổi sẽ đè đúng vùng này (giữ video không dừng)
            Box(
                Modifier
                    .fillMaxSize()
                    .onGloballyPositioned { coords ->
                        onWebSlotBounds(coords.boundsInRoot())
                    }
                    .background(colors.background, RoundedCornerShape(12.dp)),
            )
        } else {
            TpmsPane(colors, s)
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

/** Báo cho MainActivity: đang mở khung WEB → rời app thì vào hình trong hình. */
object WebPip {
    @Volatile var canEnter = false
}

/** Trang mở mặc định khi chưa từng nhập URL nào trong khung WEB. */
private const val DEFAULT_WEB_URL = "https://fmms.vercel.app/"

/** App camera 360 (Around View Monitor) cài sẵn trên đầu Android ZESTECH. */
private const val CAM_360_PKG = "com.ivicar.avm"

private val WEB_BOOKMARKS = listOf(
    "FMMS" to "https://fmms.vercel.app/",
    "YouTube" to "https://m.youtube.com",
    "Google" to "https://www.google.com",
    "VnExpress" to "https://vnexpress.net",
    "Tuổi Trẻ" to "https://tuoitre.vn",
    "Wikipedia" to "https://vi.wikipedia.org",
)

/** Hình chữ nhật đơn vị dp cho lớp web nổi. */
private data class DpRect(val left: Dp, val top: Dp, val width: Dp, val height: Dp)

/**
 * Lớp chứa WebView duy nhất của màn hình.
 *
 * WebView giữ NGUYÊN kích thước (một khung lớn cố định) trong mọi chế độ; khi thu
 * về màn nhỏ ta chỉ SCALE ĐỀU hình ảnh bằng graphicsLayer cho vừa ô. Vì WebView
 * không bao giờ bị resize nên trang web (YouTube) không bao giờ relayout — video
 * KHÔNG bị dừng khi phóng/thu, và nút play luôn ở đúng vị trí nên bấm play luôn ăn.
 */
@Composable
private fun WebOverlayLayer(
    target: DpRect,
    colors: FmmsColors,
    s: FmmsStrings,
    isFull: Boolean,
    onToggleFull: () -> Unit,
    sharedWeb: androidx.compose.runtime.MutableState<WebView?>,
    /** false: đang ở tab khác — lớp bị đẩy ra sau, các thẻ đè lên, video vẫn chạy. */
    active: Boolean,
) {
    val left by animateDpAsState(target.left, tween(280), label = "webLeft")
    val top by animateDpAsState(target.top, tween(280), label = "webTop")
    val width by animateDpAsState(target.width, tween(280), label = "webWidth")
    val height by animateDpAsState(target.height, tween(280), label = "webHeight")
    // WebView nội dung luôn giữ MỘT kích thước CỐ ĐỊNH = cỡ fullscreen. Ở fullscreen:
    // scale=1 (nút play to, bấm ăn). Ở mini: scale xuống vừa ô nhỏ. Vì layout KHÔNG
    // BAO GIỜ đổi nên YouTube không relayout → video KHÔNG bị dừng khi phóng/thu;
    // video vẫn tiếp tục phát ở mini (không cần bấm lại), chỉ cần bấm play lần đầu
    // ở fullscreen khi nút play còn to.
    val baseW = with(LocalDensity.current) { 2000.dp }
    val baseH = with(LocalDensity.current) { 1200.dp }
    val sx by animateFloatAsState(if (isFull) 1f else (width / baseW), tween(280), label = "webScaleX")
    val sy by animateFloatAsState(if (isFull) 1f else (height / baseH), tween(280), label = "webScaleY")

    Box(
        Modifier
            .zIndex(if (active || isFull) 1f else -1f)
            .offset(x = left, y = top)
            .size(width, height)
            .clip(RoundedCornerShape(if (isFull) 16.dp else 12.dp)),
    ) {
        // WebView nội dung: kích thước CỐ ĐỊNH, scale đều để vừa ô.
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = sx
                    scaleY = sy
                    val extraW = this.size.width * (1f - sx)
                    val extraH = this.size.height * (1f - sy)
                    translationX = -extraW / 2f
                    translationY = -extraH / 2f
                },
            contentAlignment = Alignment.Center,
        ) {
            Box(Modifier.size(baseW, baseH)) {
                WebPaneContent(colors, s, isFull = isFull, onToggleFull = onToggleFull, sharedWeb = sharedWeb)
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WebPaneContent(
    colors: FmmsColors,
    s: FmmsStrings,
    isFull: Boolean,
    onToggleFull: () -> Unit,
    sharedWeb: androidx.compose.runtime.MutableState<WebView?>,
) {
    // Rời app khi khung WEB đang hiển thị -> cho phép hình trong hình
    DisposableEffect(Unit) {
        WebPip.canEnter = true
        onDispose { WebPip.canEnter = false }
    }
    var input by rememberSaveable { mutableStateOf(AppContainer.prefs.getLastWebUrl() ?: DEFAULT_WEB_URL) }
    var currentUrl by rememberSaveable { mutableStateOf(AppContainer.prefs.getLastWebUrl() ?: DEFAULT_WEB_URL) }
    var barVisible by rememberSaveable { mutableStateOf(AppContainer.prefs.getWebBarVisible()) }
    LaunchedEffect(barVisible) { AppContainer.prefs.setWebBarVisible(barVisible) }
    val focusManager = LocalFocusManager.current

    fun submit(raw: String) {
        val url = raw.trim()
        if (url.isEmpty()) return
        val full = if (url.startsWith("http://") || url.startsWith("https://")) url else "https://$url"
        input = full
        currentUrl = full
        AppContainer.prefs.setLastWebUrl(full)
        // điều hướng ngay trên WebView đang có (không tạo lại)
        sharedWeb.value?.loadUrl(full)
        // Đã vào trang thì cuộn thanh địa chỉ + bookmark để WebView tràn khung
        barVisible = false
        focusManager.clearFocus()
    }

    fun obtain(ctx: android.content.Context): WebView =
        sharedWeb.value ?:         WebView(ctx).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.loadsImagesAutomatically = true
            // Cho phép video play không cần user gesture → không bị autoplay-block
            settings.mediaPlaybackRequiresUserGesture = false
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
        }.also { sharedWeb.value = it }



    Box(Modifier.fillMaxSize()) {
        // WebView đi theo ô, hiển thị ĐÚNG tỉ lệ trang trong ô nhỏ (nút phóng to nằm
        // gọn trong ô). Khi phóng to / thu nhỏ, WebView bị resize nên video có thể
        // tạm ngừng; LaunchedEffect trên sẽ ép phát lại khi thu về màn nhỏ.
        AndroidView(
            factory = { ctx -> android.widget.FrameLayout(ctx) },
            update = { container ->
                val wv = obtain(container.context)
                if (wv.parent !== container) {
                    (wv.parent as? android.view.ViewGroup)?.removeView(wv)
                    container.addView(
                        wv,
                        android.widget.FrameLayout.LayoutParams(
                            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        ),
                    )
                }
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

        // Phóng to / thu nhỏ toàn màn hình (BACK cũng thu nhỏ)
        Box(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 10.dp, end = 10.dp)
                .size(38.dp)
                .clip(CircleShape)
                .background(colors.surface.copy(alpha = 0.85f))
                .combinedClickable(onClick = onToggleFull),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (isFull) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen,
                contentDescription = null,
                tint = colors.textPrimary,
                modifier = Modifier.size(20.dp),
            )
        }
    }

}

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// TPMS — áp suất lốp qua bộ thu USB ZESTECH (chip WCH CH9326)
// ---------------------------------------------------------------------

@Composable
private fun TpmsPane(colors: FmmsColors, s: FmmsStrings) {
    val context = LocalContext.current
    val monitor = remember { com.fmms.carlogger.data.tpms.TpmsMonitor(context.applicationContext) }
    val st by monitor.state.collectAsState()

    DisposableEffect(Unit) {
        monitor.start()
        monitor.queryAllInfo()
        onDispose { monitor.stop() }
    }

    Column(
        Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Hàng trạng thái kết nối
        Row(verticalAlignment = Alignment.CenterVertically) {
            val dotColor = when {
                st.connected -> Color(0xFF2ECC71)
                st.permissionNeeded -> colors.amber
                else -> colors.textSecondary.copy(alpha = 0.4f)
            }
            Box(Modifier.size(8.dp).background(dotColor, CircleShape))
            Spacer(Modifier.width(6.dp))
            Text(
                when {
                    st.connected -> s.tpmsConnected
                    st.permissionNeeded -> s.tpmsNeedPermission
                    else -> s.tpmsNoReceiver
                },
                color = colors.textSecondary,
                fontSize = 11.sp,
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
            if (st.permissionNeeded) {
                Text(
                    s.tpmsAllow,
                    color = colors.cyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { monitor.requestPermissionIfNeeded() }
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
        }

        // Lưới 4 bánh
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(listOf(0, 1), listOf(2, 3)).forEach { row ->
                Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { wheelIdx ->
                        TpmsWheelCard(wheelIdx, st, monitor, colors, s, Modifier.weight(1f).fillMaxHeight())
                    }
                }
            }
        }

        st.learningWheel?.let { w ->
            Text(
                s.tpmsLearningFmt.format(w + 1),
                color = colors.amber,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun TpmsWheelCard(
    wheelIdx: Int,
    st: com.fmms.carlogger.data.tpms.TpmsState,
    monitor: com.fmms.carlogger.data.tpms.TpmsMonitor,
    colors: FmmsColors,
    s: FmmsStrings,
    modifier: Modifier = Modifier,
) {
    val w = st.wheels[wheelIdx]
    val fresh = w != null && System.currentTimeMillis() - w.lastSeenMs < 120_000L
    val warnColor = when {
        w == null || !fresh -> colors.textSecondary
        w.fastLeak || w.slowLeak -> colors.red
        w.lowPressure || w.highPressure || w.highTemp -> colors.amber
        else -> Color(0xFF2ECC71)
    }
    Box(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(colors.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(7.dp).background(if (fresh) warnColor else colors.textSecondary.copy(alpha = 0.35f), CircleShape))
                Spacer(Modifier.width(5.dp))
                Text(
                    s.tpmsWheelNames[wheelIdx],
                    color = colors.textSecondary,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
            }
            if (w == null || !fresh) {
                Text("--", color = colors.textSecondary.copy(alpha = 0.5f), fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text(s.tpmsNoData, color = colors.textSecondary.copy(alpha = 0.5f), fontSize = 9.sp)
            } else {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        String.format(java.util.Locale.US, "%.1f", (w.kPa ?: 0) / 100.0f),
                        color = if (w.lowPressure || w.highPressure || w.fastLeak || w.slowLeak) colors.amber else colors.textPrimary,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.width(3.dp))
                    Text("bar", color = colors.textSecondary, fontSize = 10.sp, modifier = Modifier.padding(bottom = 4.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${w.tempC}°C", color = if (w.highTemp) colors.amber else colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    if (w.battery != null && w.battery > 0) {
                        Spacer(Modifier.width(8.dp))
                        Text("${w.battery}%", color = if (w.lowBattery) colors.red else Color(0xFF2ECC71), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
                val flags = buildList {
                    if (w.fastLeak) add(s.tpmsFastLeak)
                    if (w.slowLeak) add(s.tpmsSlowLeak)
                    if (w.lowPressure) add(s.tpmsLowPress)
                    if (w.highPressure) add(s.tpmsHighPress)
                    if (w.highTemp) add(s.tpmsHighTemp)
                    if (w.lowBattery) add(s.tpmsLowBatt)
                }
                if (flags.isNotEmpty()) {
                    Text(flags.joinToString(" • "), color = colors.amber, fontSize = 8.5.sp, maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun GaugeRow(
    coolantC: Double?,
    fuelPct: Double?,
    fuelColor: Color,
    rpm: Double?,
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
        RpmGaugeCell(rpm, s, colors, Modifier.weight(1f))
        GaugeCell(s.engineLoadLbl, loadPct?.let { "${it.toInt()}" } ?: "—", "%",
            if (loadPct == null) colors.textSecondary else colors.textPrimary, colors, Modifier.weight(1f))
    }
}

/** Ô gauge vòng tua máy: số RPM + thanh tỉ lệ 0–8000 (vàng từ 6000, đỏ từ 6500). */
@Composable
private fun RpmGaugeCell(
    rpm: Double?,
    s: FmmsStrings,
    colors: FmmsColors,
    modifier: Modifier = Modifier,
) {
    val frac = ((rpm ?: 0.0) / 8000.0).coerceIn(0.0, 1.0).toFloat()
    val barColor = when {
        rpm == null -> colors.textSecondary.copy(alpha = 0.4f)
        rpm >= 6500 -> colors.red
        rpm >= 6000 -> colors.amber
        else -> colors.emerald
    }
    val valueColor = when {
        rpm == null -> colors.textSecondary
        rpm >= 6500 -> colors.red
        rpm >= 6000 -> colors.amber
        else -> colors.textPrimary
    }
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surface)
            .padding(vertical = 10.dp, horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(s.rpm, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(rpm?.let { "${it.toInt()}" } ?: "—", color = valueColor, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("rpm", color = colors.textSecondary, fontSize = 11.sp, modifier = Modifier.padding(start = 2.dp, bottom = 2.dp))
        }
        Box(
            Modifier
                .padding(top = 4.dp)
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(colors.textSecondary.copy(alpha = 0.15f)),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(frac)
                    .height(4.dp)
                    .background(barColor),
            )
        }
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

