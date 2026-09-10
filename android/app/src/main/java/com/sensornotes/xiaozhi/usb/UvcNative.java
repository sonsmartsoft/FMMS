package com.sensornotes.xiaozhi.usb;

import android.util.Log;

import java.nio.ByteBuffer;

/**
 * JNI wrapper quanh libuvcjni.so + libusb1.0.so (lấy từ app nguồn lily).
 * Signature phải giữ NGUYÊN (package/tên class/tên native method) để JNI
 * binding khớp với các symbol Java_com_sensornotes_xiaozhi_usb_UvcNative_*
 * trong libuvcjni.so.
 */
public final class UvcNative {

    private static final Object LOAD_LOCK = new Object();
    private static volatile boolean sLoaded = false;

    private static void ensureLoaded() {
        if (sLoaded) return;
        synchronized (LOAD_LOCK) {
            if (sLoaded) return;
            System.loadLibrary("usb1.0");
            System.loadLibrary("uvcjni");
            sLoaded = true;
        }
    }

    public static boolean isAvailable() {
        try {
            ensureLoaded();
            return true;
        } catch (Throwable t) {
            Log.w("UvcNative", "native UVC unavailable: " + t.getMessage());
            return false;
        }
    }

    public native long nativeOpen(int fileDescriptor, int[] outError);

    public native int nativeClose(long handle);

    public native String[] nativeFormats(long handle);

    public native int nativeStart(long handle, int format, int width, int height, int fps);

    public native int nativeGrab(long handle, ByteBuffer buffer, int[] info, int timeoutMs);

    public native void nativeStop(long handle);

    public native String nativeStrError(int code);

    static {
        try {
            ensureLoaded();
        } catch (Throwable t) {
            Log.w("UvcNative", "lazy load failed: " + t.getMessage());
        }
    }
}