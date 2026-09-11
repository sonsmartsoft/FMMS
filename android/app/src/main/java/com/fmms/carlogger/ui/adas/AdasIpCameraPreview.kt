package com.fmms.carlogger.ui.adas

import android.content.Context
import android.graphics.Bitmap
import android.graphics.SurfaceTexture
import android.view.Surface
import android.view.TextureView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import java.util.concurrent.Executors

/**
 * Nguồn camera IP đầu xe qua RTSP (như lily dùng cho camera IP/ONVIF).
 * Phát stream bằng ExoPlayer lên TextureView; tự xuống frame Bitmap định kỳ
 * cho pipeline ADAS (bắt buộc phải có Surface thật thì ExoPlayer mới decode).
 */
@Composable
fun AdasIpCameraPreview(
    rtspUrl: String,
    modifier: Modifier = Modifier,
    onFrame: (Bitmap) -> Unit,
    onStatusChange: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val textureView = remember {
        TextureView(context).apply { alpha = 1f }
    }
    val player = remember { ExoPlayer.Builder(context).build() }
    val grabber = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(rtspUrl, player) {
        var grabbing = true
        var playing = false

        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                when (state) {
                    Player.STATE_BUFFERING -> onStatusChange("📡 RTSP đang đệm...")
                    Player.STATE_READY -> {
                        if (!playing) onStatusChange("✓ RTSP đang phát: $rtspUrl")
                        playing = true
                    }
                    Player.STATE_ENDED -> onStatusChange("⚠ RTSP kết thúc stream")
                }
            }
        })

        val surfaceListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                val mediaItem = MediaItem.fromUri(rtspUrl)
                player.setMediaItem(mediaItem)
                player.setVideoSurface(Surface(surface))
                player.prepare()
                player.playWhenReady = true

                if (onFrame != { }) {
                    grabber.execute {
                        while (grabbing) {
                            try {
                                // ExoPlayer chỉ decode khi surface còn hiệu lực; TextureView
                                // không có getBitmap nếu texture đã bị hủy → bọc try/catch.
                                val bmp = textureView.getBitmap()
                                if (bmp != null) onFrame(bmp)
                            } catch (_: Exception) {}
                            Thread.sleep(100)
                        }
                    }
                }
            }

            override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}

            override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
                player.setVideoSurface(null)
                return true
            }

            override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
        }

        textureView.surfaceTextureListener = surfaceListener
        if (textureView.isAvailable) {
            surfaceListener.onSurfaceTextureAvailable(textureView.surfaceTexture!!, textureView.width, textureView.height)
        }

        onDispose {
            grabbing = false
            grabber.shutdown()
            player.release()
        }
    }

    AndroidView(
        factory = { textureView },
        modifier = modifier.fillMaxSize()
    )
}