package com.fmms.carlogger.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.data.repository.TripAggregate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Locale

class StatsViewModel : ViewModel() {
    private val c = AppContainer

    private val _today = MutableStateFlow<TripAggregate?>(null)
    val today = _today
    private val _month = MutableStateFlow<TripAggregate?>(null)
    val month = _month
    private val _total = MutableStateFlow<TripAggregate?>(null)
    val total = _total

    init {
        viewModelScope.launch {
            val vehicle = c.vehicleRepository.getActive() ?: return@launch
            val now = Calendar.getInstance()
            val todayStart = now.apply { set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis
            val monthStart = now.apply { set(Calendar.DAY_OF_MONTH, 1); set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis
            val end = System.currentTimeMillis()

            _today.value = c.tripRepository.getBetween(vehicle.id, todayStart, end).let { trips ->
                TripAggregate(
                    trips.sumOf { it.distanceKm },
                    trips.sumOf { it.fuelUsedLiters ?: 0.0 },
                    trips.size,
                    trips.maxOfOrNull { it.maxSpeedKmh ?: 0.0 } ?: 0.0,
                    trips.mapNotNull { it.averageSpeedKmh }.average().takeIf { it.isFinite() } ?: 0.0,
                )
            }
            _month.value = c.tripRepository.getBetween(vehicle.id, monthStart, end).let { trips ->
                TripAggregate(
                    trips.sumOf { it.distanceKm },
                    trips.sumOf { it.fuelUsedLiters ?: 0.0 },
                    trips.size,
                    trips.maxOfOrNull { it.maxSpeedKmh ?: 0.0 } ?: 0.0,
                    trips.mapNotNull { it.averageSpeedKmh }.average().takeIf { it.isFinite() } ?: 0.0,
                )
            }
            _total.value = c.tripRepository.aggregate(vehicle.id)
        }
    }
}

@Composable
fun StatsScreen(vm: StatsViewModel = viewModel()) {
    val today by vm.today.collectAsState()
    val month by vm.month.collectAsState()
    val total by vm.total.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19))
            .padding(16.dp),
    ) {
        Text("STATS", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(12.dp))

        StatsCard("TODAY", today)
        Spacer(modifier = Modifier.height(10.dp))
        StatsCard("THIS MONTH", month)
        Spacer(modifier = Modifier.height(10.dp))
        StatsCard("ALL TIME", total)
    }
}

@Composable
private fun StatsCard(title: String, agg: TripAggregate?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatCell("DISTANCE", agg?.distanceKm?.let { String.format(Locale.US, "%.1f km", it) } ?: "—", Color(0xFF06B6D4))
                StatCell("FUEL USED", agg?.fuelUsedLiters?.let { String.format(Locale.US, "%.1f L", it) } ?: "—", Color(0xFFF59E0B))
                StatCell("TRIPS", agg?.tripCount?.toString() ?: "0", Color.White)
                StatCell("AVG SPEED", agg?.avgSpeedKmh?.takeIf { it > 0 }?.let { String.format(Locale.US, "%.0f km/h", it) } ?: "—", Color(0xFF10B981))
            }
        }
    }
}

@Composable
private fun StatCell(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 15.sp, fontWeight = FontWeight.Black)
    }
}