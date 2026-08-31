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
    /** Còn dòng PENDING (chưa đẩy lên cloud) cho entity này không — để backfill không nạp trùng. */
    suspend fun hasPendingForEntity(type: String, entityId: String): Boolean =
        syncQueueDao.pendingForEntity(type, entityId) > 0

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

    /** Enqueue one OBD telemetry sample for cloud sync (web table telemetry_samples). */
    suspend fun enqueueTelemetrySample(sample: TelemetrySampleEntity) {
        val deviceId = sample.deviceId ?: com.fmms.carlogger.AppContainer.prefs.getDeviceId()
        fun num(v: Double?): Any = v ?: JSONObject.NULL
        val payload = JSONObject().apply {
            put("id", sample.id)
            put("asset_id", sample.vehicleId)
            put("device_id", deviceId)
            put("trip_id", JSONObject.NULL)
            put("timestamp", iso(sample.timestamp))
            put("rpm", num(sample.rpm))
            put("speed_kmh", num(sample.speedKmh))
            put("engine_load_percent", num(sample.engineLoadPercent))
            put("coolant_temp_c", num(sample.coolantTempC))
            put("intake_temp_c", num(sample.intakeTempC))
            put("maf_gps", num(sample.mafGps))
            put("throttle_percent", num(sample.throttlePercent))
            put("fuel_level_percent", num(sample.fuelLevelPercent))
            put("fuel_rate_lph", num(sample.fuelRateLph))
            put("battery_voltage", num(sample.batteryVoltage))
            put("engine_runtime_seconds", sample.engineRuntimeSeconds?.toInt() ?: JSONObject.NULL)
            put("stft", num(sample.stft))
            put("ltft", num(sample.ltft))
            put("odometer_km", num(sample.odometerKm))
            put("latitude", num(sample.latitude))
            put("longitude", num(sample.longitude))
            put("gps_speed_kmh", num(sample.gpsSpeedKmh))
            put("gps_accuracy", num(sample.gpsAccuracy))
            put("connection_quality", sample.connectionQuality)
            put("data_quality", sample.dataQuality)
            put("raw_source", sample.rawSource)
        }.toString()
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                vehicleId = sample.vehicleId,
                entityType = "telemetry_samples",
                entityId = sample.id,
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

    /** Enqueue một lần đổ xăng lên web (bảng fuel_logs). Idempotent theo UUID client. */
    suspend fun enqueueFuelLog(log: com.fmms.carlogger.core.database.entity.FuelLogEntity) {
        val deviceId = com.fmms.carlogger.AppContainer.prefs.getDeviceId()
        fun num(v: Double?): Any = v ?: JSONObject.NULL
        val payload = JSONObject().apply {
            put("id", log.id)
            put("asset_id", log.vehicleId)
            put("device_id", deviceId)
            put("timestamp", iso(log.timestamp))
            put("odometer_km", log.odometerKm ?: 0.0)
            put("fuel_liters", log.fuelLiters)
            put("price_per_liter", log.pricePerLiter ?: 0.0)
            put("total_cost", log.totalCost ?: 0.0)
            put("currency", log.currency.ifEmpty { "VND" })
            put("station", log.station ?: JSONObject.NULL)
            put("tank_full", log.tankFull)
            put("notes", log.notes ?: JSONObject.NULL)
            put("created_at", iso(log.createdAt))
            put("updated_at", iso(log.updatedAt))
        }.toString()
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                vehicleId = log.vehicleId,
                entityType = "fuel_logs",
                entityId = log.id,
                operation = "UPSERT",
                payload = payload,
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

    /**
     * Xóa các row PENDING thuộc xe cũ/khác xe hiện tại (payload mồ côi sau khi
     * đổi vehicle id) hoặc payload trips định dạng cũ dùng key "vehicle_id".
     * Trả về số row đã xóa.
     */
    suspend fun purgeOrphanedPayloads(currentVehicleId: String): Int {
        var removed = 0
        for (entry in syncQueueDao.getPending(limit = 1000)) {
            val owner = ownerOf(entry.entityType, entry.payload) ?: continue
            if (owner != currentVehicleId) {
                syncQueueDao.deleteById(entry.id)
                removed++
            }
        }
        return removed
    }

    /** Trả về UUID xe mà payload này thuộc về; null nếu không xác định (vd devices). */
    private fun ownerOf(entityType: String, payload: String): String? {
        return try {
            when (entityType) {
                "devices" -> null
                "vehicles" -> JSONObject(payload).optString("id").ifEmpty { null }
                "trips", "fuel_logs" -> {
                    val o = JSONObject(payload)
                    // Định dạng cũ sai schema (vehicle_id) -> coi như mồ côi để purge.
                    if (o.has("vehicle_id")) "\u0000stale" else o.optString("asset_id").ifEmpty { null }
                }
                else -> {
                    val arr = org.json.JSONArray(payload)
                    var owner: String? = null
                    var mixed = false
                    for (i in 0 until arr.length()) {
                        val o = arr.optJSONObject(i) ?: continue
                        val v = o.optString("asset_id", "").ifEmpty { o.optString("vehicle_id", "") }
                        if (v.isNotEmpty()) {
                            if (owner != null && v != owner) mixed = true
                            if (owner == null) owner = v
                        }
                    }
                    if (mixed) null else owner
                }
            }
        } catch (_: Exception) {
            null
        }
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
            "last_seen", "created_at", "updated_at", "start_time", "end_time", "recorded_at", "timestamp",
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
    suspend fun getAllByVehicle(vehicleId: String): List<TripEntity> = tripDao.getAllByVehicle(vehicleId)


    suspend fun getActiveTrip(vehicleId: String): TripEntity? = tripDao.getActiveTrip(vehicleId)

    suspend fun getActiveTrips(vehicleId: String): List<TripEntity> = tripDao.getActiveTrips(vehicleId)

    suspend fun getAllActiveTrips(): List<TripEntity> = tripDao.getAllActiveTrips()

    /** Xóa chuyến rác (phantom) — không đồng bộ, chỉ local. */
    suspend fun deleteById(id: String) {
        tripDao.deleteById(id)
    }

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