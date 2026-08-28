package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.TripEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TripDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(trip: TripEntity)

    @Query("SELECT * FROM trips WHERE vehicle_id = :vehicleId ORDER BY start_time DESC")
    fun observeByVehicle(vehicleId: String): Flow<List<TripEntity>>

    @Query("SELECT * FROM trips WHERE vehicle_id = :vehicleId AND status = 'ACTIVE' ORDER BY start_time DESC LIMIT 1")
    suspend fun getActiveTrip(vehicleId: String): TripEntity?

    @Query("SELECT * FROM trips WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TripEntity?

    @Query("SELECT * FROM trips WHERE vehicle_id = :vehicleId AND start_time >= :from AND start_time <= :to")
    suspend fun getBetween(vehicleId: String, from: Long, to: Long): List<TripEntity>

    @Query(
        """
        SELECT COALESCE(SUM(distance_km), 0) as distanceKm, COALESCE(SUM(duration_seconds), 0) as durationSeconds,
               COALESCE(SUM(fuel_used_liters), 0) as fuelUsedLiters, COUNT(*) as tripCount,
               COALESCE(MAX(max_speed_kmh), 0) as maxSpeedKmh, COALESCE(AVG(average_speed_kmh), 0) as avgSpeedKmh
        FROM trips WHERE vehicle_id = :vehicleId AND end_time IS NOT NULL
        """
    )
    suspend fun getAggregates(vehicleId: String): List<AggregateRow>

    data class AggregateRow(val distanceKm: Double, val durationSeconds: Long, val fuelUsedLiters: Double, val tripCount: Int, val maxSpeedKmh: Double, val avgSpeedKmh: Double)

    @Query("SELECT * FROM trips WHERE end_time IS NOT NULL AND end_odometer IS NOT NULL AND start_odometer IS NOT NULL ORDER BY end_time DESC")
    suspend fun getWithOdometer(): List<TripEntity>

    @Query("UPDATE trips SET end_time = :endTime, end_odometer = :endOdo, distance_km = :distance, duration_seconds = :duration, fuel_end_percent = :fuelEnd, fuel_used_liters = :fuelUsed, average_consumption_l100km = :consumption, average_speed_kmh = :avgSpeed, max_speed_kmh = :maxSpeed, end_latitude = :endLat, end_longitude = :endLng, status = 'COMPLETED', updated_at = :now WHERE id = :id")
    suspend fun completeTrip(
        id: String,
        endTime: Long,
        endOdo: Double?,
        distance: Double,
        duration: Long,
        fuelEnd: Double?,
        fuelUsed: Double?,
        consumption: Double?,
        avgSpeed: Double?,
        maxSpeed: Double?,
        endLat: Double?,
        endLng: Double?,
        now: Long,
    )

    @Query("SELECT * FROM trips WHERE vehicle_id = :vehicleId AND status = 'ACTIVE'")
    suspend fun getActiveTrips(vehicleId: String): List<TripEntity>

    @Query("SELECT * FROM trips WHERE status = 'ACTIVE'")
    suspend fun getAllActiveTrips(): List<TripEntity>

    @Query("DELETE FROM trips WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("SELECT DISTINCT CAST(strftime('%Y', start_time / 1000, 'unixepoch') AS INTEGER) AS y FROM trips WHERE vehicle_id = :vehicleId ORDER BY y DESC")
    suspend fun getYears(vehicleId: String): List<Int>
}