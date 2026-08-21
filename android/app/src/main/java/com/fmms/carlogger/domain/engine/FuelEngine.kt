package com.fmms.carlogger.domain.engine

import com.fmms.carlogger.data.repository.TripRepository
import com.fmms.carlogger.data.repository.VehicleRepository
import com.fmms.carlogger.domain.model.FuelEstimate
import com.fmms.carlogger.domain.model.LiveTelemetry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update

/**
 * Fuel engine per spec §20-§23.
 * Priority: PID 012F → estimated liters → range; calibration via full-tank refuels.
 */
class FuelEngine(
    private val vehicleRepository: VehicleRepository,
    private val tripRepository: TripRepository,
    private val fuelLogRepository: FuelLogRepository,
) {

    private val _estimate = MutableStateFlow(FuelEstimate())
    val estimate: StateFlow<FuelEstimate> = _estimate

    private var lastFuelRate = 0.0
    private var accumulatedLiters = 0.0

    suspend fun onTelemetry(telemetry: LiveTelemetry) {
        val vehicle = vehicleRepository.getActive() ?: return _estimate.update { FuelEstimate() }

        val levelPercent = telemetry.fuelLevelPercent
        val estimatedLiters = levelPercent?.let { vehicle.tankCapacityLiters * it / 100.0 }

        if (telemetry.fuelRateLph != null) lastFuelRate = telemetry.fuelRateLph

        // Fuel consumption estimate: from last-trips consumption if available, else default
        val consumption = estimateConsumption(vehicle.id)
        val rangeKm = if (estimatedLiters != null && consumption != null && consumption > 0) {
            estimatedLiters / consumption * 100
        } else null

        _estimate.update {
            FuelEstimate(
                levelPercent = levelPercent,
                estimatedLiters = estimatedLiters,
                rangeKm = rangeKm,
                consumptionL100km = consumption,
                accumulatorFuelUsedLiters = accumulatedLiters,
                source = if (levelPercent != null) "OBD PID 012F" else "—",
                learningNote = if (rangeKm == null) "RANGE — Learning..." else null,
            )
        }
    }

    private suspend fun estimateConsumption(vehicleId: String): Double? {
        // Last 500 km of completed trips if we have odometer data
        val trips = tripRepository.getWithOdometer()
        val withOdo = trips.filter { it.endOdometer != null && it.startOdometer != null && it.fuelUsedLiters != null }
        if (withOdo.size >= 3) {
            val lastTrips = withOdo.takeLast(10)
            val dist = lastTrips.sumOf { it.distanceKm }
            val fuel = lastTrips.sumOf { it.fuelUsedLiters ?: 0.0 }
            if (fuel > 0 && dist > 0) return fuel / dist * 100
        }
        return null
    }
}

class FuelLogRepository(
    private val fuelLogDao: com.fmms.carlogger.core.database.dao.FuelLogDao,
) {
    fun observeByVehicle(vehicleId: String) = fuelLogDao.observeByVehicle(vehicleId)
    suspend fun getByVehicle(vehicleId: String) = fuelLogDao.getByVehicle(vehicleId)
    suspend fun upsert(log: com.fmms.carlogger.core.database.entity.FuelLogEntity) = fuelLogDao.upsert(log)
    suspend fun delete(log: com.fmms.carlogger.core.database.entity.FuelLogEntity) = fuelLogDao.delete(log)
    suspend fun getFullTankEvents(vehicleId: String) = fuelLogDao.getFullTankEvents(vehicleId)
    suspend fun totalsBetween(vehicleId: String, from: Long, to: Long) =
        fuelLogDao.getTotalsBetween(vehicleId, from, to).firstOrNull()
    suspend fun getBetween(vehicleId: String, from: Long, to: Long) =
        fuelLogDao.getBetween(vehicleId, from, to)
}