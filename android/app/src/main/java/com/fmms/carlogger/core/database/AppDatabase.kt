package com.fmms.carlogger.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.fmms.carlogger.core.database.dao.DailySummaryDao
import com.fmms.carlogger.core.database.dao.DeviceDao
import com.fmms.carlogger.core.database.dao.DtcLogDao
import com.fmms.carlogger.core.database.dao.DiagnosticScanDao
import com.fmms.carlogger.core.database.dao.FuelLogDao
import com.fmms.carlogger.core.database.dao.GpsTrackPointDao
import com.fmms.carlogger.core.database.dao.MaintenanceDao
import com.fmms.carlogger.core.database.dao.SyncQueueDao
import com.fmms.carlogger.core.database.dao.TelemetryDao
import com.fmms.carlogger.core.database.dao.TripDao
import com.fmms.carlogger.core.database.dao.VehicleDao
import com.fmms.carlogger.core.database.entity.DailySummaryEntity
import com.fmms.carlogger.core.database.entity.DeviceEntity
import com.fmms.carlogger.core.database.entity.DtcLogEntity
import com.fmms.carlogger.core.database.entity.DiagnosticScanEntity
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
        DiagnosticScanEntity::class,
        DtcLogEntity::class,
    ],
    version = 6,
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
    abstract fun diagnosticScanDao(): DiagnosticScanDao
    abstract fun dtcLogDao(): DtcLogDao

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

        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `vehicles` ADD COLUMN `image_url` TEXT")
            }
        }

        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `fuel_level_before_pct` REAL")
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `fuel_liters_before` REAL")
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `fuel_level_after_pct` REAL")
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `fuel_liters_after` REAL")
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `calculated_consumption_l100km` REAL")
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `prev_odometer_km` REAL")
                db.execSQL("ALTER TABLE `fuel_logs` ADD COLUMN `fuel_consumed_liters` REAL")
            }
        }

        val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `diagnostic_scans` (" +
                        "`id` TEXT NOT NULL, " +
                        "`vehicle_id` TEXT NOT NULL, " +
                        "`device_id` TEXT, " +
                        "`scanned_at` INTEGER NOT NULL, " +
                        "`odometer_km` REAL, " +
                        "`mil_status` INTEGER NOT NULL, " +
                        "`dtc_count` INTEGER NOT NULL, " +
                        "`scan_type` TEXT NOT NULL, " +
                        "`source` TEXT NOT NULL, " +
                        "PRIMARY KEY(`id`))"
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_diagnostic_scans_vehicle_id_scanned_at` ON `diagnostic_scans` (`vehicle_id`, `scanned_at`)")
                db.execSQL("DROP INDEX IF EXISTS `index_diagnostic_scans_vehicle_id_scanned_at_id`")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_diagnostic_scans_vehicle_id_scanned_at_id` ON `diagnostic_scans` (`vehicle_id`, `scanned_at`, `id`)")
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `dtc_logs` (" +
                        "`id` TEXT NOT NULL, " +
                        "`scan_id` TEXT, " +
                        "`vehicle_id` TEXT NOT NULL, " +
                        "`device_id` TEXT, " +
                        "`dtc_code` TEXT NOT NULL, " +
                        "`status` TEXT NOT NULL, " +
                        "`system_category` TEXT, " +
                        "`severity` TEXT, " +
                        "`description_vi` TEXT, " +
                        "`freeze_frame` TEXT, " +
                        "`is_active` INTEGER NOT NULL, " +
                        "`source` TEXT NOT NULL, " +
                        "`first_detected_at` INTEGER, " +
                        "`last_detected_at` INTEGER, " +
                        "`cleared_at` INTEGER, " +
                        "`scanned_at` INTEGER NOT NULL, " +
                        "PRIMARY KEY(`id`))"
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_dtc_logs_vehicle_id_is_active` ON `dtc_logs` (`vehicle_id`, `is_active`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_dtc_logs_vehicle_id_scanned_at` ON `dtc_logs` (`vehicle_id`, `scanned_at`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_dtc_logs_scan_id` ON `dtc_logs` (`scan_id`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_dtc_logs_vehicle_id_is_active_dtc_code` ON `dtc_logs` (`vehicle_id`, `is_active`, `dtc_code`)")
            }
        }
    }
}