package com.fmms.carlogger.service.reboot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.fmms.carlogger.data.repository.PrefsStore
import com.fmms.carlogger.service.TelemetryService

/**
 * ZESTECH reboot recovery (spec §40):
 * if auto-start enabled, relaunch the telemetry service on BOOT_COMPLETED.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return
        val prefs = PrefsStore(context)
        if (!prefs.getAutoStart()) return
        val service = Intent(context, TelemetryService::class.java)
        context.startForegroundService(service)
    }
}