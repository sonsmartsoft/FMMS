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
        // Last completed trips with odometer data. Chỉ giữ các chuyến có nghĩa
        // (distance > 1km, loại chuyến để máy nổ ~0km) và loại outlier per-trip:
        // chuyến có consumption ngoài khoảng hợp lý (0.5..40 L/100km) là dữ liệu
        // OBD bẩn (VD giai đoạn đầu trả fuel_used lên tới hàng trăm L) — nếu để
        // nguyên sẽ đẩy average nổ ra ngoài sanity → fallback về nhà sản xuất.
        val trips = tripRepository.getWithOdometer() // sắp xếp end_time DESC (mới nhất đầu)
        val clean = trips.filter {
            it.endOdometer != null && it.startOdometer != null &&
                it.fuelUsedLiters != null && it.distanceKm > 1
        }.filter {
            val c = it.fuelUsedLiters!! / it.distanceKm * 100
            c in 0.5..40.0 // bỏ outlier per-trip
        }
        if (clean.size >= 3) {
            val lastTrips = clean.take(10) // 10 chuyến sạch gần nhất (list đã DESC)
            if (lastTrips.size >= 3) {
                val dist = lastTrips.sumOf { it.distanceKm }
                val fuel = lastTrips.sumOf { it.fuelUsedLiters ?: 0.0 }
                if (fuel > 0 && dist > 0) {
                    val c = fuel / dist * 100
                    return if (c in 0.5..40.0) c else null // sanity tổng: xe con hợp lý 4-15
                }
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