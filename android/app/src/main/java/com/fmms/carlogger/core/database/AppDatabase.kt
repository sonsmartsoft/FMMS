package com.fmms.carlogger.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.fmms.carlogger.core.database.dao.DailySummaryDao
import com.fmms.carlogger.core.database.dao.DeviceDao
import com.fmms.carlogger.core.database.dao.FuelLogDao
import com.fmms.carlogger.core.database.dao.GpsTrackPointDao
import com.fmms.carlogger.core.database.dao.MaintenanceDao
import com.fmms.carlogger.core.database.dao.SyncQueueDao
import com.fmms.carlogger.core.database.dao.TelemetryDao
import com.fmms.carlogger.core.database.dao.TripDao
import com.fmms.carlogger.core.database.dao.VehicleDao
import com.fmms.carlogger.core.database.entity.DailySummaryEntity
import com.fmms.carlogger.core.database.entity.DeviceEntity
import com.fmms.carlogger.core.database.entity.FuelLogEntity
import com.fmms.carlogger.core.database.entity.GpsTrackPointEntity
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
        GpsTrackPointEntity::class,
    ],
    version = 3,
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
    abstract fun gpsTrackPointDao(): GpsTrackPointDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `gps_track_points` (" +
                        "`id` TEXT NOT NULL, " +
                        "`trip_id` TEXT, " +
                        "`vehicle_id` TEXT NOT NULL, " +
                        "`device_id` TEXT NOT NULL, " +
                        "`lat` REAL NOT NULL, " +
                        "`lng` REAL NOT NULL, " +
                        "`speed_kmh` REAL, " +
                        "`recorded_at` INTEGER NOT NULL, " +
                        "PRIMARY KEY(`id`))"
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_gps_track_points_vehicle_id_recorded_at` ON `gps_track_points` (`vehicle_id`, `recorded_at`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_gps_track_points_trip_id_recorded_at` ON `gps_track_points` (`trip_id`, `recorded_at`)")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `vehicles` ADD COLUMN `name` TEXT NOT NULL DEFAULT ''")
            }
        }
    }
}