package com.fmms.carlogger.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.core.obd.OBDConnectionState
import com.fmms.carlogger.domain.model.LiveTelemetry
import com.fmms.carlogger.ui.DashboardUiState
import com.fmms.carlogger.ui.DashboardViewModel
import com.fmms.carlogger.ui.i18n.FmmsStrings
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import java.util.Locale

@Composable
fun DashboardScreen(vm: DashboardViewModel, onAddDevice: () -> Unit = {}) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    DashboardContent(state = state, onAddDevice = onAddDevice)
}

@Composable
private fun DashboardContent(state: DashboardUiState, onAddDevice: () -> Unit) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    val t = state.telemetry
    val conn = state.connectionState
    val connected = conn == OBDConnectionState.CONNECTED

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        // Top header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = state.vehicleName,
                    color = colors.textPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
                Text(
                    text = state.vehicleSubtitle.ifBlank { "${state.obdName ?: "OBD-II ELM327"} • ${state.elmInfo ?: strings.notConnected}" },
                    color = colors.textSecondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                )
                if (state.hasObdMac && state.obdMac != null) {
                    Text(
                        text = state.obdMac!!,
                        color = colors.textSecondary,
                        fontSize = 10.sp,
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                StatusBadge(connected, conn, state.deviceMode, strings)
                if (!state.hasObdMac && state.deviceMode == "obd") {
                    Surface(
                        color = colors.amber.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(20.dp),
                        onClick = onAddDevice,
                    ) {
                        Text(
                            text = strings.addDevice,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            color = colors.amber,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }

        // Auto-fit: narrow (phone portrait) -> scrollable stack; wide (ZESTECH/landscape) -> compact grid.
        BoxWithConstraints {
            val narrow = maxWidth < 560.dp
            if (narrow) {
                NarrowLayout(state, colors, connected, conn, strings)
            } else {
                WideLayout(state, colors, connected, conn, strings)
            }
        }
    }
}

@Composable
private fun WideLayout(state: DashboardUiState, colors: com.fmms.carlogger.ui.theme.FmmsColors, connected: Boolean, conn: OBDConnectionState, strings: FmmsStrings) {
    val t = state.telemetry

    // Hero range + fuel + consumption
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HeroCell(
                label = strings.estimatedRange,
                value = state.fuel.rangeKm?.let { "${it.toInt()} km" } ?: strings.learning,
                sub = state.fuel.learningNote ?: "",
                color = colors.cyan,
                showSubAsNote = state.fuel.rangeKm == null,
                noteColor = colors.amber,
            )
            VerticalDivider(modifier = Modifier.height(50.dp).width(1.dp), color = colors.divider)
            HeroCell(
                label = strings.fuelLevel,
                value = state.fuel.levelPercent?.let { "${it.toInt()}% (${state.fuel.estimatedLiters?.let { l -> String.format(Locale.US, "%.1f", l) }}L)" }
                    ?: "—",
                sub = state.fuel.source ?: "",
                color = colors.amber,
                showSubAsNote = state.fuel.levelPercent == null,
                noteColor = colors.textSecondary,
            )
            VerticalDivider(modifier = Modifier.height(50.dp).width(1.dp), color = colors.divider)
            HeroCell(
                label = strings.avgConsumption,
                value = state.fuel.consumptionL100km?.let { String.format(Locale.US, "%.1f", it) + " L/100km" }
                    ?: "—",
                sub = state.fuel.learningNote ?: strings.learning,
                color = colors.textPrimary,
                showSubAsNote = state.fuel.consumptionL100km == null,
                noteColor = colors.textSecondary,
            )
        }
    }

    Spacer(modifier = Modifier.height(10.dp))

    // Today / trip row
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceAround,
        ) {
            TripStatCell(strings.trip, state.trip.distanceKm.let { "${String.format(Locale.US, "%.1f", it)} km" }, colors.textPrimary, null)
            TripStatCell(strings.duration, state.trip.durationSeconds.toTime(), colors.textPrimary, null)
            TripStatCell(strings.maxSpeed, state.trip.maxSpeedKmh.takeIf { it > 0 }?.let { "${it.toInt()} km/h" } ?: "—", colors.cyan, null)
            TripStatCell(strings.odo, state.odometer.virtualOdoKm.let { "${it.toInt()} km" }, colors.textPrimary, state.odometer.sourceStatus)
        }
    }

    Spacer(modifier = Modifier.height(10.dp))

    // Gauges grid
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        GaugeCard(
            title = strings.speed, value = t.speedKmh?.let { "${it.toInt()}" } ?: "—", unit = "km/h",
            color = colors.cyan, modifier = Modifier.weight(1f),
            maxValue = 220f, currentValue = t.speedKmh?.toFloat() ?: 0f,
        )
        GaugeCard(
            title = strings.rpm, value = t.rpm?.let { "${it.toInt()}" } ?: "—", unit = "rpm",
            color = colors.purple, modifier = Modifier.weight(1f),
            maxValue = 8000f, currentValue = t.rpm?.toFloat() ?: 0f,
        )
        GaugeCard(
            title = strings.coolant, value = t.coolantTempC?.let { "${it.toInt()}°C" } ?: "—", unit = "",
            color = colors.emerald, modifier = Modifier.weight(1f),
            maxValue = 140f, currentValue = t.coolantTempC?.toFloat() ?: 0f,
        )
        GaugeCard(
            title = strings.voltage, value = t.batteryVoltage?.let { String.format(Locale.US, "%.1f", it) } ?: "—", unit = "V",
            color = colors.amber, modifier = Modifier.weight(1f),
            maxValue = 16f, currentValue = t.batteryVoltage?.toFloat() ?: 0f,
        )
    }
}

@Composable
private fun NarrowLayout(state: DashboardUiState, colors: com.fmms.carlogger.ui.theme.FmmsColors, connected: Boolean, conn: OBDConnectionState, strings: FmmsStrings) {
    val t = state.telemetry

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Hero
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                HeroCell(
                    label = strings.estimatedRange,
                    value = state.fuel.rangeKm?.let { "${it.toInt()} km" } ?: strings.learning,
                    sub = state.fuel.learningNote ?: "",
                    color = colors.cyan,
                    showSubAsNote = state.fuel.rangeKm == null,
                    noteColor = colors.amber,
                )
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround,
                ) {
                    HeroCell(
                        label = strings.fuelLevel,
                        value = state.fuel.levelPercent?.let { "${it.toInt()}%" } ?: "—",
                        sub = state.fuel.source ?: "",
                        color = colors.amber,
                        showSubAsNote = state.fuel.levelPercent == null,
                        noteColor = colors.textSecondary,
                    )
                    HeroCell(
                        label = strings.avgConsumption,
                        value = state.fuel.consumptionL100km?.let { String.format(Locale.US, "%.1f", it) + " L/100km" } ?: "—",
                        sub = state.fuel.learningNote ?: strings.learning,
                        color = colors.textPrimary,
                        showSubAsNote = state.fuel.consumptionL100km == null,
                        noteColor = colors.textSecondary,
                    )
                }
            }
        }

        // Today / trip row
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(12.dp),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                TripStatCell(strings.trip, state.trip.distanceKm.let { "${String.format(Locale.US, "%.1f", it)} km" }, colors.textPrimary, null)
                TripStatCell(strings.duration, state.trip.durationSeconds.toTime(), colors.textPrimary, null)
                TripStatCell(strings.maxSpeed, state.trip.maxSpeedKmh.takeIf { it > 0 }?.let { "${it.toInt()} km/h" } ?: "—", colors.cyan, null)
                TripStatCell(strings.odo, state.odometer.virtualOdoKm.let { "${it.toInt()} km" }, colors.textPrimary, null)
            }
        }

        // Gauges 2x2
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            GaugeCard(
                title = strings.speed, value = t.speedKmh?.let { "${it.toInt()}" } ?: "—", unit = "km/h",
                color = colors.cyan, modifier = Modifier.weight(1f),
                maxValue = 220f, currentValue = t.speedKmh?.toFloat() ?: 0f,
            )
            GaugeCard(
                title = strings.rpm, value = t.rpm?.let { "${it.toInt()}" } ?: "—", unit = "rpm",
                color = colors.purple, modifier = Modifier.weight(1f),
                maxValue = 8000f, currentValue = t.rpm?.toFloat() ?: 0f,
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            GaugeCard(
                title = strings.coolant, value = t.coolantTempC?.let { "${it.toInt()}°C" } ?: "—", unit = "",
                color = colors.emerald, modifier = Modifier.weight(1f),
                maxValue = 140f, currentValue = t.coolantTempC?.toFloat() ?: 0f,
            )
            GaugeCard(
                title = strings.voltage, value = t.batteryVoltage?.let { String.format(Locale.US, "%.1f", it) } ?: "—", unit = "V",
                color = colors.amber, modifier = Modifier.weight(1f),
                maxValue = 16f, currentValue = t.batteryVoltage?.toFloat() ?: 0f,
            )
        }
    }
}

@Composable
private fun StatusBadge(connected: Boolean, conn: OBDConnectionState, deviceMode: String, strings: FmmsStrings) {
    val colors = LocalFmmsColors.current
    val (color, text) = when {
        deviceMode == "gps" -> colors.emerald to strings.gpsTracking
        conn == OBDConnectionState.RECONNECTING -> colors.red to strings.obdReconnecting
        conn == OBDConnectionState.SCANNING -> colors.amber to strings.scanning
        connected -> colors.emerald to strings.obdConnected
        conn == OBDConnectionState.ERROR -> colors.red to strings.obdError
        else -> colors.textSecondary to strings.obdDisconnected
    }
    Surface(color = color.copy(alpha = 0.2f), shape = RoundedCornerShape(20.dp)) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.size(8.dp).background(color, shape = RoundedCornerShape(50)))
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = text, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun HeroCell(
    label: String,
    value: String,
    sub: String,
    color: Color,
    showSubAsNote: Boolean = false,
    noteColor: Color = Color.Gray,
) {
    val colors = LocalFmmsColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 32.sp, fontWeight = FontWeight.Black)
        if (showSubAsNote) {
            Text(sub.ifBlank { "—" }, color = noteColor, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        } else if (sub.isNotBlank()) {
            Text(sub, color = noteColor, fontSize = 10.sp)
        }
    }
}

@Composable
private fun TripStatCell(label: String, value: String, color: Color, sub: String?) {
    val colors = LocalFmmsColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 16.sp, fontWeight = FontWeight.Black)
        if (sub != null) {
            Text(sub, color = colors.textSecondary, fontSize = 9.sp)
        }
    }
}

private fun Long.toTime(): String {
    val s = this / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) String.format(Locale.US, "%dh %02dm", h, m) else String.format(Locale.US, "%02d:%02d", m, sec)
}