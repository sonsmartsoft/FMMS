package com.fmms.carlogger.ui.dashboard

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
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
import com.fmms.carlogger.util.LunarCalendar
import kotlinx.coroutines.delay
import java.util.Calendar
import java.util.Locale

@Composable
fun DashboardScreen(
    vm: DashboardViewModel,
    onAddDevice: () -> Unit = {},
    onSpeedometer: () -> Unit = {},
    onLunar: () -> Unit = {},
    onOpenDate: (Int, Int, Int) -> Unit = { _, _, _ -> },
    onWeather: () -> Unit = {},
) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    DashboardContent(state = state, onAddDevice = onAddDevice, onSpeedometer = onSpeedometer, onLunar = onLunar, onWeather = onWeather, onOpenDate = onOpenDate)
}

@Composable
private fun DashboardContent(state: DashboardUiState, onAddDevice: () -> Unit, onSpeedometer: () -> Unit, onLunar: () -> Unit, onWeather: () -> Unit, onOpenDate: (Int, Int, Int) -> Unit) {
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
                val infoLine = listOfNotNull(
                    state.vehicleSubtitle.takeIf { it.isNotBlank() },
                    state.obdName?.trim()?.takeIf { connected && it.isNotEmpty() },
                    state.elmProtocol.trim().takeIf { connected && it.isNotEmpty() },
                    strings.obdConnected.takeIf { connected },
                ).joinToString("   |   ")
                if (infoLine.isNotBlank()) {
                    Text(
                        text = infoLine,
                        color = colors.textSecondary,
                        fontSize = 12.sp,
                        maxLines = 1,
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                StatusBadge(connected, conn, state.deviceMode, strings, state.gpsAvailable)
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
                Surface(
                    color = colors.surface,
                    shape = RoundedCornerShape(20.dp),
                    onClick = onSpeedometer,
                ) {
                    Text(
                        text = "⏱",
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                        color = colors.cyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Surface(
                    color = colors.surface,
                    shape = RoundedCornerShape(20.dp),
                    onClick = onLunar,
                ) {
                    Text(
                        text = "☾",
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                        color = colors.amber,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Surface(
                    color = colors.surface,
                    shape = RoundedCornerShape(20.dp),
                    onClick = onWeather,
                ) {
                    Text(
                        text = "⛅",
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                        color = colors.cyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }

        // Auto-fit: narrow (phone portrait) -> scrollable stack; wide (ZESTECH/landscape) -> compact grid.
        BoxWithConstraints {
            val narrow = maxWidth < 560.dp
            if (narrow) {
                NarrowLayout(state, colors, connected, conn, strings, onOpenDate)
            } else {
                WideLayout(state, colors, connected, conn, strings, onOpenDate)
            }
        }
    }
}

@Composable
private fun WideLayout(state: DashboardUiState, colors: com.fmms.carlogger.ui.theme.FmmsColors, connected: Boolean, conn: OBDConnectionState, strings: FmmsStrings, onOpenDate: (Int, Int, Int) -> Unit = { _, _, _ -> }) {
    val t = state.telemetry

    // IMPORTANT: siblings of a Box overlap — this must be a single Column so the
    // cards stack vertically instead of covering each other (was losing the
    // ESTIMATED RANGE card in landscape). Scrollable in case height is short.
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
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
                FuelGaugeCard(
                    levelPercent = state.fuel.levelPercent,
                    rangeKm = state.fuel.rangeKm,
                    note = state.fuel.learningNote,
                    colors = colors,
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

        DateClockCard(colors = colors, onOpenDate = onOpenDate)
    }
}

@Composable
private fun NarrowLayout(state: DashboardUiState, colors: com.fmms.carlogger.ui.theme.FmmsColors, connected: Boolean, conn: OBDConnectionState, strings: FmmsStrings, onOpenDate: (Int, Int, Int) -> Unit = { _, _, _ -> }) {
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
                    FuelGaugeCard(
                        levelPercent = state.fuel.levelPercent,
                        rangeKm = state.fuel.rangeKm,
                        note = state.fuel.learningNote,
                        colors = colors,
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

        DateClockCard(colors = colors, onOpenDate = onOpenDate)
    }
}

@Composable
private fun StatusBadge(connected: Boolean, conn: OBDConnectionState, deviceMode: String, strings: FmmsStrings, gpsAvailable: Boolean) {
    val colors = LocalFmmsColors.current
    val (color, text) = when {
        deviceMode == "gps" -> if (gpsAvailable) colors.emerald to strings.gpsTracking else colors.red to strings.gpsTracking
        conn == OBDConnectionState.RECONNECTING -> colors.red to strings.obdReconnecting
        conn == OBDConnectionState.SCANNING -> colors.amber to strings.scanning
        connected -> colors.emerald to strings.obdConnected
        conn == OBDConnectionState.ERROR -> colors.red to strings.obdError
        else -> colors.textSecondary to strings.obdDisconnected
    }
    // Chấm nhấp nháy ở chế độ GPS: xanh = có fix, đỏ = mất tín hiệu
    val dotAlpha = if (deviceMode == "gps") {
        val transition = rememberInfiniteTransition(label = "gpsDot")
        transition.animateFloat(
            initialValue = 0.25f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(700, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "gpsDotAlpha",
        ).value
    } else 1f
    Surface(color = color.copy(alpha = 0.2f), shape = RoundedCornerShape(20.dp)) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.size(8.dp).background(color.copy(alpha = dotAlpha), shape = RoundedCornerShape(50)))
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

@Composable
private fun FuelGaugeCard(
    levelPercent: Double?,
    rangeKm: Double?,
    note: String?,
    colors: com.fmms.carlogger.ui.theme.FmmsColors,
) {
    val level = levelPercent?.toFloat()?.coerceIn(0f, 100f) ?: 0f
    val ringColor = when {
        levelPercent == null -> colors.textSecondary
        level <= 15f -> colors.red
        level <= 35f -> colors.amber
        else -> colors.emerald
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(strings_label(colors), color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(2.dp))
        Box(contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(64.dp)) {
                val stroke = 8.dp.toPx()
                val inset = stroke / 2
                val arcSize = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke)
                val topLeft = Offset(stroke / 2, stroke / 2)
                drawArc(
                    color = colors.surfaceVariant,
                    startAngle = 135f,
                    sweepAngle = 270f,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke, cap = StrokeCap.Round),
                )
                drawArc(
                    color = ringColor,
                    startAngle = 135f,
                    sweepAngle = 270f * (level / 100f),
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }
            Text(
                if (levelPercent != null) "${levelPercent.toInt()}%" else "—",
                color = ringColor,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
            )
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            if (rangeKm != null) "${rangeKm.toInt()} km" else note?.takeIf { it.isNotBlank() } ?: "—",
            color = colors.textSecondary,
            fontSize = 10.sp,
        )
    }
}

@Composable
private fun strings_label(colors: com.fmms.carlogger.ui.theme.FmmsColors): String = com.fmms.carlogger.ui.i18n.LocalStrings.current.fuelLevel

private fun Long.toTime(): String {
    val s = this / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) String.format(Locale.US, "%dh %02dm", h, m) else String.format(Locale.US, "%02d:%02d", m, sec)
}

/** Đồng hồ + ngày dương lịch + âm lịch hiện tại (chạy thời gian thực).
 *  Bấm vào ô DƯƠNG LỊCH hoặc ÂM LỊCH sẽ mở màn lịch âm đúng ngày đó. */
@Composable
private fun DateClockCard(
    colors: com.fmms.carlogger.ui.theme.FmmsColors,
    onOpenDate: (Int, Int, Int) -> Unit = { _, _, _ -> },
) {
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }
    val cal = remember(now) { Calendar.getInstance().apply { timeInMillis = now } }
    val d = cal.get(Calendar.DAY_OF_MONTH)
    val m = cal.get(Calendar.MONTH) + 1
    val y = cal.get(Calendar.YEAR)
    val lunar = remember(now) { LunarCalendar.convert(d, m, y) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ClockCell(
                label = "GIỜ",
                value = String.format(
                    Locale.US, "%02d:%02d:%02d",
                    cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE), cal.get(Calendar.SECOND),
                ),
                color = colors.cyan,
            )
            VerticalDivider(modifier = Modifier.height(40.dp).width(1.dp), color = colors.divider)
            ClockCell(
                label = "DƯƠNG LỊCH",
                value = String.format(Locale.US, "%02d/%02d/%04d", d, m, y),
                color = colors.textPrimary,
                sub = LunarCalendar.weekdayVi(d, m, y),
                onClick = { onOpenDate(y, m, d) },
            )
            VerticalDivider(modifier = Modifier.height(40.dp).width(1.dp), color = colors.divider)
            ClockCell(
                label = if (lunar.isLeapMonth) "ÂM LỊCH (Nhuận)" else "ÂM LỊCH",
                value = LunarCalendar.lunarDayLabel(lunar) + " " + LunarCalendar.lunarMonthLabel(lunar),
                color = colors.amber,
                sub = "năm ${LunarCalendar.canChiYear(lunar.year)}",
                onClick = { onOpenDate(y, m, d) },
            )
        }
    }
}

@Composable
private fun ClockCell(label: String, value: String, color: Color, sub: String? = null, onClick: (() -> Unit)? = null) {
    val colors = LocalFmmsColors.current
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier,
    ) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 17.sp, fontWeight = FontWeight.Black)
        if (!sub.isNullOrBlank()) {
            Text(sub, color = colors.textSecondary, fontSize = 10.sp)
        }
    }
}