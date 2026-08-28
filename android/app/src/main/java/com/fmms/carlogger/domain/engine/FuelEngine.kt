package com.fmms.carlogger.domain.engine

import com.fmms.carlogger.data.repository.SyncQueueRepository
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

    companion object {
        /** Mức tiêu thụ trung bình theo nhà sản xuất (Mazda2 AT 2026). */
        const val FALLBACK_L100KM = 6.5
    }

    private val _estimate = MutableStateFlow(FuelEstimate())
    val estimate: StateFlow<FuelEstimate> = _estimate

    private var lastFuelRate = 0.0
    private var accumulatedLiters = 0.0

    suspend fun onTelemetry(telemetry: LiveTelemetry) {
        val vehicle = vehicleRepository.getActive() ?: return _estimate.update { FuelEstimate() }

        val levelPercent = telemetry.fuelLevelPercent
        val estimatedLiters = levelPercent?.let { vehicle.tankCapacityLiters * it / 100.0 }

        if (telemetry.fuelRateLph != null) lastFuelRate = telemetry.fuelRateLph

        // Ưu tiên mức tiêu thụ học từ chính các chuyến đi; khi chưa đủ dữ liệu
        // (hoặc số học ra bất hợp lý) fallback về chuẩn nhà sản xuất 6.5 L/100km.
        val learned = estimateConsumption(vehicle.id)
        val consumption = learned ?: FALLBACK_L100KM
        val rangeKm = if (estimatedLiters != null && consumption > 0) {
            estimatedLiters / consumption * 100
        } else null

        _estimate.update {
            FuelEstimate(
                levelPercent = levelPercent,
                estimatedLiters = estimatedLiters,
                rangeKm = rangeKm,
                consumptionL100km = consumption,
                isFallback = learned == null,
                accumulatorFuelUsedLiters = accumulatedLiters,
                source = if (levelPercent != null) "OBD PID 012F" else "—",
                // UI tự compose ghi chú theo ngôn ngữ hiện tại (isFallback).
                learningNote = null,
            )
        }
    }

    private suspend fun estimateConsumption(vehicleId: String): Double? {
        // Last completed trips with odometer data; exclude degenerate rows
        // (distance ~0 nhưng vẫn tích xăng khi để máy nổ) otherwise the
        // average explodes (L/100km in the thousands).
        val trips = tripRepository.getWithOdometer()
        val withOdo = trips.filter {
            it.endOdometer != null && it.startOdometer != null &&
                it.fuelUsedLiters != null && it.distanceKm > 0.2
        }
        if (withOdo.size >= 3) {
            val lastTrips = withOdo.takeLast(10)
            val dist = lastTrips.sumOf { it.distanceKm }
            val fuel = lastTrips.sumOf { it.fuelUsedLiters ?: 0.0 }
            if (fuel > 0 && dist > 0) {
                val c = fuel / dist * 100
                return if (c in 0.5..40.0) c else null // sanity: xe con hợp lý 4-15
            }
        }
        return null
    }
}

class FuelLogRepository(
    private val fuelLogDao: com.fmms.carlogger.core.database.dao.FuelLogDao,
    private val syncQueueRepository: SyncQueueRepository? = null,
) {
    fun observeByVehicle(vehicleId: String) = fuelLogDao.observeByVehicle(vehicleId)
    suspend fun getByVehicle(vehicleId: String) = fuelLogDao.getByVehicle(vehicleId)
    suspend fun upsert(log: com.fmms.carlogger.core.database.entity.FuelLogEntity) {
        fuelLogDao.upsert(log)
        syncQueueRepository?.enqueueFuelLog(log)
    }
    suspend fun delete(log: com.fmms.carlogger.core.database.entity.FuelLogEntity) = fuelLogDao.delete(log)
    suspend fun getFullTankEvents(vehicleId: String) = fuelLogDao.getFullTankEvents(vehicleId)
    suspend fun totalsBetween(vehicleId: String, from: Long, to: Long) =
        fuelLogDao.getTotalsBetween(vehicleId, from, to).firstOrNull()
    suspend fun getBetween(vehicleId: String, from: Long, to: Long) =
        fuelLogDao.getBetween(vehicleId, from, to)
}