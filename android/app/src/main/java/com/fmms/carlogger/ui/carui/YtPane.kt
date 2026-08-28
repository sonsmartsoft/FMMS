package com.fmms.carlogger.ui.carui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.fmms.carlogger.ui.theme.FmmsColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Một kết quả tìm kiếm YouTube qua Piped. */
data class YtItem(
    val id: String,
    val title: String,
    val author: String,
    val durationSec: Int,
    val thumbnail: String,
    val views: Long,
    val uploadedDate: String,
)

/** Client API Piped (mở, không khoá, không quảng cáo) với cơ chế fallback nhiều instance. */
object YtApi {
    private val http = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val INSTANCES = listOf(
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.adminforge.de",
        "https://api.piped.private.coffee",
        "https://pipedapi.drgns.space",
    )

    private suspend fun get(path: String): JSONObject? = withContext(Dispatchers.IO) {
        for (base in INSTANCES) {
            try {
                val req = Request.Builder()
                    .url(base + path)
                    .header("User-Agent", "Mozilla/5.0 (Linux; Android 13) FMMS/1.0")
                    .build()
                http.newCall(req).execute().use { resp ->
                    if (resp.isSuccessful) {
                        val body = resp.body?.string()
                        if (!body.isNullOrEmpty()) return@withContext JSONObject(body)
                    }
                }
            } catch (_: Exception) {
                // instance chết/không tới được → thử instance kế tiếp
            }
        }
        null
    }

    suspend fun search(query: String): List<YtItem> {
        val o = get("/search?q=" + java.net.URLEncoder.encode(query, "UTF-8") + "&filter=videos")
            ?: return emptyList()
        val arr = o.optJSONArray("items") ?: return emptyList()
        return (0 until arr.length()).mapNotNull { i ->
            val it = arr.optJSONObject(i) ?: return@mapNotNull null
            val url = it.optString("url", "")
            val id = if (url.startsWith("/watch?v=")) {
                url.removePrefix("/watch?v=").substringBefore('&')
            } else ""
            if (id.isEmpty()) null else YtItem(
                id = id,
                title = it.optString("title", "").trim(),
                author = it.optString("uploaderName", "").trim(),
                durationSec = it.optInt("duration", -1),
                thumbnail = it.optString("thumbnail", ""),
                views = it.optLong("views", -1L),
                uploadedDate = it.optString("uploadedDate", "").trim(),
            )
        }.take(25)
    }

    /** URL HLS phát được cả hình lẫn tiếng của video (qua proxy của Piped). */
    suspend fun hlsOf(id: String): String? {
        val o = get("/streams/$id") ?: return null
        return o.optString("hls", "").takeIf { it.startsWith("http") }
    }
}

private val YtBg = Color(0xFF0F0F0F)
private val YtSurface = Color(0xFF212121)
private val YtField = Color(0xFF272727)
private val YtTextDim = Color(0xFFAAAAAA)

/** Định dạng duration kiểu YouTube: m:ss hoặc h:mm:ss; -1 => LIVE. */
private fun fmtDur(sec: Int): String = when {
    sec < 0 -> "LIVE"
    sec >= 3600 -> "%d:%02d:%02d".format(sec / 3600, sec % 3600 / 60, sec % 60)
    else -> "%d:%02d".format(sec / 60, sec % 60)
}

private fun fmtMs(ms: Long): String {
    if (ms < 0) return "LIVE"
    val s = ms / 1000
    return if (s >= 3600) "%d:%02d:%02d".format(s / 3600, s % 3600 / 60, s % 60)
    else "%d:%02d".format(s / 60, s % 60)
}

/** Lượt xem kiểu tiếng Việt: 1,2 tr / 456 N / 12 lượt xem. */
private fun fmtViews(v: Long): String = when {
    v < 0 -> ""
    v >= 1_000_000 -> "%.1f tr".format(v / 1_000_000.0).replace(".0 tr", " tr") + " lượt xem"
    v >= 1000 -> "${v / 1000} N lượt xem"
    else -> "$v lượt xem"
}

/**
 * Tab YouTube NHÚNG trong app, UI kiểu NewPipe/ZTTube:
 * - Player ExoPlayer riêng với THU PHÓNG THẬT: pinch 2 ngón 1x–4x,
 *   kéo di chuyển khi đã phóng, double-tap bật/tắt zoom, tap hiện/ẩn điều khiển.
 * - Bộ điều khiển tự viết (play/pause + thanh tua) thân thiện màn cảm ứng xe.
 * Không dùng WebView; nguồn dữ liệu Piped (không quảng cáo).
 */
@Composable
fun YtNativePane(colors: FmmsColors) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var query by rememberSaveable { mutableStateOf("") }
    var results by remember { mutableStateOf<List<YtItem>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var playingId by remember { mutableStateOf<String?>(null) }

    // ── Trạng thái thu phóng ──
    var videoScale by remember { mutableStateOf(1f) }
    var offX by remember { mutableStateOf(0f) }
    var offY by remember { mutableStateOf(0f) }
    // ── Điều khiển tự viết ──
    var controlsVisible by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(false) }
    var posMs by remember { mutableStateOf(0L) }
    var durMs by remember { mutableStateOf(0L) }
    var seeking by remember { mutableStateOf(false) }
    var seekPos by remember { mutableStateOf(0f) }

    val player = remember {
        ExoPlayer.Builder(ctx).build().apply {
            setAudioAttributes(
                androidx.media3.common.AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                true,
            )
        }
    }
    DisposableEffect(Unit) { onDispose { player.release() } }

    // Đồng bộ trạng thái phát mỗi 400ms
    LaunchedEffect(playingId) {
        while (true) {
            if (playingId != null) {
                isPlaying = player.isPlaying
                if (!seeking) {
                    posMs = player.currentPosition.coerceAtLeast(0)
                    durMs = if (player.duration > 0) player.duration else 0L
                }
            }
            delay(400)
        }
    }

    fun resetZoom() { videoScale = 1f; offX = 0f; offY = 0f }

    fun doSearch() {
        val q = query.trim()
        if (q.isEmpty()) return
        scope.launch {
            busy = true; err = null
            val r = YtApi.search(q)
            results = r
            if (r.isEmpty()) err = "Không tìm thấy hoặc mạng chậm — thử lại"
            busy = false
        }
    }

    fun play(item: YtItem) {
        scope.launch {
            busy = true; err = null
            val hls = YtApi.hlsOf(item.id)
            if (hls == null) {
                err = "Không lấy được stream video này"
            } else {
                playingId = item.id
                controlsVisible = true
                resetZoom()
                player.setMediaItem(MediaItem.Builder().setUri(hls).setMimeType(MimeTypes.APPLICATION_M3U8).build())
                player.prepare()
                player.playWhenReady = true
            }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().background(YtBg)) {
        // ── Player 16:9: pinch zoom + pan + tap/double-tap ────────────────
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .background(Color.Black)
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        val newScale = (videoScale * zoom).coerceIn(1f, 4f)
                        if (newScale > 1f || videoScale > 1f) {
                            offX += pan.x
                            offY += pan.y
                            // Giới hạn biên theo mức zoom để không kéo tuột mất hình
                            val w = size.width.toFloat()
                            val h = size.height.toFloat()
                            val maxX = (newScale - 1f) * w / 2f
                            val maxY = (newScale - 1f) * h / 2f
                            offX = offX.coerceIn(-maxX, maxX)
                            offY = offY.coerceIn(-maxY, maxY)
                        }
                        videoScale = newScale
                        if (videoScale <= 1.01f) { offX = 0f; offY = 0f }
                    }
                }
                .pointerInput(Unit) {
                    detectTapGestures(
                        onDoubleTap = { if (videoScale > 1.01f) resetZoom() else videoScale = 2f },
                        onTap = { controlsVisible = !controlsVisible },
                    )
                },
        ) {
            AndroidView(
                factory = { c ->
                    PlayerView(c).apply {
                        this.player = player
                        useController = false // tự viết điều khiển để dành toàn bộ vùng cử chỉ
                        resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                        setShutterBackgroundColor(android.graphics.Color.BLACK)
                    }
                },
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = videoScale
                        scaleY = videoScale
                        translationX = offX
                        translationY = offY
                    },
            )

            // Overlay điều khiển khi đang phát
            if (playingId != null && controlsVisible) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(Brush.verticalGradient(listOf(Color(0x66000000), Color.Transparent, Color(0x66000000)))),
                ) {
                    IconButton(
                        onClick = { if (player.isPlaying) player.pause() else player.play() },
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(56.dp)
                            .background(Color(0x99000000), CircleShape),
                    ) {
                        Icon(
                            if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(36.dp),
                        )
                    }
                    Column(Modifier.align(Alignment.BottomCenter).padding(horizontal = 10.dp, vertical = 4.dp)) {
                        androidx.compose.material3.Slider(
                            value = if (durMs > 0) (if (seeking) seekPos else posMs.toFloat()) / durMs else 0f,
                            onValueChange = {
                                seeking = true
                                seekPos = it * durMs
                            },
                            onValueChangeFinished = {
                                if (durMs > 0) player.seekTo(seekPos.toLong())
                                seeking = false
                                posMs = seekPos.toLong()
                            },
                            colors = androidx.compose.material3.SliderDefaults.colors(
                                thumbColor = Color(0xFFFF0000),
                                activeTrackColor = Color(0xFFFF0000),
                                inactiveTrackColor = Color(0x55FFFFFF),
                            ),
                            modifier = Modifier.fillMaxWidth().height(22.dp),
                        )
                        Row(Modifier.fillMaxWidth()) {
                            Text(fmtMs(posMs), color = Color.White, fontSize = 10.sp)
                            Spacer(Modifier.weight(1f))
                            Text(fmtMs(durMs), color = Color.White, fontSize = 10.sp)
                        }
                    }
                    // Chỉ báo mức zoom góc phải trên
                    if (videoScale > 1.01f) {
                        Text(
                            "%.1fx".format(videoScale),
                            color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp)
                                .background(Color(0x99000000), RoundedCornerShape(8.dp))
                                .padding(horizontal = 7.dp, vertical = 2.dp),
                        )
                    }
                }
            }

            if (playingId == null) {
                Column(
                    Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.Filled.PlayArrow, contentDescription = null,
                        tint = Color.White.copy(alpha = 0.85f),
                        modifier = Modifier.size(42.dp),
                    )
                    Text("Tìm và bấm video để phát", color = YtTextDim, fontSize = 12.sp)
                }
            }
        }

        // ── Hàng tiêu đề + gợi ý zoom ──────────────────────────────────────
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                results.firstOrNull { it.id == playingId }?.title
                    ?: if (playingId != null) "Đang phát…" else "YouTube",
                color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            if (videoScale > 1.01f) {
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(YtField)
                        .clickable { resetZoom() }
                        .padding(horizontal = 12.dp, vertical = 5.dp),
                ) {
                    Text("%.1fx — Thu nhỏ".format(videoScale), color = Color.White, fontSize = 12.sp)
                }
            }
        }

        // ── Thanh tìm kiếm kiểu YouTube ────────────────────────────────────
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(22.dp))
                    .background(YtField)
                    .padding(horizontal = 12.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Filled.Search, contentDescription = null,
                    tint = YtTextDim, modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                BasicTextField(
                    value = query,
                    onValueChange = { query = it },
                    singleLine = true,
                    textStyle = TextStyle(color = Color.White, fontSize = 14.sp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { doSearch() }),
                    cursorBrush = Brush.verticalGradient(listOf(Color.White, Color.White)),
                    decorationBox = { inner ->
                        Box(Modifier.fillMaxWidth().height(34.dp), contentAlignment = Alignment.CenterStart) {
                            if (query.isEmpty()) Text(
                                "Tìm trên YouTube", color = YtTextDim, fontSize = 14.sp,
                            )
                            inner()
                        }
                    },
                    modifier = Modifier.weight(1f),
                )
                if (query.isNotEmpty()) {
                    IconButton(onClick = { query = "" }, modifier = Modifier.size(26.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Xoá", tint = YtTextDim, modifier = Modifier.size(16.dp))
                    }
                }
            }
            Spacer(Modifier.width(8.dp))
            Box(
                Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(if (busy) YtField else Color(0xFFFF0000))
                    .clickable(enabled = !busy) { doSearch() },
                contentAlignment = Alignment.Center,
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Filled.Search, contentDescription = "Tìm kiếm", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
        }

        if (err != null) {
            Text(
                err!!, color = Color(0xFFE67E22), fontSize = 11.sp,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
            )
        }

        // ── Danh sách kết quả kiểu NewPipe ─────────────────────────────────
        LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 10.dp)) {
            items(results, key = { it.id }) { item ->
                val isNowPlaying = item.id == playingId
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(if (isNowPlaying) YtSurface else Color.Transparent)
                        .clickable { play(item) }
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        Modifier
                            .width(132.dp)
                            .aspectRatio(16f / 9f)
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFF303030)),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (item.thumbnail.isNotEmpty()) {
                            AsyncImage(
                                model = item.thumbnail,
                                contentDescription = item.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        } else {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                        Text(
                            fmtDur(item.durationSec),
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(4.dp)
                                .background(
                                    if (item.durationSec < 0) Color(0xFFCC0000) else Color(0xB3000000),
                                    RoundedCornerShape(3.dp),
                                )
                                .padding(horizontal = 4.dp, vertical = 1.dp),
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            item.title,
                            color = Color.White, fontSize = 13.sp, lineHeight = 17.sp,
                            maxLines = 2, overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.height(3.dp))
                        val meta = listOf(fmtViews(item.views), item.uploadedDate)
                            .filter { it.isNotEmpty() }
                            .joinToString(" • ")
                        if (meta.isNotEmpty()) Text(
                            meta, color = YtTextDim, fontSize = 11.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis,
                        )
                        if (item.author.isNotEmpty()) Text(
                            item.author, color = YtTextDim, fontSize = 11.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
            if (busy && results.isEmpty()) {
                item {
                    Box(Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(26.dp), strokeWidth = 2.dp, color = Color.White)
                    }
                }
            }
            if (!busy && results.isEmpty() && err == null) {
                item {
                    Column(
                        Modifier.fillMaxWidth().padding(top = 40.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Filled.Search, contentDescription = null,
                            tint = YtTextDim.copy(alpha = 0.5f), modifier = Modifier.size(44.dp),
                        )
                        Spacer(Modifier.height(10.dp))
                        Text("Nhập từ khoá rồi bấm nút đỏ để tìm", color = YtTextDim, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
