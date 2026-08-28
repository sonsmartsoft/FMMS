package com.fmms.carlogger.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "daily_summaries",
    indices = [Index(value = ["vehicle_id", "date"], unique = true)],
)
data class DailySummaryEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "vehicle_id") val vehicleId: String,
    val date: String,
    @ColumnInfo(name = "distance_km") val distanceKm: Double,
    @ColumnInfo(name = "fuel_used_liters") val fuelUsedLiters: Double,
    @ColumnInfo(name = "average_consumption_l100km") val averageConsumptionL100km: Double?,
    @ColumnInfo(name = "fuel_cost") val fuelCost: Double,
    @ColumnInfo(name = "cost_per_km") val costPerKm: Double?,
    @ColumnInfo(name = "average_speed_kmh") val averageSpeedKmh: Double?,
    @ColumnInfo(name = "trip_count") val tripCount: Int,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)