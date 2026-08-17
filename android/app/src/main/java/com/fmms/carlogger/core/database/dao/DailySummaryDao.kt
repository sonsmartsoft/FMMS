package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.DailySummaryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DailySummaryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(summary: DailySummaryEntity)

    @Query("SELECT * FROM daily_summaries WHERE vehicle_id = :vehicleId ORDER BY date DESC")
    fun observeByVehicle(vehicleId: String): Flow<List<DailySummaryEntity>>

    @Query("SELECT * FROM daily_summaries WHERE vehicle_id = :vehicleId ORDER BY date DESC")
    suspend fun getByVehicle(vehicleId: String): List<DailySummaryEntity>

    @Query("SELECT * FROM daily_summaries WHERE vehicle_id = :vehicleId AND date = :date LIMIT 1")
    suspend fun getByDate(vehicleId: String, date: String): DailySummaryEntity?

    @Query("DELETE FROM daily_summaries WHERE vehicle_id = :vehicleId AND date = :date")
    suspend fun deleteByDate(vehicleId: String, date: String)
}