package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.DeviceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DeviceDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(device: DeviceEntity)

    @Query("SELECT * FROM devices WHERE mac_address = :mac LIMIT 1")
    suspend fun getByMac(mac: String): DeviceEntity?

    @Query("SELECT * FROM devices WHERE vehicle_id = :vehicleId LIMIT 1")
    suspend fun getByVehicle(vehicleId: String): DeviceEntity?

    @Query("SELECT * FROM devices")
    fun observeAll(): Flow<List<DeviceEntity>>

    @Query("SELECT * FROM devices")
    suspend fun getAll(): List<DeviceEntity>

    @Query("SELECT * FROM devices WHERE mac_address = :mac")
    fun observeByMac(mac: String): Flow<DeviceEntity?>

    @Query("DELETE FROM devices WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE devices SET last_seen = :lastSeen, status = :status, updated_at = :now WHERE id = :id")
    suspend fun updateStatus(id: String, lastSeen: Long?, status: String, now: Long)
}