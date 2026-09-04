package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "dtc_logs",
    indices = [
        Index(value = ["vehicle_id", "is_active"]),
        Index(value = ["vehicle_id", "scanned_at"]),
        Index(value = ["scan_id"]),
        Index(value = ["vehicle_id", "is_active", "dtc_code"]),
    ],
)
data class DtcLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "scan_id") val scanId: String?,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "device_id") val deviceId: String?,
    @ColumnInfo(name = "dtc_code") val dtcCode: String,
    val status: String,
    @ColumnInfo(name = "system_category") val systemCategory: String?,
    val severity: String?,
    @ColumnInfo(name = "description_vi") val descriptionVi: String?,
    @ColumnInfo(name = "freeze_frame") val freezeFrame: String?,
    @ColumnInfo(name = "is_active") val isActive: Boolean,
    val source: String,
    @ColumnInfo(name = "first_detected_at") val firstDetectedAt: Long?,
    @ColumnInfo(name = "last_detected_at") val lastDetectedAt: Long?,
    @ColumnInfo(name = "cleared_at") val clearedAt: Long?,
    @ColumnInfo(name = "scanned_at") val scannedAt: Long,
)
