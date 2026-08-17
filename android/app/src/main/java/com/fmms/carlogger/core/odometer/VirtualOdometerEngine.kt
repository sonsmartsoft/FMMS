package com.fmms.carlogger.core.odometer

import com.fmms.carlogger.data.repository.PrefsStore
import com.fmms.carlogger.data.repository.VehicleRepository
import com.fmms.carlogger.domain.model.OdometerInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Virtual odometer per spec (5-step fallback):
 * 1. VERIFIED OBD odometer  2. GPS distance accumulation  3. manual calibration
 * Persisted via PrefsStore so it survives reboot.
 */
class VirtualOdometerEngine(
    private val prefsStore: PrefsStore,
    private val vehicleRepository: VehicleRepository,
) {

    private val _state = MutableStateFlow(
        OdometerInfo(prefsStore.getOdo(), "INITIAL", "—")
    )
    val state: StateFlow<OdometerInfo> = _state

    suspend fun onTripCompleted(distanceKm: Double, sourceStatus: String) {
        val v = vehicleRepository.getActive()
        val base = v?.odometerKm ?: prefsStore.getOdo()
        val updated = base + distanceKm
        prefsStore.setOdo(updated)
        v?.let { vehicleRepository.updateOdometer(it.id, updated) }
        _state.value = OdometerInfo(updated, sourceStatus, "HIGH (GPS + Ledger)")
    }

    suspend fun setOfficialOdo(officialKm: Double) {
        prefsStore.setOdo(officialKm)
        vehicleRepository.getActive()?.let {
            vehicleRepository.updateOdometer(it.id, officialKm)
        }
        _state.value = OdometerInfo(officialKm, "VERIFIED (OBD)", "VERIFIED")
    }

    suspend fun manualCalibration(actualDashboardKm: Double) {
        prefsStore.setOdo(actualDashboardKm)
        vehicleRepository.getActive()?.let {
            vehicleRepository.updateOdometer(it.id, actualDashboardKm)
        }
        _state.value = OdometerInfo(actualDashboardKm, "MANUAL", "MANUAL")
    }
}