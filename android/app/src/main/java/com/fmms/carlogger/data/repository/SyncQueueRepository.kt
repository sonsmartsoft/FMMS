package com.fmms.carlogger.data.repository

import com.fmms.carlogger.core.database.dao.SyncQueueDao
import com.fmms.carlogger.core.database.dao.TelemetryDao
import com.fmms.carlogger.core.database.dao.TripDao
import com.fmms.carlogger.core.database.entity.SyncQueueEntity
import com.fmms.carlogger.core.database.entity.TelemetrySampleEntity
import com.fmms.carlogger.core.database.entity.TripEntity
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import org.json.JSONObject

class SyncQueueRepository(private val syncQueueDao: SyncQueueDao) {

    fun observePendingCount(): Flow<Int> = syncQueueDao.observePendingCountFlow()
    fun observeRecent(): Flow<List<SyncQueueEntity>> = syncQueueDao.observeRecent()
    suspend fun getPending(limit: Int): List<SyncQueueEntity> = syncQueueDao.getPending(limit)

    suspend fun enqueueTrip(trip: TripEntity) {
        val payload = JSONObject().apply {
            put("id", trip.id)
            put("vehicle_id", trip.vehicleId)
            put("device_id", trip.deviceId ?: JSONObject.NULL)
            put("start_time", trip.startTime)
            put("end_time", trip.endTime ?: JSONObject.NULL)
            put("start_odometer", trip.startOdometer ?: JSONObject.NULL)
            put("end_odometer", trip.endOdometer ?: JSONObject.NULL)
            put("distance_km", trip.distanceKm)
            put("duration_seconds", trip.durationSeconds)
            put("fuel_start_percent", trip.fuelStartPercent ?: JSONObject.NULL)
            put("fuel_end_percent", trip.fuelEndPercent ?: JSONObject.NULL)
            put("fuel_used_liters", trip.fuelUsedLiters ?: JSONObject.NULL)
            put("average_consumption_l100km", trip.averageConsumptionL100km ?: JSONObject.NULL)
            put("average_speed_kmh", trip.averageSpeedKmh ?: JSONObject.NULL)
            put("max_speed_kmh", trip.maxSpeedKmh ?: JSONObject.NULL)
            put("start_latitude", trip.startLatitude ?: JSONObject.NULL)
            put("start_longitude", trip.startLongitude ?: JSONObject.NULL)
            put("end_latitude", trip.endLatitude ?: JSONObject.NULL)
            put("end_longitude", trip.endLongitude ?: JSONObject.NULL)
            put("status", trip.status)
            put("created_at", trip.createdAt)
            put("updated_at", trip.updatedAt)
        }.toString()
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                vehicleId = trip.vehicleId,
                entityType = "trips",
                entityId = trip.id,
                operation = "UPSERT",
                payload = payload,
                createdAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun enqueueGpsPoints(points: List<com.fmms.carlogger.core.database.entity.GpsTrackPointEntity>) {
        if (points.isEmpty()) return
        val deviceName = com.fmms.carlogger.AppContainer.prefs.getDeviceName()
        val arr = org.json.JSONArray()
        points.forEach { p ->
            arr.put(
                JSONObject().apply {
                    put("id", p.id)
                    put("trip_id", p.tripId ?: JSONObject.NULL)
                    put("vehicle_id", p.vehicleId)
                    put("device_id", p.deviceId)
                    put("device_name", deviceName ?: JSONObject.NULL)
                    put("lat", p.lat)
                    put("lng", p.lng)
                    put("speed_kmh", p.speedKmh ?: JSONObject.NULL)
                    put("recorded_at", p.recordedAt)
                }
            )
        }
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                vehicleId = points.first().vehicleId,
                entityType = "gps_track_points",
                entityId = points.first().id,
                operation = "UPSERT",
                payload = arr.toString(),
                createdAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun markSynced(id: String) {
        syncQueueDao.markStatus(id, "SYNCED", null, System.currentTimeMillis())
    }

    suspend fun markFailed(id: String, error: String) {
        syncQueueDao.markStatus(id, "PENDING", error.take(200), null)
    }

    suspend fun deleteSynced(cutoff: Long) {
        syncQueueDao.deleteOldSynced(cutoff)
    }
}

class TelemetryRepository(private val telemetryDao: TelemetryDao) {

    suspend fun insertAll(samples: List<TelemetrySampleEntity>) {
        if (samples.isEmpty()) return
        telemetryDao.insertAll(samples)
    }

    suspend fun latestByVehicle(vehicleId: String, limit: Int = 1): List<TelemetrySampleEntity> =
        telemetryDao.getLatestByVehicle(vehicleId, limit)

    suspend fun getByTrip(tripId: String): List<TelemetrySampleEntity> =
        telemetryDao.getByTrip(tripId)

    suspend fun purgeOlderThan(cutoff: Long) {
        telemetryDao.deleteOlderThan(cutoff)
    }
}

class TripRepository(
    private val tripDao: TripDao,
    private val syncQueueRepository: SyncQueueRepository,
) {
    fun observeByVehicle(vehicleId: String): Flow<List<TripEntity>> = tripDao.observeByVehicle(vehicleId)

    suspend fun getActiveTrip(vehicleId: String): TripEntity? = tripDao.getActiveTrip(vehicleId)

    suspend fun startTrip(trip: TripEntity) {
        tripDao.upsert(trip)
    }

    suspend fun completeAndEnqueue(trip: TripEntity) {
        tripDao.upsert(trip)
        syncQueueRepository.enqueueTrip(trip)
    }

    suspend fun getBetween(vehicleId: String, from: Long, to: Long): List<TripEntity> =
        tripDao.getBetween(vehicleId, from, to)

    suspend fun getWithOdometer(): List<TripEntity> = tripDao.getWithOdometer()

    suspend fun getYears(vehicleId: String): List<Int> = tripDao.getYears(vehicleId)

    suspend fun aggregate(vehicleId: String): TripAggregate =
        tripDao.getAggregates(vehicleId).firstOrNull()?.let {
            TripAggregate(it.distanceKm, it.fuelUsedLiters, it.tripCount, it.maxSpeedKmh, it.avgSpeedKmh)
        } ?: TripAggregate(0.0, 0.0, 0, 0.0, 0.0)
}

data class TripAggregate(
    val distanceKm: Double,
    val fuelUsedLiters: Double,
    val tripCount: Int,
    val maxSpeedKmh: Double,
    val avgSpeedKmh: Double,
)

class GpsTrackRepository(
    private val gpsTrackPointDao: com.fmms.carlogger.core.database.dao.GpsTrackPointDao,
    private val syncQueueRepository: SyncQueueRepository,
) {
    suspend fun insertAndEnqueue(points: List<com.fmms.carlogger.core.database.entity.GpsTrackPointEntity>) {
        if (points.isEmpty()) return
        gpsTrackPointDao.insertAll(points)
        syncQueueRepository.enqueueGpsPoints(points)
    }

    suspend fun purgeOlderThan(cutoff: Long) {
        gpsTrackPointDao.purgeOlderThan(cutoff)
    }
}