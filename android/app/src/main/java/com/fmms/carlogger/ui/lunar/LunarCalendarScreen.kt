package com.fmms.carlogger.ui.lunar

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.ui.theme.FmmsColors
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import com.fmms.carlogger.util.LunarCalendar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Calendar
import java.util.Locale

private const val TAG = "LunarCal"

/** Âm lịch — lưới tháng dương lịch; bấm vào ngày xem chi tiết hành trình + âm lịch.
 *  Layout tự thích ứng: dọc = 1 cột (lịch trên, chi tiết dưới); ngang/tablet = 2 cột song song.
 *  Toàn bộ nội dung luôn cuộn được khi không đủ chỗ. */
@Composable
fun LunarCalendarScreen(initialY: Int = 0, initialM: Int = 0, initialD: Int = 0) {
    val colors = LocalFmmsColors.current
    val now = remember { Calendar.getInstance() }
    val todaySolar = now.get(Calendar.DAY_OF_MONTH)

    // Mở từ Dashboard với ngày cụ thể (bấm vào ô ngày dương/âm), nếu không thì hôm nay
    val hasInitial = initialY > 0 && initialM in 1..12 && initialD in 1..31

    var year by rememberSaveable { mutableIntStateOf(if (hasInitial) initialY else now.get(Calendar.YEAR)) }
    var month by rememberSaveable { mutableIntStateOf(if (hasInitial) initialM else now.get(Calendar.MONTH) + 1) }
    var selY by rememberSaveable { mutableIntStateOf(year) }
    var selM by rememberSaveable { mutableIntStateOf(month) }
    var selD by rememberSaveable { mutableIntStateOf(if (hasInitial) initialD else todaySolar) }

    val grid = remember(year, month) { LunarCalendar.monthGrid(year, month) }
    val todayLunar = remember { LunarCalendar.today() }

    var loading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var statsByVehicle by remember { mutableStateOf<List<VehicleDayStats>>(emptyList()) }

    LaunchedEffect(selY, selM, selD) {
        loading = true
        errorMsg = null
        statsByVehicle = withContext(Dispatchers.IO) {
            try {
                val c = Calendar.getInstance()
                c.clear()
                c.set(selY, selM - 1, selD, 0, 0, 0)
                c.set(Calendar.MILLISECOND, 0)
                val from = c.timeInMillis
                val to = from + 24L * 3600 * 1000 - 1
                Log.d(TAG, "load day $selY-%02d-%02d from=$from to=$to".format(selM, selD))

                // Xe active TRƯỚC (đường dữ liệu đã chạy đúng ở rev27), sau đó các xe khác.
                val active = AppContainer.vehicleRepository.getActive()
                val all = runCatching { AppContainer.vehicleRepository.getAll() }
                    .onFailure { Log.w(TAG, "getAll() failed", it) }
                    .getOrElse { emptyList() }
                Log.d(TAG, "vehicles: active=${active?.id} allCount=${all.size}")
                val ordered = (listOfNotNull(active) + all).distinctBy { it.id }

                ordered.mapNotNull { vehicle ->
                    val trips = runCatching {
                        AppContainer.tripRepository.getBetween(vehicle.id, from, to)
                    }.onFailure { Log.w(TAG, "getBetween(${vehicle.id}) failed", it) }
                        .getOrElse { emptyList() }
                    val fuels = runCatching {
                        AppContainer.fuelLogRepository.getBetween(vehicle.id, from, to)
                    }.onFailure { Log.w(TAG, "fuel getBetween(${vehicle.id}) failed", it) }
                        .getOrElse { emptyList() }
                    Log.d(TAG, "vehicle ${vehicle.id.take(8)} trips=${trips.size} fuels=${fuels.size}")
                    if (trips.isEmpty() && fuels.isEmpty()) null else VehicleDayStats(
                        vehicleId = vehicle.id,
                        vehicleName = vehicle.name.ifBlank { vehicle.licensePlate.ifBlank { "Xe ${vehicle.id.take(6)}" } },
                        tripCount = trips.size,
                        distanceKm = trips.sumOf { it.distanceKm },
                        durationSeconds = trips.sumOf { it.durationSeconds },
                        maxSpeedKmh = trips.mapNotNull { it.maxSpeedKmh }.maxOrNull() ?: 0.0,
                        fuelCount = fuels.size,
                        fuelLiters = fuels.sumOf { it.fuelLiters },
                        fuelCost = fuels.sumOf { it.totalCost ?: 0.0 },
                    )
                }.also { Log.d(TAG, "result rows=${it.size}") }
            } catch (e: Exception) {
                Log.e(TAG, "load day stats failed", e)
                errorMsg = e.message ?: e.javaClass.simpleName
                emptyList()
            }
        }
        loading = false
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
    ) {
        val isWide = maxWidth >= 480.dp && maxWidth > maxHeight

        if (isWide) {
            // NGANG / TABLET: 2 cột — lịch bên trái, chi tiết ngày bên phải
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    HeaderRow(now, year, month, todaySolar,
                        onPrev = { month -= 1; if (month == 0) { month = 12; year -= 1 }; selY = year; selM = month; selD = 1 },
                        onNext = { month += 1; if (month == 13) { month = 1; year += 1 }; selY = year; selM = month; selD = 1 },
                        onToday = { year = now.get(Calendar.YEAR); month = now.get(Calendar.MONTH) + 1; selY = year; selM = month; selD = todaySolar },
                        colors = colors,
                    )
                    MonthTitle(month, year, todayLunar, colors)
                    WeekdayHeader(colors)
                    MonthGrid(grid, year, month, selY, selM, selD, todaySolar, now, colors) { d -> selD = d }
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.Top,
                ) {
                    DayDetailCard(selY, selM, selD, loading, errorMsg, statsByVehicle, colors)
                    Spacer(modifier = Modifier.height(12.dp))
                    VanNienCard(selY, selM, selD, colors)
                }
            }
        } else {
            // DỌC (mặc định): 1 cột — lịch trên, chi tiết dưới, cuộn được
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            ) {
                HeaderRow(now, year, month, todaySolar,
                    onPrev = { month -= 1; if (month == 0) { month = 12; year -= 1 }; selY = year; selM = month; selD = 1 },
                    onNext = { month += 1; if (month == 13) { month = 1; year += 1 }; selY = year; selM = month; selD = 1 },
                    onToday = { year = now.get(Calendar.YEAR); month = now.get(Calendar.MONTH) + 1; selY = year; selM = month; selD = todaySolar },
                    colors = colors,
                )
                MonthTitle(month, year, todayLunar, colors)
                WeekdayHeader(colors)
                MonthGrid(grid, year, month, selY, selM, selD, todaySolar, now, colors) { d -> selD = d }
                Spacer(modifier = Modifier.height(16.dp))
                DayDetailCard(selY, selM, selD, loading, errorMsg, statsByVehicle, colors)
                Spacer(modifier = Modifier.height(12.dp))
                VanNienCard(selY, selM, selD, colors)
            }
        }
    }
}

@Composable
private fun HeaderRow(
    now: Calendar,
    year: Int,
    month: Int,
    todaySolar: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onToday: () -> Unit,
    colors: FmmsColors,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        TextButton(onClick = onPrev) { Text("◀", color = colors.cyan, fontSize = 18.sp) }
        Spacer(modifier = Modifier.width(4.dp))
        // Nút HÔM NAY — bấm để quay về tháng hiện tại và chọn ngày hôm nay
        TextButton(onClick = onToday) {
            Text(
                "HÔM NAY",
                color = colors.cyan,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
            )
        }
        Spacer(modifier = Modifier.width(4.dp))
        TextButton(onClick = onNext) { Text("▶", color = colors.cyan, fontSize = 18.sp) }
    }
}

@Composable
private fun MonthTitle(month: Int, year: Int, todayLunar: LunarCalendar.LunarDate, colors: FmmsColors) {
    Text(
        text = String.format(Locale.US, "%d", month) + " / " + year,
        color = colors.cyan,
        fontSize = 26.sp,
        fontWeight = FontWeight.Black,
        modifier = Modifier.fillMaxWidth(),
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(4.dp))
    Text(
        text = "Âm lịch hôm nay: ${LunarCalendar.fullLunarLabel(todayLunar)}",
        color = colors.textSecondary,
        fontSize = 12.sp,
        modifier = Modifier.fillMaxWidth(),
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(16.dp))
}

@Composable
private fun WeekdayHeader(colors: FmmsColors) {
    Row(modifier = Modifier.fillMaxWidth()) {
        listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN").forEach { w ->
            Text(
                w,
                color = colors.textSecondary,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
            )
        }
    }
    Spacer(modifier = Modifier.height(6.dp))
}

/** Lưới ngày tĩnh (không lazy) — an toàn trong bố cục cuộn được. */
@Composable
private fun MonthGrid(
    grid: Map<Int, LunarCalendar.LunarDate>,
    year: Int,
    month: Int,
    selY: Int,
    selM: Int,
    selD: Int,
    todaySolar: Int,
    now: Calendar,
    colors: FmmsColors,
    onSelect: (Int) -> Unit,
) {
    val leadingEmpty = firstDow(year, month)
    val cells: List<Int?> = List(leadingEmpty) { null } + (1..grid.size).toList()
    cells.chunked(7).forEach { week ->
        Row(modifier = Modifier.fillMaxWidth()) {
            week.forEach { solar ->
                if (solar == null) {
                    LunarCell(
                        solarDay = null, lunar = null, isToday = false, isSelected = false,
                        onClick = null, colors = colors,
                        modifier = Modifier.weight(1f),
                    )
                } else {
                    val lunar = grid[solar]
                    val isToday = solar == todaySolar && year == now.get(Calendar.YEAR) && month == now.get(Calendar.MONTH) + 1
                    LunarCell(
                        solarDay = solar,
                        lunar = lunar,
                        isToday = isToday,
                        isSelected = solar == selD && month == selM && year == selY,
                        onClick = { onSelect(solar) },
                        colors = colors,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            repeat(7 - week.size) { Spacer(modifier = Modifier.weight(1f)) }
        }
    }
}

private data class VehicleDayStats(
    val vehicleId: String,
    val vehicleName: String,
    val tripCount: Int,
    val distanceKm: Double,
    val durationSeconds: Long,
    val maxSpeedKmh: Double,
    val fuelCount: Int = 0,
    val fuelLiters: Double = 0.0,
    val fuelCost: Double = 0.0,
)

@Composable
private fun LunarCell(
    solarDay: Int?,
    lunar: LunarCalendar.LunarDate?,
    isToday: Boolean,
    isSelected: Boolean,
    onClick: (() -> Unit)?,
    colors: FmmsColors,
    modifier: Modifier = Modifier,
) {
    val bg = when {
        isSelected -> colors.cyan.copy(alpha = 0.28f)
        isToday -> colors.cyan.copy(alpha = 0.12f)
        else -> Color.Transparent
    }
    val borderColor = when {
        isSelected -> colors.cyan
        isToday -> colors.cyan.copy(alpha = 0.7f)
        else -> Color.Transparent
    }
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(2.dp)
            .clip(RoundedCornerShape(10.dp))
            .then(if (isToday || isSelected) Modifier.border(2.dp, borderColor, RoundedCornerShape(10.dp)) else Modifier)
            .background(bg)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (solarDay == null) return@Column
            val lunarDay = lunar?.day
            val hl = lunarDay != null && LunarCalendar.isHighlightLunarDay(lunarDay)
            Text(
                solarDay.toString(),
                color = if (isSelected) colors.cyan else colors.textPrimary,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Black else FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(1.dp))
            Text(
                lunarDay?.let { l ->
                    when {
                        l == 1 -> "1"
                        l == 15 -> "15"
                        else -> l.toString()
                    }
                } ?: "",
                color = if (hl) colors.amber else colors.textSecondary,
                fontSize = 9.sp,
            )
        }
    }
}

@Composable
private fun DayDetailCard(
    selY: Int,
    selM: Int,
    selD: Int,
    loading: Boolean,
    errorMsg: String?,
    statsList: List<VehicleDayStats>,
    colors: FmmsColors,
) {
    val isToday = Calendar.getInstance().let {
        it.get(Calendar.DAY_OF_MONTH) == selD && it.get(Calendar.MONTH) + 1 == selM && it.get(Calendar.YEAR) == selY
    }
    val lunar = remember(selY, selM, selD) { LunarCalendar.convert(selD, selM, selY) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(
                if (isToday) "HÔM NAY" else "CHI TIẾT NGÀY",
                color = colors.textSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(4.dp))
            val solarLabel = LunarCalendar.weekdayVi(selD, selM, selY) + ", " +
                String.format(Locale.US, "%02d/%02d/%04d", selD, selM, selY)
            Text(solarLabel, color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Âm: ${LunarCalendar.fullLunarLabel(lunar)}",
                color = colors.cyan,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = colors.divider)
            Spacer(modifier = Modifier.height(10.dp))

            when {
                loading -> Text("Đang tải...", color = colors.textSecondary, fontSize = 12.sp)
                errorMsg != null -> Text(
                    "Lỗi tải dữ liệu: $errorMsg",
                    color = colors.amber,
                    fontSize = 12.sp,
                )
                statsList.isEmpty() -> Text("Không có hành trình / đổ xăng trong ngày này.", color = colors.textSecondary, fontSize = 12.sp)
                else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    statsList.forEach { s ->
                        VehicleDayRow(stats = s, colors = colors)
                    }
                }
            }
        }
    }
}

@Composable
private fun VanNienCard(selY: Int, selM: Int, selD: Int, colors: FmmsColors) {
    val vn = remember(selY, selM, selD) { LunarCalendar.vanNien(selD, selM, selY) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
            Text(
                "VẠN NIÊN",
                color = colors.textSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(6.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("NGÀY", color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(vn.dayCanChi, color = colors.cyan, fontSize = 16.sp, fontWeight = FontWeight.Black)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("THÁNG", color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(vn.monthCanChi, color = colors.textPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("TRỰC", color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    Text(vn.truc, color = colors.amber, fontSize = 16.sp, fontWeight = FontWeight.Black)
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(vn.trucNote, color = colors.textSecondary, fontSize = 11.sp)

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = colors.divider)
            Spacer(modifier = Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (vn.isHoangDaoDay) "NGÀY HOÀNG ĐẠO" else "NGÀY HẮC ĐẠO",
                    color = if (vn.isHoangDaoDay) Color(0xFF34D399) else Color(0xFFF87171),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sao: ${vn.dayStar}", color = colors.textPrimary, fontSize = 12.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))

            Text("GIỜ HOÀNG ĐẠO", color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                vn.goodHours.joinToString("  •  "),
                color = Color(0xFF34D399),
                fontSize = 12.sp,
                lineHeight = 17.sp,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Tuổi xung: ${vn.xungChi}",
                color = colors.amber,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun VehicleDayRow(stats: VehicleDayStats, colors: FmmsColors) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface.copy(alpha = 0.7f)),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(stats.vehicleName, color = colors.cyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                DayCell("CHUYẾN", "${stats.tripCount}", colors.textPrimary)
                DayCell("QUÃNG ĐƯỜNG", String.format(Locale.US, "%.1f km", stats.distanceKm), colors.cyan)
                DayCell("THỜI GIAN", dayDuration(stats.durationSeconds), colors.textPrimary)
                DayCell("TỐC ĐỘ MAX", if (stats.maxSpeedKmh > 0) "${stats.maxSpeedKmh.toInt()} km/h" else "—", colors.amber)
            }
            if (stats.fuelCount > 0) {
                Spacer(modifier = Modifier.height(6.dp))
                HorizontalDivider(color = colors.divider)
                Spacer(modifier = Modifier.height(6.dp))
                val cost = if (stats.fuelCost > 0) " • ${String.format(Locale.US, "%,.0f₫", stats.fuelCost)}" else ""
                Text(
                    "⛽ Đổ xăng: ${stats.fuelCount} lần • ${String.format(Locale.US, "%.1f lít", stats.fuelLiters)}$cost",
                    color = Color(0xFF34D399),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun DayCell(label: String, value: String, color: Color) {
    val colors = LocalFmmsColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(value, color = color, fontSize = 14.sp, fontWeight = FontWeight.Black)
    }
}

private fun dayDuration(secs: Long): String {
    val h = secs / 3600
    val m = (secs % 3600) / 60
    val s = secs % 60
    return if (h > 0) String.format(Locale.US, "%d:%02d:%02d", h, m, s)
    else String.format(Locale.US, "%02d:%02d", m, s)
}

/** 0=Thứ Hai ... 6=Chủ Nhật của ngày đầu tháng. */
private fun firstDow(year: Int, month: Int): Int {
    val c = Calendar.getInstance()
    c.clear()
    c.set(year, month - 1, 1)
    // Calendar.SUNDAY=1...SATURDAY=7 -> map về T2=0
    val dow = c.get(Calendar.DAY_OF_WEEK)
    return (dow + 5) % 7
}
