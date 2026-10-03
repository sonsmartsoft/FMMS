package com.fmms.carlogger

import android.app.Application
import android.content.Context
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

/**
 * App entry point. Installs a crash logger that appends to a local file so
 * uncaught exceptions can be diagnosed from the ZESTECH without a desktop.
 */
class FmmsApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        installCrashHandler()
        AppContainer.init(applicationContext)
    }

    private fun installCrashHandler() {
        val appContext = applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val dir = File(appContext.getExternalFilesDir(null) ?: appContext.filesDir, "diagnostics")
                if (!dir.exists()) dir.mkdirs()
                val crashFile = File(dir, "crash_log.txt")
                val sw = StringWriter()
                throwable.printStackTrace(PrintWriter(sw))
                val entry = "\n=== ${System.currentTimeMillis()} [${thread.name}] ===\n" +
                    throwable.javaClass.simpleName + ": " + throwable.message + "\n" + sw
                crashFile.appendText(entry)
            } catch (_: Exception) {
            }
            // Trên đầu xe Zestech, khi tắt/bật ACC, Bluetooth/Binder tạm ngắt gây DeadSystemRuntimeException
            // trên worker thread. Không tự sát tiến trình nếu lỗi xảy ra trên background thread.
            val isDeadSystem = throwable.javaClass.simpleName.contains("DeadSystem") ||
                throwable.cause?.javaClass?.simpleName?.contains("DeadSystem") == true
            if (isDeadSystem && thread.name != "main") {
                android.util.Log.w("FmmsApplication", "Ignored transient DeadSystemException on ${thread.name}", throwable)
                return@setDefaultUncaughtExceptionHandler
            }
            // Let the previous handler (or default) terminate the process.
            previous?.uncaughtException(thread, throwable)
                ?: run { android.os.Process.killProcess(android.os.Process.myPid()) }
        }
    }

    companion object {
        fun crashLogPath(context: Context): File {
            val dir = File(context.getExternalFilesDir(null) ?: context.filesDir, "diagnostics")
            return File(dir, "crash_log.txt")
        }
    }
}