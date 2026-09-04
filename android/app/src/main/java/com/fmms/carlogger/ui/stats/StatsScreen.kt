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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.data.repository.TripAggregate
import com.fmms.carlogger.ui.common.FmmsGradientButton
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

        // Donut phân bổ chi phí — chỉ ở chế độ THÁNG và NĂM (không hiện ở NGÀY).
        // Ở chế độ NĂM donut tự hiện data CẢ NĂM khi mở tab, không cần chọn gì thêm.
        if (mode != AnalyticsMode.DAILY) {
            CostBreakdownCard(
                selectedYear, selectedMonth, years, expenseBreakdown,
                vm::selectYear, vm::selectMonth, colors, border,
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

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
                selectedYear, years, monthly,
                vm::selectYear, colors, border, grid, strings,
            )
            AnalyticsMode.YEARLY -> YearlyMode(
                selectedYear, years, yearly, vm::selectYear,
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
    year: Int?, years: List<Int>, monthly: List<PeriodStat>,
    onSelectYear: (Int) -> Unit,
    colors: FmmsColors, border: Color, grid: Color,
    strings: FmmsStrings,
) {
    // Chọn năm (ảnh hưởng biểu đồ 12 tháng bên dưới)
    if (years.isNotEmpty()) {
        PeriodDropdown(
            label = "Năm",
            value = year?.toString() ?: "—",
            options = years.map { it.toString() },
            colors = colors, border = border,
            modifier = Modifier.fillMaxWidth(),
        ) { onSelectYear(years[it]) }
        Spacer(modifier = Modifier.height(12.dp))
    }

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
    year: Int?, years: List<Int>, yearly: List<PeriodStat>,
    onSelectYear: (Int) -> Unit,
    colors: FmmsColors, border: Color, grid: Color,
    strings: FmmsStrings,
) {
    // Chọn năm (dropdown hiện đại)
    if (years.isNotEmpty()) {
        PeriodDropdown(
            label = "Năm",
            value = year?.toString() ?: "—",
            options = years.map { it.toString() },
            colors = colors, border = border,
            modifier = Modifier.fillMaxWidth(),
        ) { onSelectYear(years[it]) }
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
}

private val MONTH_NAMES = listOf("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")

/** Các lựa chọn Tháng trong bộ lọc: ["Cả năm"] + tháng tiếng Anh. */
private val MONTH_OPTIONS = listOf("Cả năm") + MONTH_NAMES

/** Nhãn cho dropdown Tháng: index 0 = "Cả năm", còn lại = tên tháng tiếng Anh. */
private fun monthLabel(month: Int): String = if (month == 0) MONTH_OPTIONS[0] else MONTH_NAMES[month - 1]

/** Donut phân bổ chi phí hiển thị mặc định; Năm/Tháng chỉ là bộ lọc. */
@Composable
private fun CostBreakdownCard(
    year: Int?, selectedMonth: Int, years: List<Int>, data: List<ExpenseSlice>,
    onSelectYear: (Int) -> Unit, onSelectMonth: (Int) -> Unit,
    colors: FmmsColors, border: Color,
) {
    val total = data.sumOf { it.amount }
    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("PHÂN BỔ CHI PHÍ", color = colors.cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PeriodDropdown(
                label = "Năm",
                value = year?.toString() ?: "—",
                options = years.map { it.toString() },
                colors = colors, border = border,
                modifier = Modifier.weight(1f),
            ) { onSelectYear(years[it]) }
            PeriodDropdown(
                label = "Tháng",
                value = monthLabel(selectedMonth),
                options = MONTH_OPTIONS,
                colors = colors, border = border,
                modifier = Modifier.weight(2f),
            ) { onSelectMonth(it) }
        }
        Spacer(modifier = Modifier.height(8.dp))

        if (data.isNotEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                // Biểu đồ donut bên TRÁI, tổng chi phí nằm chính giữa donut.
                DonutChart(
                    data = data,
                    centerLabel = "TOTAL",
                    centerValue = formatVnd(total),
                    modifier = Modifier.size(150.dp),
                )
                Spacer(modifier = Modifier.width(14.dp))
                // Chú thích (legend) bên PHẢI.
                Column(modifier = Modifier.weight(1f)) {
                    data.forEachIndexed { i, slice ->
                        val pct = if (total > 0) (slice.amount / total) * 100.0 else 0.0
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
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
        } else {
            Text(
                "Chưa có chi phí cho ${monthLabel(selectedMonth)} ${year ?: ""}",
                color = colors.textSecondary, fontSize = 13.sp,
            )
        }
    }
}

/** Dropdown hiện đại với avatar zone + trailing chevron, giao diện glass. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PeriodDropdown(
    label: String,
    value: String,
    options: List<String>,
    colors: FmmsColors,
    border: Color,
    modifier: Modifier = Modifier,
    onSelect: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier,
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            readOnly = true,
            label = { Text(label, color = colors.textSecondary, fontSize = 10.sp) },
            trailingIcon = {
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            },
            modifier = Modifier.fillMaxWidth().menuAnchor(),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = colors.cyan.copy(alpha = 0.5f),
                unfocusedBorderColor = border,
                focusedContainerColor = colors.surface.copy(alpha = 0.55f),
                unfocusedContainerColor = colors.surface.copy(alpha = 0.55f),
                focusedTextColor = colors.textPrimary,
                unfocusedTextColor = colors.textPrimary,
                cursorColor = colors.cyan,
                focusedLabelColor = colors.cyan,
                unfocusedLabelColor = colors.textSecondary,
            ),
            singleLine = true,
            textStyle = androidx.compose.ui.text.TextStyle(
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary,
            ),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEachIndexed { i, opt ->
                DropdownMenuItem(
                    text = {
                        Text(
                            opt,
                            fontSize = 13.sp,
                            fontWeight = if (opt == value) FontWeight.Bold else FontWeight.Normal,
                            color = if (opt == value) colors.cyan else colors.textPrimary,
                        )
                    },
                    onClick = {
                        expanded = false
                        onSelect(i)
                    },
                    contentPadding = ExposedDropdownMenuDefaults.ItemContentPadding,
                )
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

            // Dòng ra lệnh bằng giọng nói qua nút micro ảo trên màn hình.
            VoiceAskBar(
                onTranscript = { vm.ask(it) },
                colors = colors, border = border,
            )
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
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        if (vm.ttsReady.collectAsState().value) {
                            TextButton(onClick = {
                                vm.readAloud()
                            }, contentPadding = PaddingValues(horizontal = 6.dp)) {
                                Text("🔊 Nghe lại", color = colors.purple, fontSize = 12.sp)
                            }
                        }
                        var readAloud by remember {
                            mutableStateOf(AppContainer.prefs.getAiReadAloud())
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Text(
                                "Tự đọc",
                                color = colors.textSecondary, fontSize = 11.sp,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Switch(
                                checked = readAloud,
                                onCheckedChange = { on ->
                                    readAloud = on
                                    vm.setReadAloud(on)
                                },
                                modifier = Modifier.scale(0.65f),
                            )
                        }
                        TextButton(onClick = { vm.ask() }, contentPadding = PaddingValues(horizontal = 6.dp)) {
                            Text("Làm mới", color = colors.purple, fontSize = 12.sp)
                        }
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

/** Thanh micro ảo: dùng SpeechRecognizer nhận giọng nói tiếng Việt rồi gửi làm câu hỏi cho AI. */
@Composable
private fun VoiceAskBar(
    onTranscript: (String) -> Unit,
    colors: FmmsColors,
    border: Color,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sr = remember { runCatching { android.speech.SpeechRecognizer.createSpeechRecognizer(context) }.getOrNull() }
    DisposableEffect(Unit) {
        onDispose { runCatching { sr?.destroy() } }
    }
    var listening by remember { mutableStateOf(false) }
    var partial by remember { mutableStateOf("") }
    var micError by remember { mutableStateOf<String?>(null) }

    val listener = remember {
        object : android.speech.RecognitionListener {
            override fun onReadyForSpeech(params: android.os.Bundle?) {
                listening = true
                micError = null
            }

            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}

            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                listening = false
            }

            override fun onError(error: Int) {
                listening = false
                micError = when (error) {
                    android.speech.SpeechRecognizer.ERROR_NO_MATCH -> "Không nghe rõ, thử lại"
                    android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Hết thời gian nghe"
                    android.speech.SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Cần quyền micro"
                    android.speech.SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Bộ nhận giọng nói đang bận"
                    android.speech.SpeechRecognizer.ERROR_CLIENT -> "Không dùng được mic (thiếu Google voice?)"
                    else -> "Lỗi mic ($error)"
                }
            }

            override fun onResults(results: android.os.Bundle?) {
                listening = false
                val txt = results
                    ?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.trim()
                if (!txt.isNullOrBlank()) {
                    onTranscript(txt)
                    partial = ""
                }
            }

            override fun onPartialResults(partialResults: android.os.Bundle?) {
                partial = partialResults
                    ?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    .orEmpty()
            }

            override fun onEvent(eventType: Int, params: android.os.Bundle?) {}
        }
    }

    val micPermLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startVoiceListening(sr, listener) { listening = true; partial = "" }
        } else {
            micError = "Chưa cấp quyền micro"
        }
    }

    fun handleMicClick() {
        micError = null
        if (androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.RECORD_AUDIO,
            ) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            micPermLauncher.launch(android.Manifest.permission.RECORD_AUDIO)
            return
        }
        if (listening) {
            runCatching { sr?.cancel() }
            listening = false
            return
        }
        startVoiceListening(sr, listener) { listening = true; partial = "" }
    }

    GlassCard(modifier = Modifier.fillMaxWidth(), colors = colors, border = border) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = { handleMicClick() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (listening) colors.red.copy(alpha = 0.25f)
                    else colors.purple.copy(alpha = 0.2f),
                    contentColor = colors.purple,
                ),
                modifier = Modifier.size(width = 44.dp, height = 40.dp),
                contentPadding = PaddingValues(0.dp),
            ) {
                Text(if (listening) "◉" else "🎙", fontSize = 16.sp)
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                if (listening) {
                    Text("Đang nghe...", color = colors.cyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    if (partial.isNotBlank()) {
                        Text("“$partial”", color = colors.textSecondary, fontSize = 11.sp,
                            maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                    }
                } else {
                    Text("Hỏi AI bằng giọng nói (tiếng Việt)", color = colors.textSecondary, fontSize = 12.sp)
                    micError?.let {
                        Text(it, color = colors.red, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

private fun startVoiceListening(
    sr: android.speech.SpeechRecognizer?,
    listener: android.speech.RecognitionListener,
    onStart: () -> Unit,
) {
    val engine = sr ?: run {
        android.util.Log.d("VoiceAsk", "chưa có speech recognizer")
        return
    }
    onStart()
    runCatching {
        val intent = android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "vi-VN")
            putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        engine.setRecognitionListener(listener)
        engine.startListening(intent)
    }.onFailure {
        android.util.Log.e("VoiceAsk", "startListening thất bại", it)
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