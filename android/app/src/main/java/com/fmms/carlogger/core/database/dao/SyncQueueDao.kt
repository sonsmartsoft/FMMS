package com.fmms.carlogger.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fmms.carlogger.core.database.entity.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: SyncQueueEntity)

    @Query("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT :limit")
    suspend fun getPending(limit: Int = 500): List<SyncQueueEntity>

    @Query("SELECT * FROM sync_queue WHERE status = 'PENDING' AND entity_type = :type ORDER BY created_at ASC LIMIT :limit")
    suspend fun getPendingByType(type: String, limit: Int = 500): List<SyncQueueEntity>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'PENDING'")
    suspend fun pendingCount(): Int

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'PENDING'")
    fun observePendingCountFlow(): Flow<Int>

    @Query("SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 100")
    fun observeRecent(): Flow<List<SyncQueueEntity>>

    @Query("UPDATE sync_queue SET status = :status, retry_count = retry_count + 1, last_error = :error, synced_at = :syncedAt WHERE id = :id")
    suspend fun markStatus(id: String, status: String, error: String?, syncedAt: Long?)

    @Query("UPDATE sync_queue SET payload = :payload WHERE id = :id")
    suspend fun updatePayload(id: String, payload: String)

    @Query("DELETE FROM sync_queue WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM sync_queue WHERE status = 'SYNCED' AND synced_at < :cutoff")
    suspend fun deleteOldSynced(cutoff: Long)
}