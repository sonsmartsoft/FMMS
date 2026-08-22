package com.fmms.carlogger.core.gps

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * AOSP LocationManager-based GPS tracker (no Google Play Services, works on ZESTECH).
 * GPS is optional — OBD must work without it (spec §32).
 */
class GpsTracker(private val context: Context) {

    private val locationManager: LocationManager =
        context.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    private val _location = MutableStateFlow<Location?>(null)
    val location: StateFlow<Location?> = _location

    private var active = false

    @SuppressLint("MissingPermission")
    fun start() {
        if (active) return
        val permission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        if (permission != PackageManager.PERMISSION_GRANTED) return
        active = true
        val looper = android.os.Looper.getMainLooper()
        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER, 1000L, 5f, listener, looper
            )
            locationManager.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER, 3000L, 30f, listener, looper
            )
        } catch (_: Exception) {
            active = false
        }
    }

    fun stop() {
        if (!active) return
        try {
            locationManager.removeUpdates(listener)
        } catch (_: Exception) {
        }
        active = false
    }

    @SuppressLint("MissingPermission")
    private fun lastKnown(): Location? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) return null
        return try {
            @Suppress("DEPRECATION")
            (locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER))?.sanitizeSpeed()
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Vị trí gần nhất; tự thử start() lại nếu lần trước bị bỏ qua vì chưa đủ quyền
     * (user có thể cấp permission SAU khi service đã chạy).
     */
    fun currentLocation(): Location? {
        if (!active) start()
        return _location.value ?: lastKnown()
    }

    private val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            _location.value = location.sanitizeSpeed()
        }

        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }
}

/**
 * GPS chips can emit bogus speed spikes (NaN, negative, or thousands of km/h),
 * which peg the speedometer needle and corrupt trip max-speed. Clamp anything
 * implausible (> 400 km/h) back to 0 so telemetry stays sane.
 */
private fun Location.sanitizeSpeed(): Location {
    val ok = !speed.isNaN() && speed >= 0f && speed <= 111.2f // 111.2 m/s = 400 km/h
    if (ok) return this
    return Location(this).apply { setSpeed(0f) }
}