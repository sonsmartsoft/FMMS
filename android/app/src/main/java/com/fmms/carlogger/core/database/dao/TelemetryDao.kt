package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.TelemetrySampleEntity

@Dao
interface TelemetryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(samples: List<TelemetrySampleEntity>)

    @Query("SELECT * FROM telemetry_samples WHERE vehicle_id = :vehicleId ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getLatestByVehicle(vehicleId: String, limit: Int): List<TelemetrySampleEntity>

    @Query("SELECT * FROM telemetry_samples WHERE trip_id = :tripId ORDER BY timestamp ASC")
    suspend fun getByTrip(tripId: String): List<TelemetrySampleEntity>

    @Query("DELETE FROM telemetry_samples WHERE timestamp < :cutoff")
    suspend fun deleteOlderThan(cutoff: Long): Int
}