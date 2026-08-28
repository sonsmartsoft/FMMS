package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.fmms.carlogger.core.database.entity.VehicleEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VehicleDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(vehicle: VehicleEntity)

    @Update
    suspend fun update(vehicle: VehicleEntity)

    @Delete
    suspend fun delete(vehicle: VehicleEntity)

    @Query("SELECT * FROM vehicles ORDER BY active DESC, created_at ASC")
    fun observeAll(): Flow<List<VehicleEntity>>

    @Query("SELECT * FROM vehicles WHERE active = 1 LIMIT 1")
    suspend fun getActive(): VehicleEntity?

    @Query("SELECT * FROM vehicles ORDER BY created_at ASC")
    suspend fun getAll(): List<VehicleEntity>

    @Query("SELECT * FROM vehicles WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): VehicleEntity?

    @Query("UPDATE vehicles SET active = 0")
    suspend fun clearActive()

    @Query("UPDATE vehicles SET active = 1 WHERE id = :id")
    suspend fun setActive(id: String)

    @Query("UPDATE vehicles SET odometer_km = :odo, updated_at = :now WHERE id = :id")
    suspend fun updateOdometer(id: String, odo: Double, now: Long)

    @Query("SELECT * FROM vehicles WHERE id = :id")
    fun observeById(id: String): Flow<VehicleEntity?>
}