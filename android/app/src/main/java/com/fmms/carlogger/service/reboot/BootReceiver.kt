package com.fmms.carlogger.service.reboot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.fmms.carlogger.data.repository.PrefsStore
import com.fmms.carlogger.service.TelemetryService

/**
 * ZESTECH reboot recovery (spec §40):
 * if auto-start enabled, relaunch the telemetry service on BOOT_COMPLETED.
 *
 * Chờ vài giây sau boot để camera hành trình (được auto-start ưu tiên trên đầu xe)
 * khởi động trước, rồi mới khởi chạy FMMS — tránh tranh giành CPU/bộ nhớ khi khởi động.
 */
class BootReceiver : BroadcastReceiver() {

    private companion object {
        /** Delay sau boot trước khi khởi chạy FMMS (ms) — để camera hành trình chạy trước. */
        const val BOOT_DELAY_MS = 12_000L
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return
        val prefs = PrefsStore(context)
        if (!prefs.getAutoStart()) return

        // goAsync giữ receiver sống trong lúc delay; chạy trên main looper để
        // không block onReceive (tránh ANR). startForegroundService nằm trong
        // cửa sổ foreground của receiver nên không bị background-start cấm.
        val pending = goAsync()
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                val service = Intent(context, TelemetryService::class.java)
                context.startForegroundService(service)
            } finally {
                pending.finish()
            }
        }, BOOT_DELAY_MS)
    }
}
