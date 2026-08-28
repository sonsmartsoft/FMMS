package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.GpsTrackPointEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GpsTrackPointDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(points: List<GpsTrackPointEntity>)

    @Query("SELECT * FROM gps_track_points WHERE trip_id = :tripId ORDER BY recorded_at ASC")
    suspend fun getByTrip(tripId: String): List<GpsTrackPointEntity>

    @Query("SELECT * FROM gps_track_points ORDER BY recorded_at DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<GpsTrackPointEntity>>

    @Query("DELETE FROM gps_track_points WHERE recorded_at < :cutoff")
    suspend fun purgeOlderThan(cutoff: Long)
}
