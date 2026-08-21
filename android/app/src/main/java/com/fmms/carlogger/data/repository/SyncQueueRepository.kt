package com.fmms.carlogger.data.repository

import com.fmms.carlogger.core.database.dao.SyncQueueDao
import com.fmms.carlogger.core.database.dao.TelemetryDao
import com.fmms.carlogger.core.database.dao.TripDao
import com.fmms.carlogger.core.database.entity.SyncQueueEntity
import com.fmms.carlogger.core.database.entity.TelemetrySampleEntity
import com.fmms.carlogger.core.database.entity.TripEntity
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.UUID
import org.json.JSONObject

class SyncQueueRepository(private val syncQueueDao: SyncQueueDao) {

    fun observePendingCount(): Flow<Int> = syncQueueDao.observePendingCountFlow()
    fun observeRecent(): Flow<List<SyncQueueEntity>> = syncQueueDao.observeRecent()
    suspend fun getPending(limit: Int): List<SyncQueueEntity> = syncQueueDao.getPending(limit)
    suspend fun getPendingByType(type: String, limit: Int): List<SyncQueueEntity> =
        syncQueueDao.getPendingByType(type, limit)

    private fun iso(millis: Long?): Any {
        if (millis == null) return JSONObject.NULL
        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { setTimeZone(java.util.TimeZone.getTimeZone("UTC")) }
            .format(java.util.Date(millis))
    }

    suspend fun enqueueTrip(trip: TripEntity) {
        val deviceId = trip.deviceId ?: com.fmms.carlogger.AppContainer.prefs.getDeviceId()
        val payload = JSONObject().apply {
            put("id", trip.id)
            put("asset_id", trip.vehicleId)
            put("device_id", deviceId)
            put("start_time", iso(trip.startTime))
            put("end_time", iso(trip.endTime))
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
            put("created_at", iso(trip.createdAt))
            put("updated_at", iso(trip.updatedAt))
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
                    put("recorded_at", iso(p.recordedAt))
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

    /**
     * Tự sửa payload cũ bị lỗi code 22008: các cột timestamptz trước đây được
     * lưu dưới dạng epoch millis thô (vd 1787112128597) khiến Postgres fail parse.
     * Chuyển hết `last_seen/created_at/updated_at/start_time/end_time/recorded_at`
     * sang ISO-8601 ngay trong JSON đã lưu trong queue, không cần xoá dữ liệu.
     * Trả về số record đã sửa.
     */
    suspend fun repairStalePayloads(limit: Int = 500): Int {
        var repaired = 0
        for (entry in syncQueueDao.getPending(limit)) {
            val fixed = repairPayload(entry.payload) ?: continue
            if (fixed != entry.payload) {
                syncQueueDao.updatePayload(entry.id, fixed)
                repaired++
            }
        }
        return repaired
    }

    private fun repairPayload(payload: String): String? {
        return try {
            when (payload.trimStart().firstOrNull()) {
                '[' -> {
                    val arr = org.json.JSONArray(payload)
                    var changed = false
                    for (i in 0 until arr.length()) {
                        val o = arr.optJSONObject(i)
                        if (o != null && repairObject(o)) changed = true
                    }
                    if (changed) arr.toString() else null
                }
                '{' -> {
                    val o = JSONObject(payload)
                    if (repairObject(o)) o.toString() else null
                }
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    /** Sửa các cột timestamp về ISO nếu đang là epoch millis 13 chữ số. */
    private fun repairObject(o: JSONObject): Boolean {
        var changed = false
        TIMESTAMP_FIELDS.forEach { key ->
            val v = o.opt(key)
            if (v is Long && v >= 1_000_000_000_000L && v <= 9_999_999_999_999L) {
                o.put(key, iso(v))
                changed = true
            }
        }
        return changed
    }

    companion object {
        private val TIMESTAMP_FIELDS = listOf(
            "last_seen", "created_at", "updated_at", "start_time", "end_time", "recorded_at",
        )
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

    /** Hoàn tất chuyến quá ngắn (<0.05 km) chỉ ở máy — không đồng bộ để tránh rác trên server. */
    suspend fun completeLocalOnly(trip: TripEntity) {
        tripDao.upsert(trip)
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