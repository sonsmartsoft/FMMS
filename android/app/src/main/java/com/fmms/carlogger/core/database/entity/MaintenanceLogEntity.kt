package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "maintenance_logs",
    indices = [Index(value = ["vehicle_id", "date"])],
)
data class MaintenanceLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "maintenance_type") val maintenanceType: String,
    val date: Long,
    @ColumnInfo(name = "odometer_km") val odometerKm: Double?,
    val cost: Double?,
    val currency: String,
    val notes: String?,
    @ColumnInfo(name = "next_due_km") val nextDueKm: Double?,
    @ColumnInfo(name = "next_due_date") val nextDueDate: Long?,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)