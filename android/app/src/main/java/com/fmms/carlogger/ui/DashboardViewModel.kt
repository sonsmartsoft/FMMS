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
    val vehicleName: String = "XE CỦA TÔI",
    val vehicleSubtitle: String = "",
    val vehicleImageUrl: String? = null,
    val gpsAvailable: Boolean = false,
    val elmProtocol: String = "",
    val deviceMode: String = "obd",
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
        c.vehicleRepository.observeAll(),
        c.gpsTelemetry,
    ) { values: Array<Any?> ->
        @Suppress("UNCHECKED_CAST")
        val telemetry = values[0] as LiveTelemetry
        @Suppress("UNCHECKED_CAST")
        val fuel = values[1] as FuelEstimate
        @Suppress("UNCHECKED_CAST")
        val trip = values[2] as TripLiveState
        @Suppress("UNCHECKED_CAST")
        val odo = values[3] as OdometerInfo
        @Suppress("UNCHECKED_CAST")
        val conn = values[4] as OBDConnectionState
        @Suppress("UNCHECKED_CAST")
        val vehicles = values[5] as List<com.fmms.carlogger.core.database.entity.VehicleEntity>
        @Suppress("UNCHECKED_CAST")
        val gps = values[6] as LiveTelemetry
        val deviceMode = c.prefs.getDeviceMode()
        val live = if (deviceMode == "gps") gps else telemetry
        val hasMac = c.prefs.getMac() != null
        val active = vehicles.firstOrNull { it.active } ?: vehicles.firstOrNull()
        val odoDisplay = if (active != null) {
            OdometerInfo(active.odometerKm, "FROM VEHICLE", if (active.odometerKm > 0) "VERIFIED" else "—")
        } else {
            odo
        }
        DashboardUiState(
            telemetry = live,
            fuel = fuel,
            trip = trip,
            odometer = odoDisplay,
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
            elmProtocol = c.obdManager.elms.info.protocol?.takeIf { it.isNotBlank() } ?: "",
            gpsAvailable = live.latitude != null && live.longitude != null,
            vehicleName = active?.displayName() ?: "XE CỦA TÔI",
            vehicleSubtitle = active?.licensePlate
                ?.trim()
                ?.takeIf { it.isNotBlank() && it != "-" && it != "—" }
                ?: "",
            vehicleImageUrl = active?.imageUrl,
            deviceMode = deviceMode,
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