package com.fmms.carlogger.data.repository

import android.content.Context
import com.fmms.carlogger.core.database.dao.DeviceDao
import com.fmms.carlogger.core.database.dao.SyncQueueDao
import com.fmms.carlogger.core.database.dao.VehicleDao
import com.fmms.carlogger.core.database.entity.DeviceEntity
import com.fmms.carlogger.core.database.entity.SyncQueueEntity
import com.fmms.carlogger.core.database.entity.VehicleEntity
import com.fmms.carlogger.core.obd.OBDConnectionManager
import com.fmms.carlogger.domain.model.LiveTelemetry
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import org.json.JSONObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

class VehicleRepository(
    private val context: Context,
    private val vehicleDao: VehicleDao,
    private val deviceDao: DeviceDao,
    private val syncQueueDao: SyncQueueDao,
    private val prefs: PrefsStore,
) {

    fun observeAll(): Flow<List<VehicleEntity>> = vehicleDao.observeAll()

    suspend fun getAll(): List<VehicleEntity> = vehicleDao.getAll()

    suspend fun getActive(): VehicleEntity? = vehicleDao.getActive()

    suspend fun getById(id: String): VehicleEntity? = vehicleDao.getById(id)

    suspend fun addVehicle(
        make: String,
        model: String,
        year: Int,
        trim: String,
        licensePlate: String,
        vin: String?,
        engine: String,
        fuelType: String,
        tankCapacityLiters: Double,
    ): VehicleEntity {
        val now = System.currentTimeMillis()
        val v = VehicleEntity(
            id = UUID.randomUUID().toString(),
            fleetId = null,
            vin = vin,
            name = "",
            licensePlate = licensePlate,
            make = make,
            model = model,
            year = year,
            trim = trim,
            engine = engine,
            fuelType = fuelType,
            tankCapacityLiters = tankCapacityLiters,
            odometerKm = 0.0,
            active = true,
            createdAt = now,
            updatedAt = now,
        )
        vehicleDao.clearActive()
        vehicleDao.upsert(v)
        enqueueUpsert(v.id)
        return v
    }

    private var lastOdoPushAt: Long = 0L

    suspend fun updateOdometer(id: String, odo: Double) {
        vehicleDao.updateOdometer(id, odo, System.currentTimeMillis())
        // Push the new odometer to the web, throttled to once per minute —
        // this runs on every telemetry cycle when the engine is live.
        val now = System.currentTimeMillis()
        if (now - lastOdoPushAt > 60_000) {
            lastOdoPushAt = now
            enqueueUpsert(id)
        }
    }

    suspend fun updateVehicle(v: VehicleEntity) {
        vehicleDao.upsert(v.copy(updatedAt = System.currentTimeMillis()))
        enqueueUpsert(v.id)
    }

    suspend fun setActive(id: String) {
        vehicleDao.clearActive()
        vehicleDao.setActive(id)
    }

    /** Register the KW906 device against the active vehicle (spec §9). */
    suspend fun registerDevice(macAddress: String, modelName: String): DeviceEntity? {
        val vehicle = getActive() ?: return null
        val existing = deviceDao.getByVehicle(vehicle.id)
        if (existing?.macAddress == macAddress) return existing
        val now = System.currentTimeMillis()
        val device = DeviceEntity(
            id = existing?.id ?: UUID.randomUUID().toString(),
            vehicleId = vehicle.id,
            deviceType = "ELM327-BT",
            deviceName = modelName,
            macAddress = macAddress,
            serialNumber = null,
            appVersion = "1.0.0",
            lastSeen = now,
            status = "CONNECTED",
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
        )
        deviceDao.upsert(device)
        deviceDao.updateStatus(device.id, now, "CONNECTED", now)
        return device
    }

    suspend fun getDeviceByVehicle(vehicleId: String): DeviceEntity? = deviceDao.getByVehicle(vehicleId)

    fun observeDeviceByMac(mac: String): Flow<DeviceEntity?> = deviceDao.observeByMac(mac)

    /**
     * Pull the fleet vehicles this device is allowed to see from the web
     * (`GET /rpc/get_fleet_vehicles` edge function, Cách B) and merge into
     * local Room so THIẾT BỊ can assign an official web vehicle_id.
     */
    suspend fun pullWebVehicles(): List<VehicleEntity> {
        val body = JSONObject().apply { put("p_device_id", prefs.getDeviceId()) }
        val request = okhttp3.Request.Builder()
            .url("${com.fmms.carlogger.BuildConfig.SUPABASE_URL}/rest/v1/rpc/get_fleet_vehicles")
            .header("apikey", com.fmms.carlogger.BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            .header("Authorization", "Bearer ${com.fmms.carlogger.BuildConfig.SUPABASE_PUBLISHABLE_KEY}")
            .header("Content-Type", "application/json")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()
        val resp = try {
            okhttp3.OkHttpClient().newCall(request).execute()
        } catch (e: Exception) {
            return emptyList()
        }
        if (!resp.isSuccessful) return emptyList()
        val text = resp.body?.string() ?: return emptyList()
        val arr = try { org.json.JSONArray(text) } catch (e: Exception) { return emptyList() }
        val result = mutableListOf<VehicleEntity>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val id = o.optString("id")
            if (id.isBlank()) continue
            val now = System.currentTimeMillis()
            val v = VehicleEntity(
                id = id,
                fleetId = o.optString("fleet_id").takeIf { it.isNotBlank() },
                vin = o.optString("vin").takeIf { it.isNotBlank() },
                name = o.optString("name"),
                licensePlate = o.optString("license_plate").takeIf { it.isNotBlank() } ?: "",
                make = o.optString("make").takeIf { it.isNotBlank() } ?: "",
                model = o.optString("model").takeIf { it.isNotBlank() } ?: "",
                year = o.optInt("year", 0),
                trim = o.optString("trim").takeIf { it.isNotBlank() } ?: "",
                engine = o.optString("engine").takeIf { it.isNotBlank() } ?: "",
                fuelType = o.optString("fuel_type").takeIf { it.isNotBlank() } ?: "",
                tankCapacityLiters = o.optDouble("tank_capacity_liters", 0.0),
                odometerKm = o.optDouble("odometer_km", 0.0),
                imageUrl = o.optString("image_url").takeIf { it.isNotBlank() },
                active = false,
                createdAt = now,
                updatedAt = now,
            )
            vehicleDao.upsert(v)
            result += v
        }
        // Prune stale web-synced vehicles that no longer exist on the web
        // (e.g. after a dedupe). Only touch rows that came from the web
        // (fleet_id NOT NULL); locally-created vehicles are untouched.
        val webIds = result.map { it.id }.toSet()
        vehicleDao.getAll()
            .filter { it.fleetId != null && it.id !in webIds }
            .forEach { vehicleDao.delete(it) }
        return result
    }

    /** Register/refresh this device against its assigned web vehicle. */
    suspend fun registerDeviceWithVehicle(assignedVehicleId: String, deviceName: String): DeviceEntity? {
        val vehicle = vehicleDao.getById(assignedVehicleId) ?: return null
        val mac = prefs.getObdMacAddress()
        val now = System.currentTimeMillis()
        val d = DeviceEntity(
            id = prefs.getDeviceId(),
            vehicleId = vehicle.id,
            deviceType = if (prefs.getDeviceMode() == "gps") "GPS-TRACKER" else "ELM327-BT",
            deviceName = deviceName,
            macAddress = mac ?: prefs.getDeviceId(),
            serialNumber = null,
            appVersion = "1.0.0",
            lastSeen = now,
            status = "REGISTERED",
            createdAt = now,
            updatedAt = now,
        )
        deviceDao.upsert(d)
        val payload = JSONObject().apply {
            put("id", d.id)
            put("vehicle_id", d.vehicleId)
            put("device_type", d.deviceType)
            put("device_name", d.deviceName)
            put("mac_address", d.macAddress)
            put("last_seen", iso(d.lastSeen))
            put("status", d.status)
            put("created_at", iso(d.createdAt))
            put("updated_at", iso(d.updatedAt))
        }.toString()
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                vehicleId = vehicle.id,
                entityType = "devices",
                entityId = d.id,
                operation = "UPSERT",
                payload = payload,
                createdAt = now,
            )
        )
        return d
    }

    /**
     * Make sure a device row is enqueued against the current (or last assigned)
     * web vehicle so gps_track_points inserts pass the RLS device check even
     * before the user explicitly taps "ĐỒNG BỘ". No-op if already registered.
     */
    suspend fun ensureDeviceRegistered(): DeviceEntity? {
        val vehicle = vehicleDao.getActive()
            ?: prefs.getAssignedVehicleId()?.let { vehicleDao.getById(it) }
            ?: return null
        val existing = deviceDao.getByVehicle(vehicle.id)
        if (existing != null) return existing
        return registerDeviceWithVehicle(vehicle.id, prefs.getDeviceName() ?: "Tracker")
    }

    private fun iso(millis: Long?): Any {
        if (millis == null) return JSONObject.NULL
        return java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { setTimeZone(java.util.TimeZone.getTimeZone("UTC")) }
            .format(java.util.Date(millis))
    }

    private suspend fun enqueueUpsert(vehicleId: String) {
        val v = vehicleDao.getById(vehicleId) ?: return
        val payload = JSONObject().apply {
            put("id", v.id)
            put("fleet_id", v.fleetId ?: JSONObject.NULL)
            put("vin", v.vin ?: JSONObject.NULL)
            put("license_plate", v.licensePlate)
            put("make", v.make)
            put("model", v.model)
            put("year", v.year)
            put("trim", v.trim)
            put("engine", v.engine)
            put("fuel_type", v.fuelType)
            put("tank_capacity_liters", v.tankCapacityLiters)
            put("odometer_km", v.odometerKm)
            put("image_url", v.imageUrl ?: JSONObject.NULL)
            put("active", v.active)
            put("created_at", iso(v.createdAt))
            put("updated_at", iso(v.updatedAt))
        }.toString()
        syncQueueDao.insert(
            SyncQueueEntity(
                id = UUID.randomUUID().toString(),
                vehicleId = v.id,
                entityType = "vehicles",
                entityId = v.id,
                operation = "UPSERT",
                payload = payload,
                createdAt = System.currentTimeMillis(),
            )
        )
    }
}

/** Simple encrypted preferences wrapper for settings + secure OBD MAC. */
class PrefsStore(context: Context) {
    private val prefs = context.getSharedPreferences("fmms_settings", Context.MODE_PRIVATE)

    fun getMac(): String? = prefs.getString(OBDConnectionManager.PREF_OBD_MAC, null)
    fun setMac(mac: String?) { prefs.edit().putString(OBDConnectionManager.PREF_OBD_MAC, mac).apply() }
    fun getDeviceName(): String? = prefs.getString(OBDConnectionManager.PREF_OBD_NAME, null)
    fun setDeviceName(name: String?) { prefs.edit().putString(OBDConnectionManager.PREF_OBD_NAME, name).apply() }

    /** Stable per-install tracker id (device identity for GPS-only trackers). */
    fun getDeviceId(): String {
        val existing = prefs.getString("device_id", null)
        if (existing != null) return existing
        val id = UUID.randomUUID().toString()
        prefs.edit().putString("device_id", id).apply()
        return id
    }

    /** Web-managed vehicle this device is permanently assigned to (Cách B). */
    fun getAssignedVehicleId(): String? = prefs.getString("assigned_vehicle_id", null)
    fun setAssignedVehicleId(id: String?) { prefs.edit().putString("assigned_vehicle_id", id).apply() }

    /** Bluetooth MAC of the OBD adapter (null for GPS-only trackers). */
    fun getObdMacAddress(): String? = getMac()

    /** Device mode: "obd" = ELM327 adapter (car) | "gps" = GPS-only tracker (bike). */
    fun getDeviceMode(): String = prefs.getString("device_mode", "obd") ?: "obd"
    fun setDeviceMode(mode: String) { prefs.edit().putString("device_mode", mode).apply() }

    /** Package names của các app ngoài được ghim vào dải phím tắt màn TỐC ĐỘ. */
    fun getAppShortcuts(): List<String> =
        prefs.getString("app_shortcuts", null)
            ?.split(",")
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?: emptyList()

    fun setAppShortcuts(list: List<String>) {
        prefs.edit().putString("app_shortcuts", list.joinToString(",")).apply()
    }

    /** URL trang web hiển thị trong khung WEB của tab Car UI. */
    fun getLastWebUrl(): String? = prefs.getString("carui_web_url", null)
    fun setLastWebUrl(url: String) { prefs.edit().putString("carui_web_url", url).apply() }

    /** Tab đang chọn trong khung media của Car UI (app/web/map) — persist để
     *  không bị reset khi xoay máy (hai nhánh layout có saveable-key khác nhau). */
    fun getMediaMode(): String = prefs.getString("carui_media_mode", "app") ?: "app"
    fun setMediaMode(mode: String) { prefs.edit().putString("carui_media_mode", mode).apply() }

    /** Kiểu bản đồ Car UI: "night" (mặc định) hoặc "day". */
    fun getMapStyle(): String = prefs.getString("carui_map_style", "night") ?: "night"
    fun setMapStyle(style: String) { prefs.edit().putString("carui_map_style", style).apply() }

    /** Map đang phóng toàn màn hình trong tab Car UI không. */
    fun getMapFull(): Boolean = prefs.getBoolean("carui_map_full", false)
    fun setMapFull(full: Boolean) { prefs.edit().putBoolean("carui_map_full", full).apply() }
    fun getWebFull(): Boolean = prefs.getBoolean("carui_web_full", false)
    fun setWebFull(full: Boolean) { prefs.edit().putBoolean("carui_web_full", full).apply() }
    fun getWebBarVisible(): Boolean = prefs.getBoolean("carui_web_bar", true)
    fun setWebBarVisible(visible: Boolean) { prefs.edit().putBoolean("carui_web_bar", visible).apply() }
    fun getCamFull(): Boolean = prefs.getBoolean("carui_cam_full", false)
    fun setCamFull(full: Boolean) { prefs.edit().putBoolean("carui_cam_full", full).apply() }

    /** Rail ngang: ghim hay tự ẩn (persist qua các lần mở app). */
    fun getRailPinned(): Boolean = prefs.getBoolean("rail_pinned", true)
    fun setRailPinned(v: Boolean) { prefs.edit().putBoolean("rail_pinned", v).apply() }

    /** GPS trackpoint recording interval in seconds. */
    fun getGpsIntervalSec(): Int = prefs.getInt("gps_interval_sec", 5).coerceIn(2, 60)
    fun setGpsIntervalSec(sec: Int) { prefs.edit().putInt("gps_interval_sec", sec).apply() }

    fun getOdoPref(): Double = getOdo()
    fun getOdo(): Double = prefs.getFloat("odo_km", 12846f).toDouble()
    fun setOdo(odo: Double) { prefs.edit().putFloat("odo_km", odo.toFloat()).apply() }

    fun getAutoStart(): Boolean = prefs.getBoolean("auto_start", true)
    fun setAutoStart(v: Boolean) { prefs.edit().putBoolean("auto_start", v).apply() }

    fun getDiagEnabled(): Boolean = prefs.getBoolean("diag_logging", false)
    fun setDiagEnabled(v: Boolean) { prefs.edit().putBoolean("diag_logging", v).apply() }

    fun getTripTimeoutMs(): Long = prefs.getLong("trip_timeout_ms", 2 * 60 * 1000L)
    fun setTripTimeoutMs(v: Long) { prefs.edit().putLong("trip_timeout_ms", v).apply() }

    fun getSyncEnabled(): Boolean = prefs.getBoolean("sync_enabled", true)
    fun setSyncEnabled(v: Boolean) { prefs.edit().putBoolean("sync_enabled", v).apply() }
    fun getFuelBackfillDone(): Boolean = prefs.getBoolean("fuel_backfill_done_v1", false)
    fun setFuelBackfillDone(v: Boolean) { prefs.edit().putBoolean("fuel_backfill_done_v1", v).apply() }

    fun getTheme(): String = prefs.getString("theme", "dark") ?: "dark"
    fun setTheme(v: String) { prefs.edit().putString("theme", v).apply() }

    fun getLanguage(): String = prefs.getString("language", "en") ?: "en"
    fun setLanguage(v: String) { prefs.edit().putString("language", v).apply() }

    /** AI Advisor: tự động đọc kết quả phân tích thành tiếng (TTS) sau khi xong. */
    fun getAiReadAloud(): Boolean = prefs.getBoolean("ai_read_aloud", true)
    fun setAiReadAloud(v: Boolean) { prefs.edit().putBoolean("ai_read_aloud", v).apply() }
}

/** Represents a raw OBD diagnostic log line (spec §15). */
data class DiagnosticLogEntry(
    val timestamp: Long,
    val command: String,
    val rawResponse: String,
    val pid: String,
    val parsedValue: String,
    val unit: String,
    val status: String,
    val error: String?,
)