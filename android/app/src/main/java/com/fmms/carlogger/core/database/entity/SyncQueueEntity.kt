package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sync_queue",
    indices = [Index(value = ["status", "entity_type", "entity_id"])],
)
data class SyncQueueEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "entity_type") val entityType: String,
    @ColumnInfo(name = "entity_id") val entityId: String,
    val operation: String,
    val payload: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "retry_count") val retryCount: Int = 0,
    @ColumnInfo(name = "last_error") val lastError: String? = null,
    val status: String = "PENDING",
    @ColumnInfo(name = "synced_at") val syncedAt: Long? = null,
)