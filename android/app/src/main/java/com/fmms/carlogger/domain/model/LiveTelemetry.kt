package com.fmms.carlogger.domain.model

enum class DataQuality { VALID, STALE, ESTIMATED, UNAVAILABLE }

/**
 * Thread-safe live snapshot that the UI (dashboard / live / fuel) observes.
 * All fields nullable; null => not supported / unavailable (spec §17: never 0).
 */
data class LiveTelemetry(
    val rpm: Double? = null,
    val speedKmh: Double? = null,
    val engineLoadPercent: Double? = null,
    val coolantTempC: Double? = null,
    val intakeTempC: Double? = null,
    val mafGps: Double? = null,
    val throttlePercent: Double? = null,
    val fuelLevelPercent: Double? = null,
    val fuelRateLph: Double? = null,
    val batteryVoltage: Double? = null,
    val engineRuntimeSeconds: Double? = null,
    val stft: Double? = null,
    val ltft: Double? = null,
    val odometerKm: Double? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val gpsSpeedKmh: Double? = null,
    val gpsAccuracy: Double? = null,
    val connectionQuality: String = "OK",
    val dataQuality: DataQuality = DataQuality.UNAVAILABLE,
    val rawSource: String = "NONE",
    val timestamp: Long = System.currentTimeMillis(),
)

data class FuelEstimate(
    val levelPercent: Double? = null,
    val estimatedLiters: Double? = null,
    val rangeKm: Double? = null,
    val consumptionL100km: Double? = null,
    val accumulatorFuelUsedLiters: Double = 0.0,
    val source: String = "—",
    val learningNote: String? = null,
)

data class OdometerInfo(
    val virtualOdoKm: Double,
    val sourceStatus: String,
    val confidence: String,
)

data class TripLiveState(
    val active: Boolean = false,
    val distanceKm: Double = 0.0,
    val durationSeconds: Long = 0L,
    val maxSpeedKmh: Double = 0.0,
    val startLatitude: Double? = null,
    val startLongitude: Double? = null,
)