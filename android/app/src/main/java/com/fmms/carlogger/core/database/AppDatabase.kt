package com.fmms.carlogger.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.fmms.carlogger.core.database.dao.DailySummaryDao
import com.fmms.carlogger.core.database.dao.DeviceDao
import com.fmms.carlogger.core.database.dao.FuelLogDao
import com.fmms.carlogger.core.database.dao.MaintenanceDao
import com.fmms.carlogger.core.database.dao.SyncQueueDao
import com.fmms.carlogger.core.database.dao.TelemetryDao
import com.fmms.carlogger.core.database.dao.TripDao
import com.fmms.carlogger.core.database.dao.VehicleDao
import com.fmms.carlogger.core.database.entity.DailySummaryEntity
import com.fmms.carlogger.core.database.entity.DeviceEntity
import com.fmms.carlogger.core.database.entity.FuelLogEntity
import com.fmms.carlogger.core.database.entity.MaintenanceLogEntity
import com.fmms.carlogger.core.database.entity.SyncQueueEntity
import com.fmms.carlogger.core.database.entity.TelemetrySampleEntity
import com.fmms.carlogger.core.database.entity.TripEntity
import com.fmms.carlogger.core.database.entity.VehicleEntity

@Database(
    entities = [
        VehicleEntity::class,
        DeviceEntity::class,
        TripEntity::class,
        TelemetrySampleEntity::class,
        FuelLogEntity::class,
        MaintenanceLogEntity::class,
        SyncQueueEntity::class,
        DailySummaryEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vehicleDao(): VehicleDao
    abstract fun deviceDao(): DeviceDao
    abstract fun tripDao(): TripDao
    abstract fun telemetryDao(): TelemetryDao
    abstract fun fuelLogDao(): FuelLogDao
    abstract fun maintenanceDao(): MaintenanceDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun dailySummaryDao(): DailySummaryDao
}