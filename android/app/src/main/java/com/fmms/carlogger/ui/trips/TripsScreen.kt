package com.fmms.carlogger.ui.trips

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
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.database.entity.TripEntity
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TripsViewModel : ViewModel() {
    private val c = AppContainer

    private val _trips = MutableStateFlow<List<TripEntity>>(emptyList())
    val trips: Flow<List<TripEntity>> = _trips

    init {
        viewModelScope.launch {
            c.vehicleRepository.getActive()?.let { vehicle ->
                c.tripRepository.observeByVehicle(vehicle.id).collect { _trips.value = it }
            }
        }
    }
}

@Composable
fun TripsScreen(vm: TripsViewModel = viewModel()) {
    val trips by vm.trips.collectAsStateWithLifecycle(emptyList())
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        Text(strings.trips, color = colors.textPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))

        if (trips.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    strings.noTripsYet,
                    color = colors.textSecondary,
                    fontSize = 14.sp,
                )
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(trips) { trip -> TripRow(trip) }
            }
        }
    }
}

@Composable
private fun TripRow(trip: TripEntity) {
    val colors = LocalFmmsColors.current
    val fmt = SimpleDateFormat("dd MMM HH:mm", Locale.US)
    val start = fmt.format(Date(trip.startTime))

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
                Text(start, color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    if (trip.endTime != null) {
                        "→ ${fmt.format(Date(trip.endTime!!))} • ${trip.durationSeconds / 60} min"
                    } else {
                        "Ongoing..."
                    },
                    color = colors.textSecondary,
                    fontSize = 12.sp,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    String.format(Locale.US, "%.1f km", trip.distanceKm),
                    color = colors.cyan,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                )
                trip.averageConsumptionL100km?.let {
                    Text(
                        String.format(Locale.US, "%.1f L/100km", it),
                        color = colors.textSecondary,
                        fontSize = 11.sp,
                    )
                }
            }
        }
    }
}