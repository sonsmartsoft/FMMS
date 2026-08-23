package com.fmms.carlogger.core.usb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager

/**
 * Driver tối giản cho chip WCH CH9326 dùng trong bộ thu TPMS ZESTECH (VID 0x1A86).
 * Giao thức UART-over-HID: mỗi gói bulk 32 byte gồm 1 byte độ dài rồi payload.
 */
class Ch9326Uart(private val context: Context) {

    companion object {
        const val VENDOR_ID = 0x1A86
        val PRODUCT_IDS = intArrayOf(0xE010, 0x7513, 0x5523)
        private const val ACTION_PERMISSION = "com.fmms.carlogger.usb.TPMS_PERMISSION"
        private const val TIMEOUT_MS = 2000
    }

    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var device: UsbDevice? = null
    private var connection: UsbDeviceConnection? = null
    private var intf: UsbInterface? = null
    private var epIn: UsbEndpoint? = null
    private var epOut: UsbEndpoint? = null

    var permissionRequested = false
        private set

    fun findDevice(): UsbDevice? =
        usbManager.deviceList.values.firstOrNull {
            it.vendorId == VENDOR_ID && PRODUCT_IDS.contains(it.productId)
        }

    fun hasPermission(): Boolean = findDevice()?.let { usbManager.hasPermission(it) } ?: false

    fun requestPermission() {
        val dev = findDevice() ?: return
        if (permissionRequested && !hasPermission()) return
        permissionRequested = true
        runCatching {
            // PendingIntent bắt buộc MUTABLE từ Android 12 để hệ thống ghi thêm kết quả
            val pi = PendingIntent.getBroadcast(
                context,
                0,
                Intent(ACTION_PERMISSION).setPackage(context.packageName),
                PendingIntent.FLAG_MUTABLE,
            )
            usbManager.requestPermission(dev, pi)
        }.onFailure {
            android.util.Log.e("Ch9326Uart", "requestPermission thất bại", it)
        }
    }

    private val permissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            if (intent.action != ACTION_PERMISSION) return
            android.util.Log.d("Ch9326Uart", "permission broadcast, granted=${intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)}")
            if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                open()
            }
        }
    }

    fun registerPermissionReceiver() {
        val filter = IntentFilter(ACTION_PERMISSION)
        try {
            // Hệ thống gửi kết quả cấp quyền nên phải EXPORTED, không thì không nhận được
            context.registerReceiver(permissionReceiver, filter, Context.RECEIVER_EXPORTED)
        } catch (_: NoSuchMethodError) {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(permissionReceiver, filter)
        }
    }

    fun unregisterPermissionReceiver() {
        runCatching { context.unregisterReceiver(permissionReceiver) }
    }

    /** Mở thiết bị (cần đã có quyền USB). Trả về true nếu mở + init UART thành công. */
    fun open(): Boolean {
        close()
        val dev = findDevice() ?: run {
            android.util.Log.d("Ch9326Uart", "open: không thấy thiết bị USB")
            return false
        }
        if (!usbManager.hasPermission(dev)) {
            android.util.Log.d("Ch9326Uart", "open: chưa có quyền cho ${dev.vendorId.toString(16)}:${dev.productId.toString(16)}")
            return false
        }
        val iface = (0 until dev.interfaceCount)
            .map { dev.getInterface(it) }
            .firstOrNull { it.interfaceClass == UsbConstants.USB_CLASS_HID && it.interfaceSubclass == 0 }
            ?: dev.getInterface(0)
        val conn = usbManager.openDevice(dev) ?: run {
            android.util.Log.e("Ch9326Uart", "open: openDevice null")
            return false
        }
        if (!conn.claimInterface(iface, true)) {
            android.util.Log.e("Ch9326Uart", "open: claimInterface thất bại")
            conn.close()
            return false
        }
        var epInTmp: UsbEndpoint? = null
        var epOutTmp: UsbEndpoint? = null
        for (i in 0 until iface.endpointCount) {
            val ep = iface.getEndpoint(i)
            // CH9326 liệt kê class HID nên endpoint là INTERRUPT (một số firmware ra BULK):
            // nhận cả hai, bulkTransfer của Android đọc được cả endpoint interrupt.
            val okType = ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK ||
                ep.type == UsbConstants.USB_ENDPOINT_XFER_INT
            if (okType) {
                if (ep.direction == UsbConstants.USB_DIR_IN) epInTmp = ep else epOutTmp = ep
            }
        }
        device = dev
        connection = conn
        intf = iface
        epIn = epInTmp
        epOut = epOutTmp
        android.util.Log.d(
            "Ch9326Uart",
            "open: iface=$iface epIn=${epInTmp?.type}/${epInTmp?.direction} epOut=${epOutTmp?.type}",
        )
        // UartInit + SetConfig(dataBits=8, stopBits=4?, parity=1, flow=4) như app gốc ZESTECH
        conn.controlTransfer(0x00, 9, 1, 0, null, 0, TIMEOUT_MS)
        val cfg = byteArrayOf(0xFF.toByte(), 0xC7.toByte(), 0x82.toByte(), 0xD9.toByte(), 0x10)
        conn.controlTransfer(0x20, 9, 512, 0, cfg, cfg.size, TIMEOUT_MS)
        return true
    }

    fun isConnected(): Boolean = connection != null && epIn != null

    /** Đọc một gói UART (tối đa buf.size byte). Trả về số byte, 0 nếu không có dữ liệu. */
    fun read(buf: ByteArray): Int {
        val conn = connection ?: return 0
        val ep = epIn ?: return 0
        val pkt = ByteArray(32)
        val n = conn.bulkTransfer(ep, pkt, pkt.size, TIMEOUT_MS)
        if (n <= 0) return 0
        val len = pkt[0].toInt() and 0xFF
        if (len <= 0 || len > 31) return 0
        System.arraycopy(pkt, 1, buf, 0, len)
        return len
    }

    /** Ghi data ra UART (đóng gói [len][data]). */
    fun write(data: ByteArray): Int {
        val conn = connection ?: return -1
        val ep = epOut ?: return -1
        var offset = 0
        while (offset < data.size) {
            val chunk = minOf(data.size - offset, 31)
            val pkt = ByteArray(chunk + 1)
            pkt[0] = chunk.toByte()
            System.arraycopy(data, offset, pkt, 1, chunk)
            val n = conn.bulkTransfer(ep, pkt, pkt.size, TIMEOUT_MS)
            if (n < 0) return -1
            offset += chunk
        }
        return data.size
    }

    fun close() {
        connection?.let { c ->
            intf?.let { runCatching { c.releaseInterface(it) } }
            runCatching { c.close() }
        }
        connection = null
        intf = null
        device = null
        epIn = null
        epOut = null
    }
}
