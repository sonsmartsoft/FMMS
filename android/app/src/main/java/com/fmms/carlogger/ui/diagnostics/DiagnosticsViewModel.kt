package com.fmms.carlogger.ui.diagnostics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.database.entity.DtcLogEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class DiagnosticsViewModel : ViewModel() {

    private val c = AppContainer

    private val _scanning = MutableStateFlow(false)
    val scanning: StateFlow<Boolean> = _scanning.asStateFlow()

    private val _summary = MutableStateFlow<String?>(null)
    val summary: StateFlow<String?> = _summary.asStateFlow()

    /** Luồng mã lỗi DTC đang active của xe hiện tại. */
    private val activeFlow: Flow<List<DtcLogEntity>> =
        kotlinx.coroutines.flow.flow {
            val vehicle = c.vehicleRepository.getActive()
            if (vehicle != null) {
                emitAll(c.db.dtcLogDao().observeActive(vehicle.id))
            } else {
                emit(emptyList())
            }
        }

    val uiState: StateFlow<DtcUiState> = combine(
        activeFlow,
        c.dtcEngine.scanning,
        c.dtcEngine.lastScanSummary,
    ) { logs, scanning, summary ->
        DtcUiState(logs = logs, scanning = scanning, summary = summary)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DtcUiState())

    fun scanNow() {
        viewModelScope.launch {
            _scanning.value = true
            try {
                c.dtcEngine.scanNow()
                _summary.value = c.dtcEngine.lastScanSummary.value
            } catch (e: Exception) {
                _summary.value = "Lỗi quét: ${e.message}"
            } finally {
                _scanning.value = false
            }
        }
    }
}

data class DtcUiState(
    val logs: List<DtcLogEntity> = emptyList(),
    val scanning: Boolean = false,
    val summary: String? = null,
)
