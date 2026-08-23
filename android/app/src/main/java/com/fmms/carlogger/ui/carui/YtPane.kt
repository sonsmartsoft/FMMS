package com.fmms.carlogger.ui.carui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.fmms.carlogger.ui.theme.FmmsColors
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Một kết quả tìm kiếm YouTube qua Piped. */
data class YtItem(val id: String, val title: String, val author: String, val durationSec: Int)

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
            )
        }.take(25)
    }

    /** URL HLS phát được cả hình lẫn tiếng của video (qua proxy của Piped). */
    suspend fun hlsOf(id: String): String? {
        val o = get("/streams/$id") ?: return null
        return o.optString("hls", "").takeIf { it.startsWith("http") }
    }
}

/**
 * Tab YouTube NHÚNG hoàn toàn trong app: tìm kiếm + player ExoPlayer riêng.
 * Không dùng WebView (WebView hệ thống của đầu không render được video),
 * không quảng cáo (nguồn Piped), điều khiển play/pause/tua đầy đủ.
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
                player.setMediaItem(MediaItem.Builder().setUri(hls).setMimeType(MimeTypes.APPLICATION_M3U8).build())
                player.prepare()
                player.playWhenReady = true
            }
            busy = false
        }
    }

    Column(Modifier.fillMaxSize().background(Color.Black)) {
        // Player 16:9 trên cùng
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .background(Color.Black),
        ) {
            AndroidView(
                factory = { c ->
                    PlayerView(c).apply {
                        this.player = player
                        useController = true
                        resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS)
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )
            if (playingId == null) {
                Text(
                    "Tìm và bấm bài để phát",
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }

        // Hàng tìm kiếm
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                singleLine = true,
                placeholder = { Text("Tìm nhạc / video…", fontSize = 13.sp) },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { doSearch() }),
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(6.dp))
            Button(onClick = { doSearch() }, enabled = !busy) {
                Icon(Icons.Filled.Search, contentDescription = null, modifier = Modifier.size(18.dp))
            }
        }

        if (err != null) {
            Text(err!!, color = Color(0xFFE67E22), fontSize = 11.sp, modifier = Modifier.padding(horizontal = 10.dp))
        }

        // Danh sách kết quả
        LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 8.dp)) {
            items(results, key = { it.id }) { item ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clickable { play(item) }
                        .padding(horizontal = 10.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(width = 96.dp, height = 54.dp)
                            .background(Color(0xFF222222), RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
                        if (item.durationSec > 0) {
                            Text(
                                "%d:%02d".format(item.durationSec / 60, item.durationSec % 60),
                                color = Color.White,
                                fontSize = 9.sp,
                                modifier = Modifier.align(Alignment.BottomEnd).padding(3.dp),
                            )
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    Column(Modifier.weight(1f)) {
                        Text(item.title, color = Color.White, fontSize = 12.sp, maxLines = 2)
                        Text(item.author, color = Color.White.copy(alpha = 0.55f), fontSize = 10.sp, maxLines = 1)
                    }
                }
            }
            if (busy) {
                item {
                    Box(Modifier.fillMaxWidth().padding(14.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    }
                }
            }
        }
    }
}
