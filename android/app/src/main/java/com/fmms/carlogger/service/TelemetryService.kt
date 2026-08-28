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
import com.fmms.carlogger.BuildConfig
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
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Foreground telemetry service: owns OBD lifecycle, GPS, telemetry polling,
 * trip engine and batched Room writes. Survives reboot/restarts via BootReceiver.
 */
class TelemetryService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var runnerJob: Job? = null
    private var gpsJob: Job? = null
    private var pushJob: Job? = null

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
        serviceScope.launch { c.vehicleRepository.ensureDeviceRegistered() }
        startLivePush()
        if (c.prefs.getDeviceMode() == "gps") {
            startGpsOnly()
        } else {
            c.obdManager.start()
            c.tripEngine.start()
            c.telemetryEngine.start()
            runnerJob = serviceScope.launch {
                var lastOdo = c.vehicleRepository.getActive()?.odometerKm
                var currentTripId: String? = null
                var lastRecord = 0L
                var lastFlush = System.currentTimeMillis()
                val batch = mutableListOf<GpsTrackPointEntity>()

                c.telemetryEngine.live.collect { telemetry ->
                    c.tripEngine.feed(telemetry)
                    c.fuelEngine.onTelemetry(telemetry)

                    val vehicle = c.vehicleRepository.getActive()
                    if (vehicle != null) {
                        lastOdo = lastOdo ?: telemetry.odometerKm ?: vehicle.odometerKm
                        persistSample(vehicle.id, telemetry, lastOdo)
                        // Odometer sync: prefer verified OBD; else trip-range accumulation handled by TripEngine
                        if (telemetry.odometerKm != null) {
                            val newOdo = telemetry.odometerKm!!
                            val prev = vehicle.odometerKm
                            // Guard: từ chối bước nhảy phi lý (decode sai / ECU lạ)
                            if (prev <= 0 || (newOdo >= prev - 500 && newOdo <= prev + 5000)) {
                                c.vehicleRepository.updateOdometer(vehicle.id, newOdo)
                                lastOdo = newOdo
                            }
                        }

                        // OBD mode: also record GPS trackpoints (phone GPS merged into
                        // telemetry) so the vehicle shows up on the web map while OBD is live.
                        val lat = telemetry.latitude
                        val lng = telemetry.longitude
                        if (lat != null && lng != null) {
                            val tripState = c.tripEngine.state.value
                            val tripActive = tripState.active
                            currentTripId = if (tripActive) {
                                c.tripRepository.getActiveTrip(vehicle.id)?.id ?: currentTripId
                            } else {
                                currentTripId
                            }
                            val gpsSpeed = telemetry.gpsSpeedKmh
                            // Tốc độ OBD (PID 0D) là chuẩn; GPS chỉ để định vị web.
                            val pointSpeed = telemetry.speedKmh ?: gpsSpeed
                            val moving = (pointSpeed ?: 0.0) >= 1.0
                            val now = System.currentTimeMillis()
                            val intervalMs = c.prefs.getGpsIntervalSec() * 1000L
                            // While moving (or during an active trip) record on the GPS
                            // interval; when parked, still emit a slow "idle heartbeat" so
                            // the web live map keeps showing a fresh position.
                            val heartbeatMs = IDLE_HEARTBEAT_MS
                            val due = if (moving || tripActive) {
                                now - lastRecord >= intervalMs
                            } else {
                                now - lastRecord >= heartbeatMs
                            }
                            if (due) {
                                lastRecord = now
                                batch += GpsTrackPointEntity(
                                    id = UUID.randomUUID().toString(),
                                    tripId = currentTripId,
                                    vehicleId = vehicle.id,
                                    deviceId = c.prefs.getDeviceId(),
                                    lat = lat,
                                    lng = lng,
                                    speedKmh = pointSpeed,
                                    recordedAt = now,
                                )
                            }
                            if (batch.isNotEmpty() && (batch.size >= 10 || now - lastFlush >= 15_000L)) {
                                lastFlush = now
                                c.gpsTrackRepository.insertAndEnqueue(batch.toList())
                                batch.clear()
                            }
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
            var lastFlush = System.currentTimeMillis()
            val batch = mutableListOf<GpsTrackPointEntity>()
            // Position-derived speed fallback: many devices report loc.speed == 0
            // even while moving, so estimate speed from consecutive fixes.
            var prevGps: android.location.Location? = null
            var prevGpsAt = 0L

            while (isActive) {
                val loc = c.gpsTracker.currentLocation()
                if (loc != null) {
                    val now = System.currentTimeMillis()
                    var speedKmh = (loc.speed * 3.6).takeIf { it.isFinite() && it in 0.1..400.0 }
                    if (speedKmh == null) {
                        val dt = now - prevGpsAt
                        if (prevGps != null && dt >= 2000L) {
                            val distKm = prevGps!!.distanceTo(loc) / 1000.0
                            val est = distKm / (dt / 1000.0) * 3600.0
                            if (est.isFinite() && est >= 0.5 && est <= 400.0) speedKmh = est
                        }
                    }
                    prevGps = loc
                    prevGpsAt = now
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
                    val intervalMs = c.prefs.getGpsIntervalSec() * 1000L
                    val heartbeatMs = IDLE_HEARTBEAT_MS
                    val due = if (moving || tripActive) {
                        now - lastRecord >= intervalMs
                    } else {
                        now - lastRecord >= heartbeatMs
                    }
                    if (vehicle != null && due) {
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

                    if (batch.isNotEmpty() && (batch.size >= 10 || now - lastFlush >= 15_000L)) {
                        lastFlush = now
                        c.gpsTrackRepository.insertAndEnqueue(batch.toList())
                        batch.clear()
                    }
                    updateNotification(telemetry, OBDConnectionState.DISCONNECTED)
                }
                delay(1000)
            }
        }
    }

    /**
     * Near-real-time GPS sync: pushes pending gps_track_points to Supabase every
     * 30s while the service runs (in addition to the 15-min WorkManager fallback).
     * This is what makes the live map on the web actually "live".
     */
    private fun startLivePush() {
        if (pushJob?.isActive == true) return
        pushJob = serviceScope.launch {
            val client = okhttp3.OkHttpClient()
            while (isActive) {
                try {
                    if (AppContainer.prefs.getSyncEnabled()) {
                        // Self-heal stale payloads (pre-ISO timestamps) so the 84
                        // stuck records from before rev19 can finally sync in-place.
                        AppContainer.syncQueueRepository.repairStalePayloads(limit = 500)
                        // Register/refresh device first so the RLS check
                        // `EXISTS(devices WHERE id = device_id AND vehicle_id IS NOT NULL)`
                        // succeeds before any gps_track_point insert.
                        val devices = AppContainer.syncQueueRepository.getPendingByType("devices", limit = 20)
                        for (entry in devices) {
                            val resp = pushUpsert(client, "devices", entry.payload)
                            if (resp != null && resp.isSuccessful) {
                                AppContainer.syncQueueRepository.markSynced(entry.id)
                            } else {
                                AppContainer.syncQueueRepository.markFailed(entry.id, "devices HTTP ${resp?.code}: ${resp?.body?.string()?.take(180)}")
                            }
                        }
                        val pending = AppContainer.syncQueueRepository.getPendingByType("gps_track_points", limit = 500)
                        for (entry in pending) {
                            val resp = pushUpsert(client, "gps_track_points", entry.payload)
                            if (resp != null && resp.isSuccessful) {
                                AppContainer.syncQueueRepository.markSynced(entry.id)
                            } else {
                                AppContainer.syncQueueRepository.markFailed(entry.id, "gps HTTP ${resp?.code}: ${resp?.body?.string()?.take(180)}")
                            }
                        }
                        val trips = AppContainer.syncQueueRepository.getPendingByType("trips", limit = 50)
                        for (entry in trips) {
                            val resp = pushUpsert(client, "trips", entry.payload)
                            if (resp != null && resp.isSuccessful) {
                                AppContainer.syncQueueRepository.markSynced(entry.id)
                            } else {
                                AppContainer.syncQueueRepository.markFailed(entry.id, "trips HTTP ${resp?.code}: ${resp?.body?.string()?.take(180)}")
                            }
                        }
                    }
                } catch (_: Exception) {
                    // transient network failure — retry next tick
                }
                delay(15_000L)
            }
        }
    }

    private fun pushUpsert(client: okhttp3.OkHttpClient, table: String, payload: String): okhttp3.Response? {
        val request = okhttp3.Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/rest/v1/$table")
            .header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            .header("Authorization", "Bearer ${BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates,return=minimal")
            .post(payload.toRequestBody("application/json".toMediaType()))
            .build()
        return try {
            client.newCall(request).execute()
        } catch (_: Exception) {
            null
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
        // Cloud sync: push a sample at most every ~20 s so the web sees live
        // OBD data without flooding the sync queue (poll cycle is ~2.5 s).
        val now = System.currentTimeMillis()
        if (now - lastTelemetryPushAt > 20_000) {
            lastTelemetryPushAt = now
            c.syncQueueRepository.enqueueTelemetrySample(sample)
        }
    }

    private var lastTelemetryPushAt = 0L

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
        pushJob?.cancel()
        serviceScope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL_ID = "fmms_telemetry"
        private const val NOTIFICATION_ID = 1001

        // Emit a GPS position every 30s even when the vehicle is parked, so the
        // web live map always shows a fresh marker for a live tracker.
        private const val IDLE_HEARTBEAT_MS = 30_000L
    }
}