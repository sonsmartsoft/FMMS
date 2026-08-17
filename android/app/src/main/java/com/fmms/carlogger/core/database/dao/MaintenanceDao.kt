package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.MaintenanceLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MaintenanceDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(log: MaintenanceLogEntity)

    @Delete
    suspend fun delete(log: MaintenanceLogEntity)

    @Query("SELECT * FROM maintenance_logs WHERE vehicle_id = :vehicleId ORDER BY date DESC")
    fun observeByVehicle(vehicleId: String): Flow<List<MaintenanceLogEntity>>

    @Query("SELECT * FROM maintenance_logs WHERE vehicle_id = :vehicleId ORDER BY date DESC")
    suspend fun getByVehicle(vehicleId: String): List<MaintenanceLogEntity>
}