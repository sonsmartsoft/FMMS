package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "fuel_logs",
    indices = [Index(value = ["vehicle_id", "timestamp"]), Index(value = ["vehicle_id", "timestamp", "id"], unique = true)],
)
data class FuelLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    val timestamp: Long,
    @ColumnInfo(name = "odometer_km") val odometerKm: Double?,
    @ColumnInfo(name = "fuel_liters") val fuelLiters: Double,
    @ColumnInfo(name = "price_per_liter") val pricePerLiter: Double?,
    @ColumnInfo(name = "total_cost") val totalCost: Double?,
    val currency: String,
    val station: String?,
    @ColumnInfo(name = "tank_full") val tankFull: Boolean,
    val notes: String?,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)