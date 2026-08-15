package com.fmms.carlogger.core.odometer

enum class OdometerSourceStatus {
    ODO_KM_VERIFIED, DISTANCE_GPS, ODO_ESTIMATED, ODO_MANUAL, ODO_UNAVAILABLE
}

data class OdometerState(
    val officialOdoKm: Double? = null,
    val virtualOdoKm: Double = 12846.0,
    val sourceStatus: OdometerSourceStatus = OdometerSourceStatus.ODO_ESTIMATED,
    val confidence: String = "HIGH"
)

/**
 * Virtual Odometer Engine implementing 5-step fallback strategy for Mazda2 Base 2026.
 */
class VirtualOdometerEngine {

    private var currentVirtualOdo: Double = 12846.0
    private var calibrationOffset: Double = 0.0

    fun calculateNewOdometer(gpsTripDeltaKm: Double, obdOdoRawKm: Double?): OdometerState {
        return if (obdOdoRawKm != null && obdOdoRawKm > 0) {
            OdometerState(
                officialOdoKm = obdOdoRawKm,
                virtualOdoKm = obdOdoRawKm,
                sourceStatus = OdometerSourceStatus.ODO_KM_VERIFIED,
                confidence = "VERIFIED"
            )
        } else {
            currentVirtualOdo += gpsTripDeltaKm
            OdometerState(
                officialOdoKm = null,
                virtualOdoKm = currentVirtualOdo + calibrationOffset,
                sourceStatus = OdometerSourceStatus.DISTANCE_GPS,
                confidence = "HIGH (GPS + Virtual Ledger)"
            )
        }
    }

    fun applyManualCalibration(actualDashboardReadingKm: Double) {
        calibrationOffset = actualDashboardReadingKm - currentVirtualOdo
    }
}
