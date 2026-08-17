package com.fmms.carlogger.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.R
import com.fmms.carlogger.core.database.entity.GpsTrackPointEntity
import com.fmms.carlogger.core.obd.OBDConnectionState
import com.fmms.carlogger.domain.model.DataQuality
import com.fmms.carlogger.domain.model.LiveTelemetry
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Foreground telemetry service: owns OBD lifecycle, GPS, telemetry polling,
 * trip engine and batched Room writes. Survives reboot/restarts via BootReceiver.
 */
class TelemetryService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var runnerJob: Job? = null
    private var gpsJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        AppContainer.init(applicationContext)
        createNotificationChannel()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Explicit FGS type avoids MissingForegroundServiceTypeException on API 34+
                startForeground(
                    NOTIFICATION_ID,
                    notification("Starting OBD..."),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                )
            } else {
                @Suppress("DEPRECATION")
                startForeground(NOTIFICATION_ID, notification("Starting OBD..."))
            }
        } catch (e: SecurityException) {
            // Missing notification/permission — degrade gracefully, never crash on boot.
            stopSelf()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        AppContainer.init(applicationContext)
        startIfNeeded()
        return START_STICKY
    }

    private fun startIfNeeded() {
        if (runnerJob?.isActive == true || gpsJob?.isActive == true) return
        val c = AppContainer

        c.gpsTracker.start()
        if (c.prefs.getDeviceMode() == "gps") {
            startGpsOnly()
        } else {
            c.obdManager.start()
            c.tripEngine.start()
            c.telemetryEngine.start()
            runnerJob = serviceScope.launch {
                var lastOdo = c.vehicleRepository.getActive()?.odometerKm

                c.telemetryEngine.live.collect { telemetry ->
                    c.tripEngine.feed(telemetry)
                    c.fuelEngine.onTelemetry(telemetry)

                    val vehicle = c.vehicleRepository.getActive()
                    if (vehicle != null) {
                        lastOdo = lastOdo ?: telemetry.odometerKm ?: vehicle.odometerKm
                        persistSample(vehicle.id, telemetry, lastOdo)
                        // Odometer sync: prefer verified OBD; else trip-range accumulation handled by TripEngine
                        if (telemetry.odometerKm != null) {
                            c.vehicleRepository.updateOdometer(vehicle.id, telemetry.odometerKm!!)
                            lastOdo = telemetry.odometerKm!!
                        }
                    }
                    updateNotification(telemetry, c.obdManager.connectionState.value)
                }
            }
        }
    }

    /**
     * GPS-only tracker mode (bike): no OBD adapter. Publishes GPS-derived
     * telemetry, feeds the trip engine, and records + enqueues trackpoints
     * every `gps_interval_sec` seconds while moving (or during an active trip).
     */
    private fun startGpsOnly() {
        val c = AppContainer
        c.tripEngine.start()
        gpsJob = serviceScope.launch {
            var currentTripId: String? = null
            var lastRecord = 0L
            val batch = mutableListOf<GpsTrackPointEntity>()

            while (isActive) {
                val loc = c.gpsTracker.currentLocation()
                if (loc != null) {
                    val speedKmh = (loc.speed * 3.6).takeIf { it >= 0.1 }
                    val telemetry = LiveTelemetry(
                        speedKmh = speedKmh,
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        gpsSpeedKmh = speedKmh,
                        gpsAccuracy = loc.accuracy.toDouble(),
                        connectionQuality = "OK",
                        dataQuality = DataQuality.VALID,
                        rawSource = "GPS",
                        timestamp = System.currentTimeMillis(),
                    )
                    c.publishGpsTelemetry(telemetry)
                    c.tripEngine.feed(telemetry)

                    val vehicle = c.vehicleRepository.getActive()
                    val tripState = c.tripEngine.state.value
                    val tripActive = tripState.active
                    currentTripId = if (tripActive) {
                        c.tripRepository.getActiveTrip(vehicle?.id ?: "")?.id ?: currentTripId
                    } else {
                        currentTripId
                    }

                    val moving = (speedKmh ?: 0.0) >= 1.0
                    val now = System.currentTimeMillis()
                    val intervalMs = c.prefs.getGpsIntervalSec() * 1000L
                    if (vehicle != null && (moving || tripActive) && now - lastRecord >= intervalMs) {
                        lastRecord = now
                        batch += GpsTrackPointEntity(
                            id = UUID.randomUUID().toString(),
                            tripId = currentTripId,
                            vehicleId = vehicle.id,
                            deviceId = c.prefs.getDeviceId(),
                            lat = loc.latitude,
                            lng = loc.longitude,
                            speedKmh = speedKmh,
                            recordedAt = now,
                        )
                    }

                    if (batch.size >= 25 || (batch.isNotEmpty() && now - lastRecord > 60000L)) {
                        c.gpsTrackRepository.insertAndEnqueue(batch.toList())
                        batch.clear()
                    }
                    updateNotification(telemetry, OBDConnectionState.DISCONNECTED)
                }
                delay(1000)
            }
        }
    }

    private suspend fun persistSample(vehicleId: String, telemetry: LiveTelemetry, lastOdoKm: Double?) {
        val c = AppContainer
        val sample = com.fmms.carlogger.core.database.entity.TelemetrySampleEntity(
            id = UUID.randomUUID().toString(),
            vehicleId = vehicleId,
            deviceId = null,
            tripId = null,
            timestamp = telemetry.timestamp,
            rpm = telemetry.rpm,
            speedKmh = telemetry.speedKmh,
            engineLoadPercent = telemetry.engineLoadPercent,
            coolantTempC = telemetry.coolantTempC,
            intakeTempC = telemetry.intakeTempC,
            mafGps = telemetry.mafGps,
            throttlePercent = telemetry.throttlePercent,
            fuelLevelPercent = telemetry.fuelLevelPercent,
            fuelRateLph = telemetry.fuelRateLph,
            batteryVoltage = telemetry.batteryVoltage,
            engineRuntimeSeconds = telemetry.engineRuntimeSeconds,
            stft = telemetry.stft,
            ltft = telemetry.ltft,
            odometerKm = lastOdoKm,
            latitude = telemetry.latitude,
            longitude = telemetry.longitude,
            gpsSpeedKmh = telemetry.gpsSpeedKmh,
            gpsAccuracy = telemetry.gpsAccuracy,
            connectionQuality = telemetry.connectionQuality,
            dataQuality = telemetry.dataQuality.name,
            rawSource = telemetry.rawSource,
        )
        c.telemetryRepository.insertAll(listOf(sample))
    }

    private fun updateNotification(telemetry: LiveTelemetry, state: OBDConnectionState) {
        val nm = getSystemService(NotificationManager::class.java)
        val speed = telemetry.speedKmh?.let { "${it.toInt()} km/h" } ?: "—"
        val rpm = telemetry.rpm?.let { "${it.toInt()} rpm" } ?: "—"
        val isGpsMode = AppContainer.prefs.getDeviceMode() == "gps"
        val statusLine = if (isGpsMode) {
            "GPS TRACKING"
        } else {
            when (state) {
                OBDConnectionState.CONNECTED -> "OBD CONNECTED"
                OBDConnectionState.RECONNECTING -> "OBD RECONNECTING"
                OBDConnectionState.SCANNING -> "SCANNING"
                OBDConnectionState.ERROR -> "OBD ERROR"
                else -> "OBD DISCONNECTED"
            }
        }
        nm.notify(NOTIFICATION_ID, notification("$statusLine • $speed • $rpm"))
    }

    private fun notification(text: String): Notification {
        val deviceName = AppContainer.prefs.getDeviceName()?.takeIf { it.isNotBlank() } ?: "FMMS Tracker"
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(deviceName)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, "OBD Telemetry", NotificationManager.IMPORTANCE_LOW,
        ).apply { setShowBadge(false) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    override fun onDestroy() {
        runnerJob?.cancel()
        gpsJob?.cancel()
        serviceScope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL_ID = "fmms_telemetry"
        private const val NOTIFICATION_ID = 1001
    }
}