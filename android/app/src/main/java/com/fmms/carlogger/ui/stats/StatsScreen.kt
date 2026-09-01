package com.fmms.carlogger.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fmms.carlogger.data.repository.TripAggregate
import com.fmms.carlogger.ui.i18n.FmmsStrings
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.FmmsColors
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import java.util.Locale

@Composable
fun StatsScreen(
    vm: StatsViewModel = viewModel(),
    aiVm: AiAdvisorViewModel = viewModel(),
) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    val mode by vm.mode.collectAsState()
    val today by vm.today.collectAsState()
    val month by vm.month.collectAsState()
    val total by vm.total.collectAsState()
    val dailyLog by vm.dailyLog.collectAsState(emptyList())
    val monthly by vm.monthly.collectAsState(emptyList())
    val yearly by vm.yearly.collectAsState(emptyList())
    val years by vm.years.collectAsState(emptyList())
    val selectedYear by vm.selectedYear.collectAsState()
    val fuelPrice by vm.fuelPriceVnd.collectAsState()
    val driveSecondsToday by vm.driveSecondsToday.collectAsState()
    val driveSecondsMonth by vm.driveSecondsMonth.collectAsState()
    val odoKm by vm.odoKm.collectAsState()
    val prevMonthDistance by vm.prevMonthDistanceKm.collectAsState()
    val selectedMonth by vm.selectedMonth.collectAsState()
    val expenseBreakdown by vm.expenseBreakdown.collectAsState()

    val border = Color.White.copy(alpha = 0.08f)
    val grid = colors.divider.copy(alpha = 0.35f)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text(strings.stats, color = colors.textPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Giá tham chiếu: ${formatVndFull(fuelPrice)}/L",
            color = colors.textSecondary, fontSize = 11.sp,
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Chọn chế độ Ngày / Tháng / Năm
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AnalyticsMode.entries.forEach { m ->
                FilterChip(
                    selected = mode == m,
                    onClick = { vm.setMode(m) },
                    label = {
                        Text(
                            when (m) {
                                AnalyticsMode.DAILY -> strings.statsModeDaily
                                AnalyticsMode.MONTHLY -> strings.statsModeMonthly
                                AnalyticsMode.YEARLY -> strings.statsModeYearly
                            },
                            fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.cyan.copy(alpha = 0.18f),
                        selectedLabelColor = colors.cyan,
                        disabledContainerColor = Color.Transparent,
                    ),
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        when (mode) {
            AnalyticsMode.DAILY -> DailyMode(
                today, month, total, dailyLog, driveSecondsToday, driveSecondsMonth,
                prevMonthDistance, odoKm, colors, border, grid, strings,
            )
            AnalyticsMode.MONTHLY -> MonthlyMode(
                selectedYear, selectedMonth, years, monthly, expenseBreakdown,
                vm::selectYear, vm::selectMonth, colors, border, grid, strings,
            )
            AnalyticsMode.YEARLY -> YearlyMode(
                selectedYear, years, yearly, expenseBreakdown, vm::selectYear,
                colors, border, grid, strings,
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        AiAdvisorPanel(aiVm, colors, border, strings)
    }
}

// ============ Chế độ Ngày ============

@Composable
private fun DailyMode(
    today: TripAggregate?, month: TripAggregate?, total: TripAggregate?,
    dailyLog: List<DayLogEntry>,
    driveSecondsToday: Long, driveSecondsMonth: Long,
    prevMonthDistanceKm: Double, odoKm: Double?,
    colors: FmmsColors, border: Color, grid: Color,
    strings: FmmsStrings,
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        GlassCard(modifier = Modifier.weight(1f), colors = colors, border = border) {
            KpiCell(strings.today, today, colors)
        }
        GlassCard(modifier = Modifier.weight(1f), colors = colors, border = border) {
            KpiCell(strings.thisMonth, month, colors)
        }
    }
    Spacer(modifier = Modifier.height(12.dp))

    // Tổng quan lịch sử: tốc độ, số chuyến, thời gian lái, nhiên liệu lũy kế
    StatsOverview(total, colors, border, strings)
    Spacer(modifier = Modifier.height(12.dp))

    // So sánh tháng này vs tháng trước + cảnh báo bảo dưỡng theo ODO
    CompareAndMaintenance(month, prevMonthDistanceKm, odoKm, colors, border, strings)
    Spacer(modifier = Modifier.height(12.dp))

    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Text(strings.distance + " (" + strings.byMonth + ")", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        KmBarChart(
            data = dailyLog.map { it.distanceKm },
            labels = dailyLog.map { it.dayOfMonth.toString() },
            color = colors.cyan, textColor = colors.textSecondary,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            ChartLegend(color = colors.cyan, label = strings.kmLegend, textColor = colors.textSecondary)
            Text(strings.restDayLegend, color = colors.textSecondary, fontSize = 10.sp)
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        var logExpanded by remember { mutableStateOf(false) }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(strings.dailyLog, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = { logExpanded = !logExpanded }) {
                Text(if (logExpanded) "▲ Thu gọn" else "▼ Xem chi tiết", color = colors.cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        if (logExpanded) {
            Spacer(modifier = Modifier.height(8.dp))
            dailyLog.forEach { e -> DayLogRow(e, colors, strings) }
        }
    }
}

/** Thẻ tổng quan: vài thông số phụ (tốc độ, chuyến, thời gian lái, nhiên liệu lũy kế). */
@Composable
private fun StatsOverview(
    total: TripAggregate?, colors: FmmsColors, border: Color, strings: FmmsStrings,
) {
    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Text("TỔNG QUAN", color = colors.cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(10.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            MiniKpi(strings.tripsCount, "${total?.tripCount ?: 0}", colors.cyan, colors)
            MiniKpi(strings.fuelUsed, String.format(Locale.US, "%.1f L", total?.fuelUsedLiters ?: 0.0), colors.amber, colors)
            MiniKpi(strings.avgSpeed, String.format(Locale.US, "%.0f", total?.avgSpeedKmh ?: 0.0) + " km/h", colors.emerald, colors)
            MiniKpi(strings.maxSpeed, String.format(Locale.US, "%.0f", total?.maxSpeedKmh ?: 0.0) + " km/h", colors.purple, colors)
        }
    }
}

/** So sánh % với tháng trước + cảnh báo bảo dưỡng theo ODO. */
@Composable
private fun CompareAndMaintenance(
    month: TripAggregate?, prevMonthKm: Double, odoKm: Double?,
    colors: FmmsColors, border: Color, strings: FmmsStrings,
) {
    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Text(strings.thisMonth + " · so sánh tháng trước", color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(10.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            val mKm = month?.distanceKm ?: 0.0
            val delta = if (prevMonthKm > 0.05) ((mKm - prevMonthKm) / prevMonthKm) * 100.0 else null
            MiniKpi(
                "Quãng đường T.Này",
                String.format(Locale.US, "%.0f km", mKm), colors.cyan, colors,
            )
            MiniKpi(
                "So vs T.Trước",
                if (delta == null) "—" else String.format(Locale.US, "%+.0f%%", delta),
                if (delta == null) colors.textSecondary else if (delta >= 0) colors.emerald else colors.red,
                colors,
            )
            MiniKpi(
                "Tháng trước",
                String.format(Locale.US, "%.0f km", prevMonthKm), colors.textSecondary, colors,
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        MaintenanceWarning(odoKm, colors)
    }
}

/** Cảnh báo bảo dưỡng dựa trên ODO so với các mốc service gợi ý. */
@Composable
private fun MaintenanceWarning(odoKm: Double?, colors: FmmsColors) {
    if (odoKm == null) {
        Text("Chưa có ODO để theo dõi bảo dưỡng.", color = colors.textSecondary, fontSize = 12.sp)
        return
    }
    val milestone = when {
        odoKm >= 20000 -> 20000.0
        odoKm >= 15000 -> 15000.0
        odoKm >= 10000 -> 10000.0
        odoKm >= 5000 -> 5000.0
        else -> 5000.0
    }
    val nextMilestone = ((odoKm / milestone).toInt() + 1) * milestone
    Text(
        "ODO ${String.format(Locale.US, "%.0f", odoKm)} km · mốc bảo dưỡng tiếp theo ${String.format(Locale.US, "%.0f km", nextMilestone)} (còn ${String.format(Locale.US, "%.0f km", nextMilestone - odoKm)})",
        color = if (nextMilestone - odoKm <= 500) colors.red else colors.emerald,
        fontSize = 12.sp, fontWeight = FontWeight.Bold,
    )
}

@Composable
private fun DayLogRow(e: DayLogEntry, colors: FmmsColors, strings: FmmsStrings) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            e.dateLabel,
            color = if (e.isRestDay) colors.textSecondary else colors.textPrimary,
            fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.width(54.dp),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            if (e.isRestDay) {
                Text(strings.restDayLegend, color = colors.textSecondary, fontSize = 11.sp)
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    e.tripsKm.take(4).forEach { km ->
                        Box(
                            modifier = Modifier
                                .background(colors.cyan.copy(alpha = 0.12f), RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        ) {
                            Text(String.format(Locale.US, "%.1f km", km), color = colors.cyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (e.tripsKm.size > 4) Text("+${e.tripsKm.size - 4}", color = colors.textSecondary, fontSize = 10.sp)
                }
                if (e.consumptionL100km != null) {
                    Text(
                        String.format(Locale.US, "%.1f L/100km", e.consumptionL100km),
                        color = colors.emerald, fontSize = 10.sp,
                    )
                }
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            if (!e.isRestDay) {
                Text(String.format(Locale.US, "%.1f km", e.distanceKm), color = colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text(formatVnd(e.fuelCostVnd), color = colors.amber, fontSize = 10.sp)
            }
            e.odoKm?.let { Text(String.format(Locale.US, "ODO %.0f", it), color = colors.textSecondary, fontSize = 9.sp) }
        }
    }
    HorizontalDivider(color = colors.divider.copy(alpha = 0.3f))
}

// ============ Chế độ Tháng ============

@Composable
private fun MonthlyMode(
    year: Int?, month: Int, years: List<Int>, monthly: List<PeriodStat>, expenseBreakdown: List<ExpenseSlice>,
    onSelectYear: (Int) -> Unit, onSelectMonth: (Int) -> Unit,
    colors: FmmsColors, border: Color, grid: Color,
    strings: FmmsStrings,
) {
    // Chọn năm
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        years.forEach { y ->
            FilterChip(
                selected = year == y,
                onClick = { onSelectYear(y) },
                label = { Text(y.toString(), fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = colors.cyan.copy(alpha = 0.18f),
                    selectedLabelColor = colors.cyan,
                ),
            )
        }
    }
    Spacer(modifier = Modifier.height(8.dp))

    // Chọn tháng (mặc định = tháng hiện tại)
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        (1..12).forEach { m ->
            FilterChip(
                selected = month == m,
                onClick = { onSelectMonth(m) },
                label = { Text("T$m", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = colors.amber.copy(alpha = 0.18f),
                    selectedLabelColor = colors.amber,
                ),
            )
        }
    }
    Spacer(modifier = Modifier.height(12.dp))

    // KPI cards
    val stats = monthlyStats(monthly)
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        GlassCard(modifier = Modifier.weight(1f), colors = colors, border = border) {
            MiniKpi(strings.totalCost, stats.totalCost?.let { formatVnd(it) } ?: "—", colors.amber, colors)
        }
        GlassCard(modifier = Modifier.weight(1f), colors = colors, border = border) {
            MiniKpi(strings.avgL100kmLabel, stats.consumption?.let { String.format(Locale.US, "%.1f", it) } ?: "—", colors.cyan, colors)
        }
    }
    Spacer(modifier = Modifier.height(10.dp))
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        GlassCard(modifier = Modifier.weight(1f), colors = colors, border = border) {
            MiniKpi(strings.costPerKmLabel, stats.costPerKm?.let { formatVnd(it) } ?: "—", colors.emerald, colors)
        }
        GlassCard(modifier = Modifier.weight(1f), colors = colors, border = border) {
            MiniKpi(strings.kmLegend, if (stats.totalKm > 0.05) String.format(Locale.US, "%.0f km", stats.totalKm) else "—", colors.cyan, colors)
        }
    }
    Spacer(modifier = Modifier.height(12.dp))

    // Donut chi phí theo danh mục (từ DB theo thời gian đã chọn)
    if (expenseBreakdown.isNotEmpty()) {
        ExpenseDonutCard("Chi phí tháng T$month", expenseBreakdown, colors, border, strings)
        Spacer(modifier = Modifier.height(12.dp))
    }

    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Text(strings.monthlyOverview, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            ChartLegend(color = colors.amber, label = strings.costLegend, textColor = colors.textSecondary)
            ChartLegend(color = colors.cyan, label = strings.kmLegend, textColor = colors.textSecondary)
        }
        Spacer(modifier = Modifier.height(8.dp))
        DualAxisBarLineChart(
            data = monthly, costColor = colors.amber,
            kmColor = colors.cyan, textColor = colors.textSecondary, gridColor = grid,
        )
    }
}

private data class MonthlyStats(val consumption: Double?, val costPerKm: Double?, val totalCost: Double?, val totalKm: Double)

private fun monthlyStats(monthly: List<PeriodStat>): MonthlyStats {
    val dist = monthly.sumOf { it.distanceKm }
    val fuel = monthly.sumOf { it.fuelUsedLiters }
    val cost = monthly.sumOf { it.fuelCostVnd }
    val consumptions = monthly.mapNotNull { it.consumptionL100km }
    return MonthlyStats(
        consumption = if (consumptions.isNotEmpty()) consumptions.average() else null,
        costPerKm = if (dist > 0.05 && cost > 0) cost / dist else null,
        totalCost = if (cost > 0) cost else null,
        totalKm = dist,
    )
}

// ============ Chế độ Năm ============

@Composable
private fun YearlyMode(
    year: Int?, years: List<Int>, yearly: List<PeriodStat>, expenseBreakdown: List<ExpenseSlice>,
    onSelectYear: (Int) -> Unit,
    colors: FmmsColors, border: Color, grid: Color,
    strings: FmmsStrings,
) {
    // Chọn năm
    if (years.isNotEmpty()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            years.forEach { y ->
                FilterChip(
                    selected = year == y,
                    onClick = { onSelectYear(y) },
                    label = { Text(y.toString(), fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = colors.cyan.copy(alpha = 0.18f),
                        selectedLabelColor = colors.cyan,
                    ),
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
    }

    val selected = yearly.firstOrNull { it.label.toIntOrNull() == year }
    if (selected == null) {
        GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
            Text(strings.noData, color = colors.textSecondary, fontSize = 12.sp)
        }
        return
    }

    val avgPerMonth = selected.distanceKm / 12.0
    val costPerKm = if (selected.distanceKm > 0.05 && selected.fuelCostVnd > 0) selected.fuelCostVnd / selected.distanceKm else null
    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Text(selected.label, color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            MiniKpi(strings.yearlyTotalKm, String.format(Locale.US, "%.0f", selected.distanceKm), colors.cyan, colors)
            MiniKpi(strings.yearlyAvgMonth, String.format(Locale.US, "%.0f km", avgPerMonth), colors.emerald, colors)
            MiniKpi(strings.costLegend, formatVnd(selected.fuelCostVnd), colors.amber, colors)
            MiniKpi(strings.costPerKmLabel, costPerKm?.let { formatVnd(it) } ?: "—", colors.purple, colors)
        }
    }
    Spacer(modifier = Modifier.height(12.dp))

    if (expenseBreakdown.isNotEmpty()) {
        ExpenseDonutCard("Chi phí năm ${selected.label}", expenseBreakdown, colors, border, strings)
    }
}

/** Thẻ donut chi phí theo danh mục (từ DB) kèm legend %. */
@Composable
private fun ExpenseDonutCard(
    title: String, data: List<ExpenseSlice>, colors: FmmsColors, border: Color, strings: FmmsStrings,
) {
    val total = data.sumOf { it.amount }
    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Text(title, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
        Box(modifier = Modifier.fillMaxWidth()) {
            DonutChart(
                data = data,
                centerLabel = "Tổng chi",
                centerValue = formatVnd(total),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        data.forEachIndexed { i, slice ->
            val pct = if (total > 0) (slice.amount / total) * 100.0 else 0.0
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(DONUT_COLORS[i % DONUT_COLORS.size], RoundedCornerShape(3.dp)),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(slice.label, color = colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                Text(formatVnd(slice.amount), color = colors.textPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.width(8.dp))
                Text(String.format(Locale.US, "%.0f%%", pct), color = colors.textSecondary, fontSize = 11.sp, modifier = Modifier.width(42.dp))
            }
        }
    }
}

// ============ Components ============

@Composable
private fun GlassCard(
    modifier: Modifier = Modifier,
    colors: FmmsColors,
    border: Color,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.55f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, border),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp), content = content)
    }
}

@Composable
private fun KpiCell(title: String, agg: TripAggregate?, colors: FmmsColors) {
    Text(title, color = colors.textSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    Spacer(modifier = Modifier.height(8.dp))
    Text(
        String.format(Locale.US, "%.1f km", agg?.distanceKm ?: 0.0),
        color = colors.cyan, fontSize = 22.sp, fontWeight = FontWeight.Black,
    )
    Spacer(modifier = Modifier.height(4.dp))
    Text(
        String.format(Locale.US, "%.1f L", agg?.fuelUsedLiters ?: 0.0),
        color = colors.amber, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
    )
    Text("${agg?.tripCount ?: 0} trips", color = colors.textSecondary, fontSize = 11.sp)
}

@Composable
private fun MiniKpi(label: String, value: String, color: Color, colors: FmmsColors, big: Boolean = false) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = if (big) 24.sp else 15.sp, fontWeight = FontWeight.Black)
    }
}

/** Panel AI Advisor — mở rộng để hiển thị insights từ Edge Function. */
@Composable
fun AiAdvisorPanel(
    vm: AiAdvisorViewModel,
    colors: FmmsColors,
    border: Color,
    strings: FmmsStrings,
) {
    val state by vm.state.collectAsState()
    var expanded by remember { mutableStateOf(false) }

    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.AutoAwesome,
                    contentDescription = null,
                    tint = colors.purple,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("AI Advisor", color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            TextButton(onClick = { expanded = !expanded }) {
                Text(if (expanded) "▲" else "▼", color = colors.purple, fontSize = 12.sp)
            }
        }

        if (expanded) {
            Spacer(modifier = Modifier.height(10.dp))
            when (val s = state) {
                is AiUiState.Idle -> {
                    Text(
                        "Phân tích chuyến đi, dự báo bảo dưỡng và mẹo tiết kiệm bằng AI dùng chung với Web.",
                        color = colors.textSecondary, fontSize = 12.sp,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = { vm.ask() },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.purple.copy(alpha = 0.2f), contentColor = colors.purple),
                    ) {
                        Text("Chạy phân tích AI", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
                is AiUiState.Loading -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = colors.purple, strokeWidth = 2.dp,
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Đang phân tích...", color = colors.textSecondary, fontSize = 12.sp)
                    }
                }
                is AiUiState.Success -> {
                    AiInsightBlock("Summary", s.insights.summary, colors.cyan)
                    s.insights.maintenancePrediction?.let { AiInsightBlock("Bảo dưỡng", it, colors.emerald) }
                    s.insights.costAlert?.let { AiInsightBlock("Chi phí", it, colors.amber) }
                    s.insights.fuelEfficiencyTip?.let { AiInsightBlock("Tiết kiệm", it, colors.cyan) }
                    Spacer(modifier = Modifier.height(6.dp))
                    TextButton(onClick = { vm.ask() }) {
                        Text("Làm mới", color = colors.purple, fontSize = 12.sp)
                    }
                }
                is AiUiState.Error -> {
                    Text("Lỗi: ${s.message}", color = colors.red, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = { vm.ask() }) {
                        Text("Thử lại", color = colors.purple, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun AiInsightBlock(title: String, body: String, color: Color) {
    Column {
        Text(title, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(body, color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp, lineHeight = 18.sp)
        Spacer(modifier = Modifier.height(10.dp))
    }
}