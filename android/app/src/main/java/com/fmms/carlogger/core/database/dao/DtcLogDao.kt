package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.DtcLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DtcLogDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(log: DtcLogEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(logs: List<DtcLogEntity>)

    @Query("SELECT * FROM dtc_logs WHERE vehicle_id = :vehicleId AND is_active = 1 ORDER BY last_detected_at DESC")
    fun observeActive(vehicleId: String): Flow<List<DtcLogEntity>>

    @Query("SELECT * FROM dtc_logs WHERE vehicle_id = :vehicleId ORDER BY scanned_at DESC, last_detected_at DESC")
    fun observeByVehicle(vehicleId: String): Flow<List<DtcLogEntity>>

    @Query("SELECT * FROM dtc_logs WHERE vehicle_id = :vehicleId AND is_active = 1")
    suspend fun getActive(vehicleId: String): List<DtcLogEntity>

    @Query("SELECT * FROM dtc_logs WHERE vehicle_id = :vehicleId AND scan_id = :scanId")
    suspend fun getByScan(vehicleId: String, scanId: String): List<DtcLogEntity>

    @Query("SELECT * FROM dtc_logs WHERE vehicle_id = :vehicleId AND is_active = 1 AND dtc_code = :code LIMIT 1")
    suspend fun getActiveByCode(vehicleId: String, code: String): DtcLogEntity?

    @Query("UPDATE dtc_logs SET is_active = 0, cleared_at = :clearedAt WHERE vehicle_id = :vehicleId AND is_active = 1")
    suspend fun markAllInactive(vehicleId: String, clearedAt: Long)

    @Query("SELECT COUNT(*) FROM dtc_logs WHERE vehicle_id = :vehicleId AND is_active = 1")
    suspend fun activeCount(vehicleId: String): Int
}
