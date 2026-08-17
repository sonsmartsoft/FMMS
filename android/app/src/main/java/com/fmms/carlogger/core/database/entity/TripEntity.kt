package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "trips",
    indices = [
        Index(value = ["vehicle_id", "start_time"]),
        Index(value = ["vehicle_id", "start_time", "id"], unique = true),
    ],
)
data class TripEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "device_id") val deviceId: String?,
    @ColumnInfo(name = "start_time") val startTime: Long,
    @ColumnInfo(name = "end_time") val endTime: Long?,
    @ColumnInfo(name = "start_odometer") val startOdometer: Double?,
    @ColumnInfo(name = "end_odometer") val endOdometer: Double?,
    @ColumnInfo(name = "distance_km") val distanceKm: Double,
    @ColumnInfo(name = "duration_seconds") val durationSeconds: Long,
    @ColumnInfo(name = "fuel_start_percent") val fuelStartPercent: Double?,
    @ColumnInfo(name = "fuel_end_percent") val fuelEndPercent: Double?,
    @ColumnInfo(name = "fuel_used_liters") val fuelUsedLiters: Double?,
    @ColumnInfo(name = "average_consumption_l100km") val averageConsumptionL100km: Double?,
    @ColumnInfo(name = "average_speed_kmh") val averageSpeedKmh: Double?,
    @ColumnInfo(name = "max_speed_kmh") val maxSpeedKmh: Double?,
    @ColumnInfo(name = "start_latitude") val startLatitude: Double?,
    @ColumnInfo(name = "start_longitude") val startLongitude: Double?,
    @ColumnInfo(name = "end_latitude") val endLatitude: Double?,
    @ColumnInfo(name = "end_longitude") val endLongitude: Double?,
    val status: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)