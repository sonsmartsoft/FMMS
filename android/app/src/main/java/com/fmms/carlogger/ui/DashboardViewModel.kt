package com.fmms.carlogger.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.obd.OBDConnectionState
import com.fmms.carlogger.core.obd.OBDRecentActivity
import com.fmms.carlogger.domain.model.FuelEstimate
import com.fmms.carlogger.domain.model.LiveTelemetry
import com.fmms.carlogger.domain.model.OdometerInfo
import com.fmms.carlogger.domain.model.TripLiveState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class DashboardUiState(
    val telemetry: LiveTelemetry = LiveTelemetry(),
    val fuel: FuelEstimate = FuelEstimate(),
    val trip: TripLiveState = TripLiveState(),
    val odometer: OdometerInfo = OdometerInfo(0.0, "INITIAL", "—"),
    val connectionState: OBDConnectionState = OBDConnectionState.DISCONNECTED,
    val hasObdMac: Boolean = false,
    val obdMac: String? = null,
    val obdName: String? = null,
    val elmInfo: String? = null,
)

/**
 * Binds all live sources from [AppContainer] into one UI state.
 */
class DashboardViewModel : ViewModel() {

    private val c = AppContainer

    private val recentActivity = MutableStateFlow<OBDRecentActivity>(OBDRecentActivity.OBD_DISCONNECTED)

    val uiState: StateFlow<DashboardUiState> = combine(
        c.telemetryEngine.live,
        c.fuelEngine.estimate,
        c.tripEngine.state,
        c.odometerEngine.state,
        c.obdManager.connectionState,
    ) { telemetry, fuel, trip, odo, conn ->
        val hasMac = c.prefs.getMac() != null
        DashboardUiState(
            telemetry = telemetry,
            fuel = fuel,
            trip = trip,
            odometer = odo,
            connectionState = conn,
            hasObdMac = hasMac,
            obdMac = c.prefs.getMac(),
            obdName = c.prefs.getDeviceName(),
            elmInfo = c.obdManager.elms.info.let {
                listOfNotNull(
                    it.elmVersion?.takeIf { v -> v.isNotBlank() },
                    it.protocol?.takeIf { p -> p.isNotBlank() },
                ).joinToString(" • ")
            },
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardUiState())

    init {
        viewModelScope.launch {
            c.obdManager.connectionState.collect { state ->
                recentActivity.value = when (state) {
                    OBDConnectionState.CONNECTED -> OBDRecentActivity.OBD_CONNECTED
                    OBDConnectionState.RECONNECTING -> OBDRecentActivity.RECONNECTING
                    OBDConnectionState.SCANNING -> OBDRecentActivity.SCANNING
                    OBDConnectionState.ERROR -> OBDRecentActivity.ERROR
                    else -> OBDRecentActivity.OBD_DISCONNECTED
                }
            }
        }
    }

    fun connect() {
        val mac = c.prefs.getMac() ?: return
        viewModelScope.launch {
            c.obdManager.connect(mac)
            c.vehicleRepository.getActive()?.let { vehicle ->
                c.vehicleRepository.registerDevice(mac, c.prefs.getDeviceName() ?: "KW906")
            }
        }
    }

    fun disconnect() {
        viewModelScope.launch { c.obdManager.disconnect() }
    }

    fun startService() {
        c.startTelemetryService()
    }

    fun setMac(mac: String, name: String) {
        c.prefs.setMac(mac)
        c.prefs.setDeviceName(name)
    }
}