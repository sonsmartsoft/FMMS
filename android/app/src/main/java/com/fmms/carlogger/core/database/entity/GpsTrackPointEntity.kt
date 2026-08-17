package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** GPS track point (spec §gps_track_points): 5s samples + trip start/end. */
@Entity(
    tableName = "gps_track_points",
    indices = [
        Index(value = ["vehicle_id", "recorded_at"]),
        Index(value = ["trip_id", "recorded_at"]),
    ],
)
data class GpsTrackPointEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "trip_id") val tripId: String?,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "device_id") val deviceId: String,
    val lat: Double,
    val lng: Double,
    @ColumnInfo(name = "speed_kmh") val speedKmh: Double?,
    @ColumnInfo(name = "recorded_at") val recordedAt: Long,
)
