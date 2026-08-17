package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "devices", indices = [Index(value = ["mac_address"], unique = true)])
data class DeviceEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    @ColumnInfo(name = "device_type") val deviceType: String,
    @ColumnInfo(name = "device_name") val deviceName: String,
    @ColumnInfo(name = "mac_address") val macAddress: String,
    @ColumnInfo(name = "serial_number") val serialNumber: String?,
    @ColumnInfo(name = "app_version") val appVersion: String?,
    @ColumnInfo(name = "last_seen") val lastSeen: Long?,
    val status: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)