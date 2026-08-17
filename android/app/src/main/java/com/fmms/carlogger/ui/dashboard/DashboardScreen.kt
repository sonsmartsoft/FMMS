package com.fmms.carlogger.ui.dashboard

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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.core.obd.OBDConnectionState
import com.fmms.carlogger.domain.model.LiveTelemetry
import com.fmms.carlogger.ui.DashboardUiState
import com.fmms.carlogger.ui.DashboardViewModel
import java.util.Locale

private val DarkBackground = Color(0xFF0B0F19)
private val CardBackground = Color(0xFF111827)
private val CyanAccent = Color(0xFF06B6D4)
private val AmberAccent = Color(0xFFF59E0B)
private val EmeraldAccent = Color(0xFF10B981)
private val RedAccent = Color(0xFFEF4444)
private val PurpleAccent = Color(0xFFA855F7)

@Composable
fun DashboardScreen(vm: DashboardViewModel) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    DashboardContent(state = state)
}

@Composable
private fun DashboardContent(state: DashboardUiState) {
    val t = state.telemetry
    val conn = state.connectionState
    val connected = conn == OBDConnectionState.CONNECTED

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
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
                    text = "MAZDA 2 BASE 2026",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${state.obdName ?: "OBD-II ELM327"} • ${state.elmInfo ?: "Not connected"}",
                    color = Color.Gray,
                    fontSize = 12.sp,
                )
                if (state.hasObdMac && state.obdMac != null) {
                    Text(
                        text = state.obdMac!!,
                        color = Color.Gray,
                        fontSize = 10.sp,
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                StatusBadge(connected, conn)
                if (!state.hasObdMac) {
                    Surface(color = AmberAccent.copy(alpha = 0.15f), shape = RoundedCornerShape(20.dp)) {
                        Text(
                            text = "ADD DEVICE",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            color = AmberAccent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }

        // Hero range + fuel + consumption
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardBackground),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(20.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                HeroCell(
                    label = "ESTIMATED RANGE",
                    value = state.fuel.rangeKm?.let { "${it.toInt()} km" } ?: "RANGE",
                    sub = state.fuel.learningNote ?: state.fuel.rangeKm?.let { "" } ?: "Learning...",
                    color = CyanAccent,
                    showSubAsNote = state.fuel.rangeKm == null,
                    noteColor = AmberAccent,
                )
                VerticalDivider(modifier = Modifier.height(50.dp).width(1.dp), color = Color.DarkGray)
                HeroCell(
                    label = "FUEL LEVEL",
                    value = state.fuel.levelPercent?.let { "${it.toInt()}% (${state.fuel.estimatedLiters?.let { l -> String.format(Locale.US, "%.1f", l) }}L)" }
                        ?: "—",
                    sub = state.fuel.source ?: "",
                    color = AmberAccent,
                    showSubAsNote = state.fuel.levelPercent == null,
                    noteColor = Color.Gray,
                )
                VerticalDivider(modifier = Modifier.height(50.dp).width(1.dp), color = Color.DarkGray)
                HeroCell(
                    label = "AVG CONSUMPTION",
                    value = state.fuel.consumptionL100km?.let { String.format(Locale.US, "%.1f", it) + " L/100km" }
                        ?: "—",
                    sub = state.fuel.learningNote ?: "Learning...",
                    color = Color.White,
                    showSubAsNote = state.fuel.consumptionL100km == null,
                    noteColor = Color.Gray,
                )
            }
        }

        // Today / trip row
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardBackground),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                TripStatCell("TRIP", state.trip.distanceKm.let { "${String.format(Locale.US, "%.1f", it)} km" }, Color.White, null)
                TripStatCell("DURATION", state.trip.durationSeconds.toTime(), Color.White, null)
                TripStatCell("MAX SPEED", state.trip.maxSpeedKmh.takeIf { it > 0 }?.let { "${it.toInt()} km/h" } ?: "—", CyanAccent, null)
                TripStatCell("ODO", state.odometer.virtualOdoKm.let { "${it.toInt()} km" }, Color.White, state.odometer.sourceStatus)
            }
        }

        // Gauges grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GaugeCard("SPEED", t.speedKmh?.let { "${it.toInt()}" } ?: "—", "km/h", CyanAccent, Modifier.weight(1f))
            GaugeCard("RPM", t.rpm?.let { "${it.toInt()}" } ?: "—", "rpm", PurpleAccent, Modifier.weight(1f))
            GaugeCard("COOLANT", t.coolantTempC?.let { "${it.toInt()}°C" } ?: "—", "", EmeraldAccent, Modifier.weight(1f))
            GaugeCard("VOLTAGE", t.batteryVoltage?.let { String.format(Locale.US, "%.1f", it) } ?: "—", "V", AmberAccent, Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatusBadge(connected: Boolean, conn: OBDConnectionState) {
    val (color, text) = when {
        conn == OBDConnectionState.RECONNECTING -> RedAccent to "OBD RECONNECTING"
        conn == OBDConnectionState.SCANNING -> AmberAccent to "SCANNING"
        connected -> EmeraldAccent to "OBD CONNECTED"
        conn == OBDConnectionState.ERROR -> RedAccent to "OBD ERROR"
        else -> Color.Gray to "OBD DISCONNECTED"
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
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
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
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 16.sp, fontWeight = FontWeight.Black)
        if (sub != null) {
            Text(sub, color = Color.Gray, fontSize = 9.sp)
        }
    }
}

@Composable
fun GaugeCard(title: String, value: String, unit: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(title, color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.Black)
                if (unit.isNotBlank()) {
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(unit, color = Color.Gray, fontSize = 10.sp)
                }
            }
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