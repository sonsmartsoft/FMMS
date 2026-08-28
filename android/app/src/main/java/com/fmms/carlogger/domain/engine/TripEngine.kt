package com.fmms.carlogger.domain.engine

import android.location.Location
import com.fmms.carlogger.core.database.entity.TripEntity
import com.fmms.carlogger.data.repository.TripRepository
import com.fmms.carlogger.data.repository.VehicleRepository
import com.fmms.carlogger.domain.model.LiveTelemetry
import com.fmms.carlogger.domain.model.TripLiveState
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.isActive

/**
 * Trip engine per spec §18:
 * - start when engine/movement detected
 * - end when engine off + no movement for timeout (default 3 min)
 * - temporary Bluetooth loss does NOT end a trip
 * - distance: odometer priority, GPS fallback (§19)
 *
 * Driven by [feed] from the telemetry service; kept testable without OBD.
 */
class TripEngine(
    private val vehicleRepository: VehicleRepository,
    private val tripRepository: TripRepository,
    private val scope: CoroutineScope,
    private val tripTimeoutMs: () -> Long = { 3 * 60 * 1000L },
) {

    companion object {
        /** Bằng chứng động cơ phải duy trì liên tục bao lâu mới bắt đầu chuyến. */
        const val START_DEBOUNCE_MS = 4_000L
        /** Chuyến ACTIVE sau restart mới hơn thế này thì nhận lại (resume). */
        const val ADOPT_WINDOW_MS = 10 * 60 * 1000L
    }

    private val _state = MutableStateFlow(TripLiveState())
    val state: StateFlow<TripLiveState> = _state

    var latestTelemetry: LiveTelemetry = LiveTelemetry()
        private set

    private var vehicleId: String? = null
    private var tripId: String? = null
    private var startTime: Long = 0L
    private var lastFuelLevel: Double? = null
    private var accumulatedFuelUsed = 0.0
    private var lastOdoKm: Double? = null
    private var startOdometer: Double? = null
    private var maxSpeed = 0.0
    private var startLat: Double? = null
    private var startLng: Double? = null
    private var lastGpsPoint: Location? = null
    private var prevGpsPoint: Location? = null
    private var consumedGpsPoint: Location? = null
    private var lastEngineRunning = false
    private var stoppedSince: Long? = null
    private var engineEvidenceSince: Long? = null
    private var lastTripPersistAt = 0L

    private var processorJob: Job? = null

    fun start() {
        if (processorJob?.isActive == true) return
        processorJob = scope.launch {
            recoverOrphanedTrips()
            while (isActive) {
                try {
                    evaluate()
                } catch (_: Exception) {
                    // Never let a transient DB/IO error kill the trip processor —
                    // otherwise trips would stay ACTIVE forever.
                }
                delay(1000)
            }
        }
    }

    /**
     * Sau khi process chết/restart, các row ACTIVE cũ sẽ mồ côi (không ai đóng).
     * - Chuyến mới hơn [ADOPT_WINDOW_MS]: nhận lại làm chuyến hiện tại (resume).
     * - Chuyến cũ hơn: đóng lại local; nếu rác (0 km) thì xóa hẳn.
     */
    private suspend fun recoverOrphanedTrips() {
        val vehicle = vehicleRepository.getActive() ?: return
        val now = System.currentTimeMillis()
        val orphans = tripRepository.getAllActiveTrips()
        android.util.Log.d("FmmsTrip", "recoverOrphanedTrips: ${orphans.size} active row(s) total, current vehicle ${vehicle.id}")
        for (orphan in orphans) {
            if (orphan.vehicleId != vehicle.id) {
                // Row của xe cũ/khác — không bao giờ adopt; rác thì xóa, còn dữ liệu thì đóng.
                if (orphan.distanceKm <= 0.05 && (orphan.maxSpeedKmh ?: 0.0) < 5.0) {
                    android.util.Log.d("FmmsTrip", "delete foreign phantom ${orphan.id} veh=${orphan.vehicleId}")
                    tripRepository.deleteById(orphan.id)
                } else {
                    tripRepository.completeLocalOnly(
                        orphan.copy(
                            endTime = orphan.updatedAt,
                            durationSeconds = ((orphan.updatedAt - orphan.startTime) / 1000).coerceAtLeast(orphan.durationSeconds),
                            status = "COMPLETED",
                        )
                    )
                }
                continue
            }
            if (tripId == null && now - orphan.startTime <= ADOPT_WINDOW_MS &&
                (orphan.distanceKm > 0.05 || (orphan.maxSpeedKmh ?: 0.0) >= 5.0)
            ) {
                android.util.Log.d("FmmsTrip", "adopt trip ${orphan.id} dist=${orphan.distanceKm}")
                tripId = orphan.id
                startTime = orphan.startTime
                startOdometer = orphan.startOdometer
                lastOdoKm = orphan.endOdometer ?: orphan.startOdometer ?: vehicle.odometerKm
                lastFuelLevel = orphan.fuelStartPercent
                accumulatedFuelUsed = orphan.fuelUsedLiters ?: 0.0
                maxSpeed = orphan.maxSpeedKmh ?: 0.0
                startLat = orphan.startLatitude
                startLng = orphan.startLongitude
                _state.value = TripLiveState(
                    active = true,
                    distanceKm = orphan.distanceKm,
                    durationSeconds = orphan.durationSeconds,
                    maxSpeedKmh = maxSpeed,
                    startLatitude = startLat,
                    startLongitude = startLng,
                )
            } else if (orphan.distanceKm <= 0.05 && (orphan.maxSpeedKmh ?: 0.0) < 5.0) {
                android.util.Log.d("FmmsTrip", "delete phantom ${orphan.id} start=${orphan.startTime}")
                tripRepository.deleteById(orphan.id)
            } else {
                android.util.Log.d("FmmsTrip", "close stale ${orphan.id} dist=${orphan.distanceKm}")
                tripRepository.completeLocalOnly(
                    orphan.copy(
                        endTime = orphan.updatedAt,
                        durationSeconds = ((orphan.updatedAt - orphan.startTime) / 1000).coerceAtLeast(orphan.durationSeconds),
                        status = "COMPLETED",
                    )
                )
            }
        }
    }

    /** Called by the service on each telemetry emission. */
    suspend fun feed(telemetry: LiveTelemetry) {
        latestTelemetry = telemetry
        if (telemetry.latitude != null && telemetry.longitude != null) {
            val p = Location("gps").apply { latitude = telemetry.latitude!!; longitude = telemetry.longitude!! }
            if (lastGpsPoint == null || distanceKm(lastGpsPoint!!, p) > 0.001) {
                prevGpsPoint = lastGpsPoint
                lastGpsPoint = p
            }
        }
    }

    private suspend fun evaluate() {
        val vehicle = vehicleRepository.getActive() ?: return
        if (vehicle.id != vehicleId) {
            closeActiveTrip(vehicleId, vehicle.id)
            vehicleId = vehicle.id
        }

        val live = latestTelemetry
        val now = System.currentTimeMillis()
        // Bằng chứng động cơ thật: idle ~640-760 rpm nên ngưỡng 300 lọc nhiễu
        // ignition-ON/adapter (rpm 0-vài chục). Tốc độ >3 km/h cũng là bằng chứng.
        val engineEvidence = (live.rpm != null && live.rpm!! > 300) ||
            (live.speedKmh != null && live.speedKmh!! > 3.0)
        val engineRunning = engineEvidence && run {
            if (engineEvidenceSince == null) engineEvidenceSince = now
            now - engineEvidenceSince!! >= START_DEBOUNCE_MS
        }
        if (!engineEvidence) engineEvidenceSince = null
        val moved = movedSinceLast(live)

        when {
            // START — chỉ khi bằng chứng duy trì liên tục (chống phantom)
            !lastEngineRunning && engineRunning && tripId == null -> {
                startTrip(vehicle.id, vehicle, live)
                engineEvidenceSince = null
            }

            // UPDATE
            tripId != null && (engineRunning || moved) -> updateTrip(vehicle, live)

            // STOP
            tripId != null && !engineRunning && !moved -> {
                if (stoppedSince == null) stoppedSince = now
                if (now - stoppedSince!! > tripTimeoutMs()) {
                    closeActiveTrip(vehicleId, vehicle.id)
                }
            }
        }

        lastEngineRunning = engineRunning
    }

    private suspend fun startTrip(vehicleId: String, vehicle: com.fmms.carlogger.core.database.entity.VehicleEntity, live: LiveTelemetry) {
        tripId = UUID.randomUUID().toString()
        startTime = System.currentTimeMillis()
        lastFuelLevel = live.fuelLevelPercent
        accumulatedFuelUsed = 0.0
        lastOdoKm = vehicle.odometerKm
        startOdometer = vehicle.odometerKm
        startLat = live.latitude ?: lastGpsPoint?.latitude
        startLng = live.longitude ?: lastGpsPoint?.longitude
        maxSpeed = 0.0
        stoppedSince = null

        val trip = TripEntity(
            id = tripId!!,
            vehicleId = vehicleId,
            deviceId = null,
            startTime = startTime,
            endTime = null,
            startOdometer = startOdometer,
            endOdometer = null,
            distanceKm = 0.0,
            durationSeconds = 0,
            fuelStartPercent = lastFuelLevel,
            fuelEndPercent = null,
            fuelUsedLiters = null,
            averageConsumptionL100km = null,
            averageSpeedKmh = 0.0,
            maxSpeedKmh = null,
            startLatitude = startLat,
            startLongitude = startLng,
            endLatitude = null,
            endLongitude = null,
            status = "ACTIVE",
            createdAt = startTime,
            updatedAt = startTime,
        )
        tripRepository.startTrip(trip)
        _state.value = TripLiveState(active = true, startLatitude = startLat, startLongitude = startLng)
    }

    private suspend fun updateTrip(vehicle: com.fmms.carlogger.core.database.entity.VehicleEntity, live: LiveTelemetry) {
        val now = System.currentTimeMillis()
        // end-to-end elapsed in SECONDS (startTime/now are epoch millis)
        val elapsed = (now - startTime) / 1000
        // Defence against bogus GPS/OBD spikes: only track plausible speeds.
        val speed = (live.speedKmh ?: 0.0).takeIf { it.isFinite() && it in 0.0..300.0 } ?: 0.0
        if (speed > maxSpeed) maxSpeed = speed
        stoppedSince = null

        // Distance: odometer priority, then GPS
        var distance = 0.0
        val odo = live.odometerKm ?: vehicle.odometerKm
        if (lastOdoKm != null && odo != null && odo > lastOdoKm!!) {
            distance = odo - lastOdoKm!!
        }
        if (prevGpsPoint != null && lastGpsPoint != null && lastGpsPoint !== consumedGpsPoint) {
            val gpsDist = distanceKm(prevGpsPoint!!, lastGpsPoint!!)
            if (gpsDist > distance) distance = gpsDist
            consumedGpsPoint = lastGpsPoint
        }
        lastOdoKm = odo

        // Fuel used: prefer 015E fuel rate (L/h → L/s)
        if (live.fuelRateLph != null) {
            accumulatedFuelUsed += live.fuelRateLph!! / 3600.0
        } else if (live.fuelLevelPercent != null && lastFuelLevel != null) {
            val delta = lastFuelLevel!! - live.fuelLevelPercent!!
            if (delta > 0 && delta < 10) {
                accumulatedFuelUsed += vehicle.tankCapacityLiters * delta / 100.0
            }
        }
        lastFuelLevel = live.fuelLevelPercent

        val current = _state.value
        val dist = current.distanceKm + distance
        _state.value = current.copy(
            active = true,
            distanceKm = dist,
            durationSeconds = elapsed,
            maxSpeedKmh = maxSpeed,
        )

        val consumption = if (dist > 0.05 && accumulatedFuelUsed > 0) accumulatedFuelUsed / dist * 100 else null
        val avgSpeed = if (elapsed > 0) dist / (elapsed / 3600.0) else 0.0

        tripRepository.getActiveTrip(vehicle.id)?.let { trip ->
            val updated = trip.copy(
                distanceKm = dist,
                durationSeconds = elapsed,
                endOdometer = odo,
                averageSpeedKmh = avgSpeed,
                maxSpeedKmh = if (maxSpeed > 0) maxSpeed else null,
                fuelUsedLiters = if (accumulatedFuelUsed > 0) accumulatedFuelUsed else null,
                averageConsumptionL100km = consumption,
                updatedAt = now,
            )
            tripRepository.startTrip(updated)
        }
    }

    private suspend fun closeActiveTrip(forVehicleId: String?, newVehicleId: String? = null) {
        val id = tripId ?: return
        val vId = forVehicleId ?: newVehicleId ?: return
        val vehicle = vehicleRepository.getById(vId)
        val now = System.currentTimeMillis()
        val current = _state.value
        val odo = lastOdoKm ?: vehicle?.odometerKm

        var fuelUsed = accumulatedFuelUsed
        var consumption: Double? = null
        val dist = current.distanceKm
        if (fuelUsed > 0 && dist > 0.05) consumption = fuelUsed / dist * 100

        val elapsedSeconds = (now - startTime) / 1000.0

        val trip = TripEntity(
            id = id,
            vehicleId = vId,
            deviceId = null,
            startTime = startTime,
            endTime = now,
            startOdometer = startOdometer,
            endOdometer = odo,
            distanceKm = dist,
            durationSeconds = (now - startTime) / 1000,
            fuelStartPercent = tripRepository.getActiveTrip(vId)?.fuelStartPercent,
            fuelEndPercent = lastFuelLevel,
            fuelUsedLiters = if (fuelUsed > 0) fuelUsed else null,
            averageConsumptionL100km = consumption,
            averageSpeedKmh = if (elapsedSeconds > 0) dist / (elapsedSeconds / 3600.0) else 0.0,
            maxSpeedKmh = if (maxSpeed > 0) maxSpeed else null,
            startLatitude = startLat,
            startLongitude = startLng,
            endLatitude = lastGpsPoint?.latitude,
            endLongitude = lastGpsPoint?.longitude,
            status = "COMPLETED",
            createdAt = startTime,
            updatedAt = now,
        )
        if (trip.distanceKm > 0.05) {
            tripRepository.completeAndEnqueue(trip)
            if (odo != null) vehicleRepository.updateOdometer(vId, odo)
        } else {
            // Chuyến quá ngắn: chỉ lưu local, không đồng bộ (tránh rác + lệch odometer server)
            tripRepository.completeLocalOnly(trip)
        }

        tripId = null
        stoppedSince = null
        _state.value = TripLiveState()
    }

    /**
     * "Moving" = real speed, not GPS jitter. Stationary GPS drift (< 3 km/h,
     * up to tens of metres) must NOT keep a stopped trip alive forever.
     */
    private fun movedSinceLast(live: LiveTelemetry): Boolean {
        val obdSpeed = live.speedKmh ?: 0.0
        val gpsSpeed = live.gpsSpeedKmh ?: 0.0
        return obdSpeed > 3.0 || gpsSpeed > 3.0
    }

    private fun distanceKm(a: Location, b: Location): Double = a.distanceTo(b) / 1000.0
}