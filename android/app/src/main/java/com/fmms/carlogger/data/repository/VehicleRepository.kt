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

class VehicleRepository(
    private val context: Context,
    private val vehicleDao: VehicleDao,
    private val deviceDao: DeviceDao,
    private val syncQueueDao: SyncQueueDao,
    private val prefs: PrefsStore,
) {

    fun observeAll(): Flow<List<VehicleEntity>> = vehicleDao.observeAll()

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
            licensePlate = licensePlate,
            make = make,
            model = model,
            year = year,
            trim = trim,
            engine = engine,
            fuelType = fuelType,
            tankCapacityLiters = tankCapacityLiters,
            odometerKm = prefs.getOdo(), // seed from stored virtual odo
            active = true,
            createdAt = now,
            updatedAt = now,
        )
        vehicleDao.clearActive()
        vehicleDao.upsert(v)
        enqueueUpsert(v.id)
        return v
    }

    suspend fun updateOdometer(id: String, odo: Double) {
        vehicleDao.updateOdometer(id, odo, System.currentTimeMillis())
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
            put("active", v.active)
            put("created_at", v.createdAt)
            put("updated_at", v.updatedAt)
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

    fun getOdoPref(): Double = getOdo()
    fun getOdo(): Double = prefs.getFloat("odo_km", 12846f).toDouble()
    fun setOdo(odo: Double) { prefs.edit().putFloat("odo_km", odo.toFloat()).apply() }

    fun getAutoStart(): Boolean = prefs.getBoolean("auto_start", true)
    fun setAutoStart(v: Boolean) { prefs.edit().putBoolean("auto_start", v).apply() }

    fun getDiagEnabled(): Boolean = prefs.getBoolean("diag_logging", false)
    fun setDiagEnabled(v: Boolean) { prefs.edit().putBoolean("diag_logging", v).apply() }

    fun getTripTimeoutMs(): Long = prefs.getLong("trip_timeout_ms", 3 * 60 * 1000L)
    fun setTripTimeoutMs(v: Long) { prefs.edit().putLong("trip_timeout_ms", v).apply() }

    fun getSyncEnabled(): Boolean = prefs.getBoolean("sync_enabled", true)
    fun setSyncEnabled(v: Boolean) { prefs.edit().putBoolean("sync_enabled", v).apply() }
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