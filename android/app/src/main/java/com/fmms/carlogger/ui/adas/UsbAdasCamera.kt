package com.fmms.carlogger.ui.adas

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.SurfaceTexture
import android.graphics.Matrix
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.hardware.usb.UsbRequest
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Surface
import android.view.TextureView
import com.sensornotes.xiaozhi.usb.UvcNative
import java.nio.ByteBuffer

/**
 * Đọc USB camera ngoài qua libuvccamera native (libuvcjni + libusb1.0 lấy từ app lily).
 * Luồng:
 *  1. Quét UsbManager tìm device có interface class 14 (UVC Video)
 *  2. Xin quyền USB (UsbManager.requestPermission)
 *  3. nativeOpen(fd) → handle libuvc
 *  4. nativeFormats → thử lần lượt cho đến khi nativeStart trả 0
 *  5. Thread grab: nativeGrab → nếu pixel format == 1 (MJPEG) decode BitmapFactory,
 *     ngược lại copy RGBA trực tiếp
 *  6. Callback [onFrame] ném Bitmap cho AdasVisionProcessor; vẽ lên TextureView preview.
 */
class UsbAdasCamera(
    private val context: Context,
    private val onFrame: (Bitmap) -> Unit,
    private val onStatus: (String) -> Unit,
    private val onCameraReady: (Boolean) -> Unit
) {

    companion object {
        private const val TAG = "UsbAdasCamera"
        private const val ACTION_PERMISSION = "com.fmms.carlogger.USB_PERMISSION_UVC"
        private const val USB_CLASS_VIDEO = 14 // UVC Video Class
    }

    // ── UsbManager ──
    private var usbManager: UsbManager? = null
    private var permissionReceiver: UsbPermissionReceiver? = null

    // ── Device / connection ──
    private var device: UsbDevice? = null
    private var connection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var usbEndpointIn: UsbEndpoint? = null
    private var usbRequest: UsbRequest? = null

    // ── libuvc handle ──
    private var uvcHandle: Long = 0L
    private var isStreaming = false

    // ── Thread thực hiện ──
    private var backgroundLooper: android.os.HandlerThread? = null
    private var backgroundHandler: Handler? = null
    private var grabThread: Thread? = null

    // Delegate chạy ADAS (TFLite nặng) trên executor riêng, không nghẽn UI.
    private val visionExecutor = java.util.concurrent.Executors.newSingleThreadExecutor { r ->
        Thread(r, "UsbVisionWorker").apply { isDaemon = true }
    }
    // Drop-frame: nếu frame trước chưa xử lý xong thì bỏ frame mới (tránh queue phình, OOM)
    private val visionBusy = java.util.concurrent.atomic.AtomicBoolean(false)

    private val mainHandler = Handler(Looper.getMainLooper())
    private var running = false
    private var released = false

    private val formats = mutableListOf<UvcFormat>()
    private var formatIndex = 0
    private var currentFormat: UvcFormat? = null

    private var previewTexture: TextureView? = null

    data class UvcFormat(val code: Int, val name: String, val width: Int, val height: Int, val fps: Int) {
        override fun toString(): String = "$name ${width}x${height}@$fps (code=$code)"
    }

    fun start() {
        if (released) return
        running = true
        usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager

        val looper = android.os.HandlerThread("UsbAdasCamera").apply { start() }
        backgroundLooper = looper
        backgroundHandler = Handler(looper.looper)

        registerReceiver()

        if (!UvcNative.isAvailable()) {
            mainHandler.post { onStatus("❌ Không nạp được libuvcjni") }
            return
        }

        backgroundHandler?.post(::scanAndOpen)
    }

    private fun registerReceiver() {
        permissionReceiver = UsbPermissionReceiver(this)
        val filter = IntentFilter().apply {
            addAction(ACTION_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            context.registerReceiver(permissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(permissionReceiver, filter)
        }
    }

    fun onUsbDetached(usbDevice: UsbDevice?) {
        val current = device
        if (current == null || usbDevice == null || current.deviceId != usbDevice.deviceId) return
        mainHandler.post {
            onStatus("❌ Camera USB bị rút ra")
        }
        backgroundHandler?.post {
            stopStreamingLocked()
            scanAndOpen()
        }
    }

    fun onUsbAttached() {
        backgroundHandler?.post(::scanAndOpen)
    }

    private fun scanAndOpen() {
        if (!running) return
        val manager = usbManager ?: return
        val deviceList = manager.deviceList
        if (deviceList.isEmpty()) {
            mainHandler.post {
                onStatus("🔍 Đang chờ USB camera...")
                onCameraReady(false)
            }
            return
        }

        // Ưu tiên device có interface class 14 (UVC)
        var found: UsbDevice? = null
        for ((key, usbDevice) in deviceList) {
            for (i in 0 until usbDevice.interfaceCount) {
                val iface = usbDevice.getInterface(i)
                if (iface.interfaceClass == USB_CLASS_VIDEO) {
                    found = usbDevice
                    break
                }
            }
            if (found != null) break
        }
        if (found == null) {
            mainHandler.post {
                onStatus("🔍 Không thấy USB camera UVC")
                onCameraReady(false)
            }
            return
        }

        device = found
        mainHandler.post {
            onStatus("📷 Found: ${found.productName ?: found.deviceName}")
        }

        if (manager.hasPermission(found)) {
            backgroundHandler?.post { openDevice() }
        } else {
            mainHandler.post {
                onStatus("🔐 Xin quyền truy cập USB camera...")
            }
            val pendingIntent = android.app.PendingIntent.getBroadcast(
                context,
                found.deviceId,
                Intent(ACTION_PERMISSION).setPackage(context.packageName),
                if (Build.VERSION.SDK_INT >= 31) android.app.PendingIntent.FLAG_MUTABLE else 0
            )
            try {
                manager.requestPermission(found, pendingIntent)
            } catch (e: Exception) {
                e.printStackTrace()
                mainHandler.post { onStatus("❌ Permission error: ${e.message}") }
            }
        }
    }

    fun onPermissionResult(granted: Boolean) {
        if (!granted) {
            mainHandler.post {
                onStatus("❌ Không được cấp quyền USB")
                onCameraReady(false)
            }
            return
        }
        backgroundHandler?.post { openDevice() }
    }

    private fun openDevice() {
        if (!running) return
        val manager = usbManager ?: return
        val dev = device ?: return
        val conn = manager.openDevice(dev) ?: run {
            mainHandler.post { onStatus("❌ Không mở được device") }
            return
        }
        connection = conn

        // KHÔNG claim interface / negotiate thủ công: để libuvc tự xử lý qua fd
        // (đúng cách lily: chỉ mở connection rồi nativeOpen(fd)). Claim trước
        // sẽ khiến stream_open_ctrl báo Busy (-6).

        val fd = conn.fileDescriptor
        val outErr = IntArray(1)
        val handle = UvcNative().nativeOpen(fd, outErr)
        if (handle == 0L) {
            mainHandler.post {
                onStatus("❌ libuvc mở hỏng: ${UvcNative().nativeStrError(outErr[0])}")
                onCameraReady(false)
            }
            return
        }
        uvcHandle = handle

        // Lấy danh sách định dạng
        val fmtStrings = try { UvcNative().nativeFormats(handle) } catch (e: Throwable) { null }
        formats.clear()
        fmtStrings?.forEach { line ->
            parseFormatLine(line)?.let { formats.add(it) }
        }
        if (formats.isEmpty()) {
            mainHandler.post { onStatus("❌ Thiết bị không khai định dạng nào") }
            return
        }
        mainHandler.post { onStatus("✓ libuvc có ${formats.size} định dạng: ${formats.first()}") }

        // Thử lần lượt cho tới khi start OK
        formatIndex = 0
        backgroundHandler?.post(::tryStartNextFormatLocked)
    }

    private fun parseFormatLine(line: String): UvcFormat? {
        val parts = line.split('|')
        if (parts.size < 5) return null
        val code = parts[0].toIntOrNull() ?: return null
        val name = parts[1]
        val width = parts[2].toIntOrNull() ?: return null
        val height = parts[3].toIntOrNull() ?: return null
        val fps = parts[4].toIntOrNull() ?: return null
        if (width <= 0 || height <= 0) return null
        return UvcFormat(code, name, width, height, fps)
    }

    private fun tryStartNextFormatLocked() {
        if (!running) return
        while (formatIndex < formats.size) {
            val fmt = formats[formatIndex]
            formatIndex++
            val ret = try {
                UvcNative().nativeStart(uvcHandle, fmt.code, fmt.width, fmt.height, fmt.fps)
            } catch (e: Throwable) {
                -1
            }
            if (ret == 0) {
                currentFormat = fmt
                isStreaming = true
                mainHandler.post {
                    onStatus("✓ libuvc • $fmt")
                    onCameraReady(true)
                }
                startGrabThread()
                return
            } else {
                Log.w(TAG, "★ libuvc start $fmt → ${UvcNative().nativeStrError(ret)}")
            }
        }
        mainHandler.post {
            onStatus("❌ Không định dạng nào lên hình")
            onCameraReady(false)
        }
    }

    /**
     * Thread grab frame libuvc — vòng lặp: allocate buffer → nativeGrab → decode.
     */
    private fun startGrabThread() {
        if (grabThread?.isAlive == true) return
        val fmt = currentFormat ?: return
        val buffer = ByteBuffer.allocateDirect(maxOf(fmt.width * fmt.height * 4, 1 shl 20))
        val info = IntArray(4)
        val fmtStr = fmt.toString()

        grabThread = Thread({
            try {
                while (running && isStreaming && !Thread.currentThread().isInterrupted) {
                    val nBytes = try {
                        UvcNative().nativeGrab(uvcHandle, buffer, info, 1002)
                    } catch (e: Throwable) {
                        Thread.sleep(30)
                        continue
                    }

                    var bitmap: Bitmap? = null
                    if (nBytes > 0) {
                        try {
                            buffer.rewind()
                            if (info[2] == 1) {
                                // MJPEG → decode JPEG
                                val raw = ByteArray(nBytes)
                                buffer.get(raw, 0, nBytes)
                                val opts = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.RGB_565 }
                                bitmap = BitmapFactory.decodeByteArray(raw, 0, nBytes, opts)
                            } else if (info[0] > 0 && info[1] > 0) {
                                // Raw RGBA/NV21 handled by native → ARGB_8888
                                bitmap = Bitmap.createBitmap(info[0], info[1], Bitmap.Config.ARGB_8888)
                                bitmap.copyPixelsFromBuffer(buffer)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "frame decode: ${e.message}")
                        }
                        if (bitmap != null) {
                            val bmp = bitmap
                            // Preview vẽ trên main (nhanh), ADAS xử lý trên worker riêng.
                            // Drop-frame khi worker bận → giữ tốc độ ~10-15 fps cho HUD ổn định.
                            mainHandler.post { drawFrame(bmp) }
                            if (visionBusy.compareAndSet(false, true)) {
                                visionExecutor.execute {
                                    try {
                                        onFrame(bmp)
                                    } finally {
                                        visionBusy.set(false)
                                    }
                                }
                            }
                        }
                    } else if (nBytes < 0) {
                        // Lỗi libuvc
                        Thread.sleep(30)
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "grab thread: ${t.message}")
            }
        }, "UvcNativeGrab").apply { isDaemon = true; start() }
    }

    /**
     * Vẽ frame lên TextureView preview (mirror + scale cover — kiểu dashcam).
     */
    fun setPreviewTexture(texture: TextureView) {
        previewTexture = texture
    }

    fun drawFrame(src: Bitmap) {
        val tv = previewTexture ?: return
        if (!tv.isAvailable) return
        val canvas = tv.lockCanvas() ?: return
        try {
            val scale = maxOf(canvas.width.toFloat() / src.width, canvas.height.toFloat() / src.height)
            val matrix = Matrix().apply {
                postScale(scale, scale)
                postTranslate(
                    (canvas.width - src.width * scale) / 2f,
                    (canvas.height - src.height * scale) / 2f
                )
            }
            canvas.drawBitmap(src, matrix, null)
        } catch (e: Exception) {
            // bỏ qua
        } finally {
            tv.unlockCanvasAndPost(canvas)
        }
    }

    private fun stopStreamingLocked() {
        isStreaming = false
        try {
            if (uvcHandle != 0L) {
                UvcNative().nativeStop(uvcHandle)
                UvcNative().nativeClose(uvcHandle)
            }
        } catch (e: Throwable) { }
        uvcHandle = 0L
        try {
            grabThread?.interrupt()
        } catch (e: Throwable) { }
        grabThread = null
        try {
            connection?.let { usbInterface?.let { iface -> it.releaseInterface(iface) } }
        } catch (e: Throwable) { }
        connection?.close()
        connection = null
        usbInterface = null
    }

    fun stop() {
        running = false
        try {
            context.unregisterReceiver(permissionReceiver)
        } catch (e: Exception) { }
        permissionReceiver = null
        backgroundHandler?.post {
            stopStreamingLocked()
            backgroundLooper?.quitSafely()
        }
        try { visionExecutor.shutdownNow() } catch (e: Throwable) { }
    }

    /**
     * Receiver lắng nghe: kết quả quyền USB + attach/detach device.
     */
    private class UsbPermissionReceiver(
        private val camera: UsbAdasCamera
    ) : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_PERMISSION -> {
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    camera.onPermissionResult(granted)
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val dev = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    camera.onUsbAttached()
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val dev = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                    camera.onUsbDetached(dev)
                }
            }
        }
    }
}