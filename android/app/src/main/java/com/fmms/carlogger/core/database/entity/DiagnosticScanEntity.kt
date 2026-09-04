package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "diagnostic_scans",
    indices = [Index(value = ["vehicle_id", "scanned_at"]), Index(value = ["vehicle_id", "scanned_at", "id"], unique = true)],
)
data class DiagnosticScanEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "device_id") val deviceId: String?,
    @ColumnInfo(name = "scanned_at") val scannedAt: Long,
    @ColumnInfo(name = "odometer_km") val odometerKm: Double?,
    @ColumnInfo(name = "mil_status") val milStatus: Boolean,
    @ColumnInfo(name = "dtc_count") val dtcCount: Int,
    @ColumnInfo(name = "scan_type") val scanType: String,
    val source: String,
)
