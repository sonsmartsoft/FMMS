package com.fmms.carlogger.ui.fuel

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.database.entity.FuelLogEntity
import com.fmms.carlogger.domain.model.FuelEstimate
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FuelViewModel : ViewModel() {
    private val c = AppContainer

    val estimate: StateFlow<FuelEstimate> = c.fuelEngine.estimate
    private val _logs = MutableStateFlow<List<FuelLogEntity>>(emptyList())
    val logs = _logs

    private val _saving = MutableStateFlow(false)
    val saving = _saving

    init {
        viewModelScope.launch {
            c.vehicleRepository.getActive()?.let { vehicle ->
                c.fuelLogRepository.observeByVehicle(vehicle.id).collect { _logs.value = it }
            }
        }
    }

    fun addRefuel(fuelLiters: Double, pricePerLiter: Double, tankFull: Boolean) {
        viewModelScope.launch {
            _saving.value = true
            val vehicle = c.vehicleRepository.getActive() ?: return@launch
            val odo = c.odometerEngine.state.value.virtualOdoKm
            val now = System.currentTimeMillis()
            val log = FuelLogEntity(
                id = java.util.UUID.randomUUID().toString(),
                vehicleId = vehicle.id,
                timestamp = now,
                odometerKm = odo,
                fuelLiters = fuelLiters,
                pricePerLiter = pricePerLiter,
                totalCost = fuelLiters * pricePerLiter,
                currency = "VND",
                station = null,
                tankFull = tankFull,
                notes = null,
                createdAt = now,
                updatedAt = now,
            )
            c.fuelLogRepository.upsert(log)
            _saving.value = false
        }
    }
}

@Composable
fun FuelScreen(vm: FuelViewModel = viewModel()) {
    val estimate by vm.estimate.collectAsStateWithLifecycle()
    val logs by vm.logs.collectAsStateWithLifecycle(emptyList())
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        Text(strings.fuel, color = colors.textPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                FuelCell(strings.fuelLevel, estimate.levelPercent?.let { "${it.toInt()}%" } ?: "—", colors.amber)
                FuelCell(strings.liters, estimate.estimatedLiters?.let { String.format(Locale.US, "%.1f L", it) } ?: "—", colors.textPrimary)
                FuelCell(strings.range, estimate.rangeKm?.let { "${it.toInt()} km" } ?: strings.learning, colors.cyan)
                FuelCell(strings.per100km, estimate.consumptionL100km?.let { String.format(Locale.US, "%.1f", it) } ?: strings.learning, colors.textPrimary)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        AddRefuelBar(vm)
        Spacer(modifier = Modifier.height(12.dp))

        if (logs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(strings.noRefuels, color = colors.textSecondary, fontSize = 14.sp)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(logs) { log ->
                    val fmt = SimpleDateFormat("dd MMM yyyy", Locale.US)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = colors.surface),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(fmt.format(Date(log.timestamp)), color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${strings.odoLabel} ${log.odometerKm?.let { "${it.toInt()} km" } ?: "—"} • ${if (log.tankFull) strings.fullTank else "Partial"}",
                                    color = colors.textSecondary,
                                    fontSize = 12.sp,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(String.format(Locale.US, "%.1f L", log.fuelLiters), color = colors.cyan, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                log.totalCost?.let {
                                    Text(String.format(Locale.US, "%,.0f ₫", it), color = colors.textSecondary, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FuelCell(label: String, value: String, color: Color) {
    val colors = LocalFmmsColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun AddRefuelBar(vm: FuelViewModel) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    var liters by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var full by remember { mutableStateOf(true) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = liters,
                    onValueChange = { liters = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text(strings.litersLbl, color = colors.textSecondary) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text(strings.pricePerL, color = colors.textSecondary) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(strings.fullTank, color = colors.textSecondary, fontSize = 13.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(checked = full, onCheckedChange = { full = it })
                }
                Button(onClick = {
                    val l = liters.toDoubleOrNull()
                    val p = price.toDoubleOrNull()
                    if (l != null && p != null) {
                        vm.addRefuel(l, p, full)
                        liters = ""
                        price = ""
                    }
                }) {
                    Text(strings.save)
                }
            }
        }
    }
}