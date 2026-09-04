package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.DiagnosticScanEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DiagnosticScanDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(scan: DiagnosticScanEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(scans: List<DiagnosticScanEntity>)

    @Query("SELECT * FROM diagnostic_scans WHERE vehicle_id = :vehicleId ORDER BY scanned_at DESC LIMIT 1")
    suspend fun getLatest(vehicleId: String): DiagnosticScanEntity?

    @Query("SELECT * FROM diagnostic_scans WHERE vehicle_id = :vehicleId ORDER BY scanned_at DESC")
    fun observeByVehicle(vehicleId: String): Flow<List<DiagnosticScanEntity>>

    @Query("SELECT * FROM diagnostic_scans WHERE vehicle_id = :vehicleId ORDER BY scanned_at DESC LIMIT :limit")
    suspend fun getByVehicle(vehicleId: String, limit: Int = 50): List<DiagnosticScanEntity>
}
