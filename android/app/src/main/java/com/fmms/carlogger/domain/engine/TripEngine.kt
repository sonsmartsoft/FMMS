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

    private var processorJob: Job? = null

    fun start() {
        if (processorJob?.isActive == true) return
        processorJob = scope.launch {
            while (isActive) {
                evaluate()
                delay(1000)
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
        val engineRunning = (live.rpm != null && live.rpm!! > 0) || (live.speedKmh != null && live.speedKmh!! > 1.0)
        val moved = movedSinceLast(live)

        when {
            // START
            !lastEngineRunning && engineRunning && tripId == null -> startTrip(vehicle.id, vehicle, live)

            // UPDATE
            tripId != null && (engineRunning || moved) -> updateTrip(vehicle, live)

            // STOP
            tripId != null && !engineRunning && !moved -> {
                val now = System.currentTimeMillis()
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
        val elapsed = now - startTime
        val speed = live.speedKmh ?: 0.0
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

        val trip = TripEntity(
            id = id,
            vehicleId = vId,
            deviceId = null,
            startTime = startTime,
            endTime = now,
            startOdometer = startOdometer,
            endOdometer = odo,
            distanceKm = dist,
            durationSeconds = (now - startTime),
            fuelStartPercent = tripRepository.getActiveTrip(vId)?.fuelStartPercent,
            fuelEndPercent = lastFuelLevel,
            fuelUsedLiters = if (fuelUsed > 0) fuelUsed else null,
            averageConsumptionL100km = consumption,
            averageSpeedKmh = if ((now - startTime) > 0) dist / ((now - startTime) / 3600.0) else 0.0,
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
            // sub-threshold: discard (avoid noise trips)
            tripRepository.completeAndEnqueue(trip)
        }

        tripId = null
        stoppedSince = null
        _state.value = TripLiveState()
    }

    private fun movedSinceLast(live: LiveTelemetry): Boolean {
        if (live.latitude == null || live.longitude == null) return false
        val last = lastGpsPoint ?: return false
        val p = Location("gps").apply { latitude = live.latitude!!; longitude = live.longitude!! }
        return distanceKm(last, p) > 0.02
    }

    private fun distanceKm(a: Location, b: Location): Double = a.distanceTo(b) / 1000.0
}