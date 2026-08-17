package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.FuelLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface FuelLogDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(log: FuelLogEntity)

    @Delete
    suspend fun delete(log: FuelLogEntity)

    @Query("SELECT * FROM fuel_logs WHERE vehicle_id = :vehicleId ORDER BY timestamp DESC")
    fun observeByVehicle(vehicleId: String): Flow<List<FuelLogEntity>>

    @Query("SELECT * FROM fuel_logs WHERE vehicle_id = :vehicleId ORDER BY timestamp DESC")
    suspend fun getByVehicle(vehicleId: String): List<FuelLogEntity>

    @Query("SELECT * FROM fuel_logs WHERE vehicle_id = :vehicleId AND tank_full = 1 ORDER BY timestamp ASC")
    suspend fun getFullTankEvents(vehicleId: String): List<FuelLogEntity>

    @Query(
        """
        SELECT COALESCE(SUM(fuel_liters), 0) as liters, COALESCE(SUM(total_cost), 0) as cost
        FROM fuel_logs WHERE vehicle_id = :vehicleId AND timestamp >= :from AND timestamp <= :to
        """
    )
    suspend fun getTotalsBetween(vehicleId: String, from: Long, to: Long): List<FuelTotalsRow>

    data class FuelTotalsRow(val liters: Double, val cost: Double)
}