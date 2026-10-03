package com.fmms.carlogger.service.reboot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Dịch vụ giữ sống & tự khởi động chuẩn Zestech (tương tự `KikiBootService` và `com.zestech.dvd.service.BootService`).
 *
 * Trên đầu Android Zestech (Nowada `com.nwd.*`), khi tắt máy (ACC OFF), `NwdManagerService`
 * sẽ gọi `forceStopPackage` lên các ứng dụng bên thứ 3. Tuy nhiên, hệ thống sẽ lập tức
 * bind lại các dịch vụ nằm trong `enabled_notification_listeners` chỉ sau ~200ms.
 *
 * Nhờ đó:
 * 1. Gói `com.fmms.carlogger` được gỡ cờ `stopped=true` ngay lập tức.
 * 2. Tiến trình luôn giữ được `BroadcastReceiver` động trong RAM để bắt `ACTION_SCREEN_ON`
 *    và `com.nwd.action.ACTION_MCU_STATE_CHANGE` ngay giây đầu tiên khi bật khóa điện (ACC ON).
 * 3. Có quyền ưu tiên hệ thống để gọi `startForegroundService(TelemetryService)` trên Android 12-14+.
 */
class KeepAliveBootService : NotificationListenerService() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var receiverRegistered = false

    private val wakeupReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val action = intent.action ?: return
            if (action == Intent.ACTION_SCREEN_OFF || action == "com.nwd.ACTION_OS_SLEEP") {
                return
            }
            if (action == "com.nwd.action.ACTION_MCU_STATE_CHANGE") {
                val mcuState = try {
                    Settings.System.getInt(context.contentResolver, "mcu_state", 1)
                } catch (_: Throwable) {
                    1
                }
                // mcu_state = 0 hoặc 3 là đang tắt máy / ngủ đông
                if (mcuState == 0 || mcuState == 3) return
            }
            // Chờ 3 giây sau khi màn hình sáng / MCU thức dậy để camera 360 khởi tạo xong
            mainHandler.postDelayed({
                BootReceiver.ensureStarted(
                    context = applicationContext,
                    reason = "KeepAliveWake:$action",
                    openUiIfColdBoot = false
                )
            }, 3_000L)
        }
    }

    override fun onCreate() {
        super.onCreate()
        registerWakeupReceiver()
        mainHandler.postDelayed({
            BootReceiver.ensureStarted(
                context = applicationContext,
                reason = "KeepAliveBootService.onCreate",
                openUiIfColdBoot = false
            )
        }, 2_000L)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        registerWakeupReceiver()
        mainHandler.postDelayed({
            BootReceiver.ensureStarted(
                context = applicationContext,
                reason = "KeepAliveBootService.onListenerConnected",
                openUiIfColdBoot = false
            )
        }, 1_500L)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Không can thiệp thông báo người dùng; chỉ dùng làm điểm neo giữ tiến trình sống sau ACC OFF.
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // No-op
    }

    private fun registerWakeupReceiver() {
        if (receiverRegistered) return
        try {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_USER_PRESENT)
                addAction(Intent.ACTION_POWER_CONNECTED)
                addAction("com.nwd.action.ACTION_MCU_STATE_CHANGE")
                addAction("com.nwd.ACTION_OS_WAKE_UP")
                addAction("com.nwd.android.ACTION_SYSTEM_AUTO_WAKEUP")
                addAction("android.hardware.usb.action.USB_DEVICE_ATTACHED")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(wakeupReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                registerReceiver(wakeupReceiver, filter)
            }
            receiverRegistered = true
        } catch (t: Throwable) {
            android.util.Log.w("KeepAliveBootService", "registerWakeupReceiver failed", t)
        }
    }

    override fun onDestroy() {
        if (receiverRegistered) {
            try {
                unregisterReceiver(wakeupReceiver)
            } catch (_: Throwable) {}
            receiverRegistered = false
        }
        super.onDestroy()
    }
}
