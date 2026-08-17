package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "vehicles", indices = [Index(value = ["license_plate"])])
data class VehicleEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "fleet_id") val fleetId: String?,
    val vin: String?,
    @ColumnInfo(name = "license_plate") val licensePlate: String,
    val make: String,
    val model: String,
    val year: Int,
    val trim: String,
    val engine: String,
    @ColumnInfo(name = "fuel_type") val fuelType: String,
    @ColumnInfo(name = "tank_capacity_liters") val tankCapacityLiters: Double,
    @ColumnInfo(name = "odometer_km") val odometerKm: Double,
    val active: Boolean,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)