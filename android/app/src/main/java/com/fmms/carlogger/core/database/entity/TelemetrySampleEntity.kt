package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "telemetry_samples",
    indices = [Index(value = ["vehicle_id", "timestamp"]), Index(value = ["trip_id"])],
)
data class TelemetrySampleEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "device_id") val deviceId: String?,
    @ColumnInfo(name = "trip_id") val tripId: String?,
    val timestamp: Long,
    val rpm: Double?,
    @ColumnInfo(name = "speed_kmh") val speedKmh: Double?,
    @ColumnInfo(name = "engine_load_percent") val engineLoadPercent: Double?,
    @ColumnInfo(name = "coolant_temp_c") val coolantTempC: Double?,
    @ColumnInfo(name = "intake_temp_c") val intakeTempC: Double?,
    @ColumnInfo(name = "maf_gps") val mafGps: Double?,
    @ColumnInfo(name = "throttle_percent") val throttlePercent: Double?,
    @ColumnInfo(name = "fuel_level_percent") val fuelLevelPercent: Double?,
    @ColumnInfo(name = "fuel_rate_lph") val fuelRateLph: Double?,
    @ColumnInfo(name = "battery_voltage") val batteryVoltage: Double?,
    @ColumnInfo(name = "engine_runtime_seconds") val engineRuntimeSeconds: Double?,
    val stft: Double?,
    val ltft: Double?,
    @ColumnInfo(name = "odometer_km") val odometerKm: Double?,
    val latitude: Double?,
    val longitude: Double?,
    @ColumnInfo(name = "gps_speed_kmh") val gpsSpeedKmh: Double?,
    @ColumnInfo(name = "gps_accuracy") val gpsAccuracy: Double?,
    @ColumnInfo(name = "connection_quality") val connectionQuality: String?,
    @ColumnInfo(name = "data_quality") val dataQuality: String?,
    @ColumnInfo(name = "raw_source") val rawSource: String?,
)