package com.fmms.carlogger.core.input

import android.content.Context
import android.content.Intent
import android.media.session.MediaSession
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent

/**
 * Probe (bản debug): ghi lại phím trung gian phát qua MediaSession khi người
 * dùng bấm nút vô lăng — để xác định mã phím thật trước khi làm tính năng
 * thoại trên vô lăng.
 */
class KeyProbe(private val context: Context) {

    private var session: MediaSession? = null

    fun start() {
        if (session != null) return
        val s = MediaSession(context, "fmms-keyprobe")
        s.setCallback(object : MediaSession.Callback() {
            override fun onMediaButtonEvent(mediaButtonIntent: Intent): Boolean {
                val ke: KeyEvent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT, KeyEvent::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT)
                }
                android.util.Log.d(
                    "SteerWheel",
                    "mediaButton key=${ke?.keyCode} a=${ke?.action} rep=${ke?.repeatCount}",
                )
                return super.onMediaButtonEvent(mediaButtonIntent)
            }

            override fun onPlay() = log("onPlay")
            override fun onPause() = log("onPause")
            override fun onStop() = log("onStop")
            override fun onSkipToNext() = log("onSkipToNext")
            override fun onSkipToPrevious() = log("onSkipToPrevious")
            override fun onSeekTo(pos: Long) = log("onSeekTo $pos")

            override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) =
                log("onPlayFromMediaId $mediaId")

            override fun onPlayFromSearch(query: String?, extras: Bundle?) =
                log("onPlayFromSearch $query")
        })
        s.isActive = true
        session = s
    }

    private fun log(msg: String) {
        android.util.Log.d("SteerWheel", msg)
    }

    fun stop() {
        session?.isActive = false
        session?.release()
        session = null
    }
}