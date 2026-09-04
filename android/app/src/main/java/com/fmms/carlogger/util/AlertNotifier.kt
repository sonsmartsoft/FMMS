package com.fmms.carlogger.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

/**
 * Cảnh báo ngoài giao diện: thông báo + âm thanh khi phát hiện mã lỗi DTC.
 * Dùng channel riêng (IMPORTANCE_HIGH) để user bật/tắt độc lập, kèm âm báo mặc định.
 */
object AlertNotifier {

    private const val CHANNEL_ID = "fmms_dtc_alert"
    private const val NOTIFICATION_ID = 2002

    fun notifyDtc(context: Context, count: Int) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        ensureChannel(context, nm)
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("⚠ Cảnh báo lỗi xe")
            .setContentText("Phát hiện $count mã lỗi (DTC). Kiểm tra màn hình chẩn đoán.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setSound(sound)
            .build()
        nm.notify(NOTIFICATION_ID, notification)
    }

    private fun ensureChannel(context: Context, nm: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Cảnh báo mã lỗi", NotificationManager.IMPORTANCE_HIGH,
            ).apply { setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), null) }
            nm.createNotificationChannel(channel)
        }
    }
}
