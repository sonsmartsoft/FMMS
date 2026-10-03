package com.fmms.carlogger.service.reboot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.data.repository.PrefsStore
import com.fmms.carlogger.service.TelemetryService
import com.fmms.carlogger.ui.MainActivity

/**
 * ZESTECH reboot & ACC Sleep wakeup recovery (spec §40):
 *
 * Đầu xe Zestech (Nowada `com.nwd.*`) thường không cold-boot khi tắt/nổ máy
 * mà vào chế độ ngủ đông (ACC Sleep) và `forceStop` các app bên thứ 3.
 * Khi bật khóa điện (ACC ON), đầu xe phát các tín hiệu:
 * - `com.nwd.action.ACTION_MCU_STATE_CHANGE` / `com.nwd.ACTION_OS_WAKE_UP`
 * - `android.hardware.usb.action.USB_DEVICE_ATTACHED` / `USB_PORT_CHANGED`
 * - `android.intent.action.MEDIA_MOUNTED`
 * - `android.net.conn.CONNECTIVITY_CHANGE`
 * - `android.intent.action.BOOT_COMPLETED` / `LOCKED_BOOT_COMPLETED` (khi cold-boot)
 *
 * Lưu ý quan trọng:
 * - `goAsync()` của Android chỉ cho phép tối đa 10 giây (BROADCAST_FG_TIMEOUT).
 *   Tuyệt đối không delay > 5 giây trong `goAsync()`, nếu không hệ thống sẽ
 *   đánh dấu ANR và giết tiến trình trước khi `TelemetryService` kịp chạy.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        /** Ngắn gọn dưới ngưỡng 10s của BroadcastReceiver.goAsync(). */
        private const val UI_LAUNCH_DELAY_MS = 2_500L

        @Volatile
        private var lastTriggerElapsedMs: Long = 0L

        /**
         * Khởi chạy TelemetryService an toàn (idempotent) khi nhận tín hiệu thức dậy.
         */
        fun ensureStarted(context: Context, reason: String, openUiIfColdBoot: Boolean = false) {
            val appCtx = context.applicationContext
            val prefs = PrefsStore(appCtx)
            if (!prefs.getAutoStart()) return

            val now = SystemClock.elapsedRealtime()
            // Chống spam khi nhiều broadcast (USB + MCU + Media + Network) nổ cùng lúc lúc đề máy
            if (now - lastTriggerElapsedMs < 3_000L && AppContainer.serviceRunning.value) {
                return
            }
            lastTriggerElapsedMs = now

            try {
                AppContainer.init(appCtx)
                AppContainer.startTelemetryService()
                android.util.Log.i("BootReceiver", "Started TelemetryService (reason=$reason)")
            } catch (t: Throwable) {
                try {
                    val service = Intent(appCtx, TelemetryService::class.java)
                    appCtx.startForegroundService(service)
                } catch (e: Throwable) {
                    android.util.Log.w("BootReceiver", "Failed to start TelemetryService (reason=$reason)", e)
                }
            }

            if (openUiIfColdBoot) {
                Handler(Looper.getMainLooper()).postDelayed({
                    try {
                        val ui = Intent(appCtx, MainActivity::class.java).apply {
                            addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK or
                                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                            )
                        }
                        appCtx.startActivity(ui)
                    } catch (e: Throwable) {
                        android.util.Log.w("BootReceiver", "Cannot open UI after wakeup ($reason)", e)
                    }
                }, UI_LAUNCH_DELAY_MS)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val prefs = PrefsStore(context)
        if (!prefs.getAutoStart()) return

        // Nếu là sự kiện MCU của Zestech, kiểm tra trạng thái ngủ (mcuState = 0 hoặc 3 là tắt máy)
        val sysMcuState = try {
            android.provider.Settings.System.getInt(context.contentResolver, "mcu_state", 1)
        } catch (_: Throwable) {
            1
        }
        if (action == "com.nwd.action.ACTION_MCU_STATE_CHANGE" && sysMcuState == 0) {
            return
        }

        val isBootOrWake = action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.nwd.ACTION_OS_WAKE_UP" ||
            action == "com.nwd.action.ACTION_MCU_STATE_CHANGE"

        val pending = goAsync()
        try {
            ensureStarted(context, reason = action, openUiIfColdBoot = isBootOrWake)
        } finally {
            // Giải phóng goAsync() sớm (dưới 3s) để tránh ANR Broadcast Timeout 10s
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    pending.finish()
                } catch (_: Throwable) {}
            }, 3_000L)
        }
    }
}
