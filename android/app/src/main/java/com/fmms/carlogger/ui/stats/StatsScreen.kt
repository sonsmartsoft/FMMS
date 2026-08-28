package com.fmms.carlogger.ui.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.data.repository.TripAggregate
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class DailyStat(val label: String, val distanceKm: Double, val consumptionL100km: Double?)

class StatsViewModel : ViewModel() {
    private val c = AppContainer

    private val _today = MutableStateFlow<TripAggregate?>(null)
    val today = _today
    private val _month = MutableStateFlow<TripAggregate?>(null)
    val month = _month
    private val _total = MutableStateFlow<TripAggregate?>(null)
    val total = _total
    private val _daily = MutableStateFlow<List<DailyStat>>(emptyList())
    val daily = _daily
    private val _years = MutableStateFlow<List<Int>>(emptyList())
    val years = _years
    private val _selectedYear = MutableStateFlow<Int?>(null)
    val selectedYear = _selectedYear
    private val _monthly = MutableStateFlow<List<DailyStat>>(emptyList())
    val monthly = _monthly

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

            // Last 7 days (incl. today) for the bar/line charts.
            val cal = Calendar.getInstance()
            cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0)
            val dayFmt = SimpleDateFormat("EEE", Locale.getDefault())
            val daily = mutableListOf<DailyStat>()
            for (i in 6 downTo 0) {
                val start = cal.clone() as Calendar
                start.add(Calendar.DAY_OF_MONTH, -i)
                val s = start.timeInMillis
                val e = start.clone() as Calendar
                e.add(Calendar.DAY_OF_MONTH, 1)
                val dayTrips = c.tripRepository.getBetween(vehicle.id, s, e.timeInMillis)
                val dist = dayTrips.sumOf { it.distanceKm }
                val fuel = dayTrips.sumOf { it.fuelUsedLiters ?: 0.0 }
                daily += DailyStat(
                    label = dayFmt.format(Date(s)),
                    distanceKm = dist,
                    consumptionL100km = if (dist > 0.05 && fuel > 0) fuel / dist * 100 else null,
                )
            }
            _daily.value = daily

            _years.value = c.tripRepository.getYears(vehicle.id).ifEmpty {
                listOf(Calendar.getInstance().get(Calendar.YEAR))
            }
            _selectedYear.value = _years.value.firstOrNull() ?: Calendar.getInstance().get(Calendar.YEAR)
        }
    }

    fun selectYear(year: Int) {
        if (_selectedYear.value == year) return
        _selectedYear.value = year
        viewModelScope.launch {
            val vehicle = c.vehicleRepository.getActive() ?: return@launch
            _monthly.value = buildMonthly(vehicle.id, year)
        }
    }

    /** Loads monthly aggregates lazily once the year is chosen. */
    suspend fun ensureMonthly(vehicleId: String, year: Int) {
        if (_monthly.value.isNotEmpty()) return
        _monthly.value = buildMonthly(vehicleId, year)
    }

    private suspend fun buildMonthly(vehicleId: String, year: Int): List<DailyStat> {
        val monthFmt = SimpleDateFormat("MMM", Locale.getDefault())
        val result = mutableListOf<DailyStat>()
        for (m in 0 until 12) {
            val ms = Calendar.getInstance().apply {
                clear()
                set(year, m, 1)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            val me = Calendar.getInstance().apply {
                clear()
                set(year, m, 1)
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                add(Calendar.MONTH, 1)
            }.timeInMillis
            val monthTrips = c.tripRepository.getBetween(vehicleId, ms, me)
            val dist = monthTrips.sumOf { it.distanceKm }
            val fuel = monthTrips.sumOf { it.fuelUsedLiters ?: 0.0 }
            result += DailyStat(
                label = monthFmt.format(Date(ms)),
                distanceKm = dist,
                consumptionL100km = if (dist > 0.05 && fuel > 0) fuel / dist * 100 else null,
            )
        }
        return result
    }
}

@Composable
fun StatsScreen(vm: StatsViewModel = viewModel()) {
    val today by vm.today.collectAsState()
    val month by vm.month.collectAsState()
    val total by vm.total.collectAsState()
    val daily by vm.daily.collectAsState(emptyList())
    val years by vm.years.collectAsState(emptyList())
    val selectedYear by vm.selectedYear.collectAsState()
    val monthly by vm.monthly.collectAsState(emptyList())
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    val context = LocalContext.current
    val appScope = rememberCoroutineScope()

    LaunchedEffect(years) {
        val first = selectedYear ?: years.firstOrNull() ?: return@LaunchedEffect
        vm.ensureMonthly(AppContainer.vehicleRepository.getActive()?.id ?: return@LaunchedEffect, first)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text(strings.stats, color = colors.textPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(12.dp))

        StatsCard(strings.today, today)
        Spacer(modifier = Modifier.height(10.dp))
        StatsCard(strings.thisMonth, month)
        Spacer(modifier = Modifier.height(10.dp))
        StatsCard(strings.allTime, total)

        Spacer(modifier = Modifier.height(12.dp))

        // Charts: last 7 days
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.distance + " (7 " + strings.tripsCount.toLowerCase(Locale.getDefault()) + ")", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                BarChart(
                    data = daily.map { it.distanceKm },
                    labels = daily.map { it.label },
                    color = colors.cyan,
                    textColor = colors.textSecondary,
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text("L/100KM", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                LineChart(
                    data = daily.map { it.consumptionL100km },
                    labels = daily.map { it.label },
                    color = colors.amber,
                    textColor = colors.textSecondary,
                    lineColor = colors.background,
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Charts: by month (with year filter)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(strings.distance + " (" + strings.byMonth + ")", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    years.forEach { y ->
                        FilterChip(
                            selected = selectedYear == y,
                            onClick = {
                                vm.selectYear(y)
                                appScope.launch {
                                    vm.ensureMonthly(AppContainer.vehicleRepository.getActive()?.id ?: return@launch, y)
                                }
                            },
                            label = { Text(y.toString(), fontSize = 12.sp) },
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                BarChart(
                    data = monthly.map { it.distanceKm },
                    labels = monthly.map { it.label },
                    color = colors.cyan,
                    textColor = colors.textSecondary,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text("L/100KM", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                LineChart(
                    data = monthly.map { it.consumptionL100km },
                    labels = monthly.map { it.label },
                    color = colors.amber,
                    textColor = colors.textSecondary,
                    lineColor = colors.background,
                )
            }
        }
    }
}

/** Simple Canvas bar chart (7-day distance). */
@Composable
private fun BarChart(
    data: List<Double>,
    labels: List<String>,
    color: Color,
    textColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.fillMaxWidth().height(160.dp)) {
        val max = data.maxOrNull()?.takeIf { it > 0 } ?: 1.0
        val barW = size.width / data.size
        val rightPad = 0f
        data.forEachIndexed { i, v ->
            val h = (v / max).toFloat() * size.height * 0.8f
            val left = i * barW + barW * 0.18f
            val w = barW * 0.64f
            drawRoundRect(
                color = color,
                topLeft = Offset(left + rightPad / 2, size.height - h),
                size = androidx.compose.ui.geometry.Size(w, h),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f),
            )
        }
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        labels.forEach { lbl ->
            Text(lbl, color = textColor, fontSize = 9.sp, maxLines = 1)
        }
    }
}

/** Simple Canvas line chart (consumption / avg). */
@Composable
private fun LineChart(
    data: List<Double?>,
    labels: List<String>,
    color: Color,
    textColor: Color,
    lineColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.fillMaxWidth().height(160.dp)) {
        val max = data.mapNotNull { it }.maxOrNull()?.takeIf { it > 0 } ?: 1.0
        val stepX = size.width / (data.size - 1).coerceAtLeast(1)
        val points = data.mapIndexedNotNull { i, v ->
            if (v == null) null else Offset(i * stepX, size.height - ((v / max).toFloat() * size.height * 0.75f) - size.height * 0.15f)
        }
        if (points.isNotEmpty()) {
            // fill under line
            val path = androidx.compose.ui.graphics.Path().apply {
                moveTo(points.first().x, size.height)
                points.forEach { lineTo(it.x, it.y) }
                lineTo(points.last().x, size.height)
                close()
            }
            drawPath(path, color = color.copy(alpha = 0.18f))
            for (i in 0 until points.size - 1) {
                drawLine(color = color, start = points[i], end = points[i + 1], strokeWidth = 8.dp.toPx(), cap = StrokeCap.Round)
            }
            points.forEach { p ->
                drawCircle(color = color, radius = 5.dp.toPx() * 0.8f, center = p)
            }
        } else {
            drawLine(
                color = textColor.copy(alpha = 0.4f),
                start = Offset(0f, size.height / 2),
                end = Offset(size.width, size.height / 2),
                strokeWidth = 2.dp.toPx(),
            )
        }
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        labels.forEach { lbl ->
            Text(lbl, color = textColor, fontSize = 9.sp, maxLines = 1)
        }
    }
}

@Composable
private fun StatsCard(title: String, agg: TripAggregate?) {
    val colors = LocalFmmsColors.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                StatCell("DISTANCE", agg?.distanceKm?.let { String.format(Locale.US, "%.1f km", it) } ?: "—", colors.cyan)
                StatCell("FUEL USED", agg?.fuelUsedLiters?.let { String.format(Locale.US, "%.1f L", it) } ?: "—", colors.amber)
                StatCell("TRIPS", agg?.tripCount?.toString() ?: "0", colors.textPrimary)
                StatCell("AVG SPEED", agg?.avgSpeedKmh?.takeIf { it > 0 }?.let { String.format(Locale.US, "%.0f km/h", it) } ?: "—", colors.emerald)
            }
        }
    }
}

@Composable
private fun StatCell(label: String, value: String, color: Color) {
    val colors = LocalFmmsColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 15.sp, fontWeight = FontWeight.Black)
    }
}