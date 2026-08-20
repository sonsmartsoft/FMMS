package com.fmms.carlogger.ui.lunar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
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

/** Âm lịch — lưới tháng dương lịch; bấm vào ngày xem chi tiết hành trình + âm lịch. */
@Composable
fun LunarCalendarScreen(onBack: () -> Unit) {
    val colors = LocalFmmsColors.current
    val now = Calendar.getInstance()
    var year by remember { mutableStateOf(now.get(Calendar.YEAR)) }
    var month by remember { mutableStateOf(now.get(Calendar.MONTH) + 1) }
    val todaySolar = now.get(Calendar.DAY_OF_MONTH)
    val grid = remember(year, month) { LunarCalendar.monthGrid(year, month) }
    val todayLunar = remember { LunarCalendar.today() }

    // (year, month, day) của ngày được chọn; mặc định là hôm nay
    var selected by remember { mutableStateOf(Triple(
        now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1, todaySolar,
    )) }
    val (selY, selM, selD) = selected

    var stats by remember { mutableStateOf<DayStats?>(null) }
    LaunchedEffect(selY, selM, selD) {
        stats = withContext(Dispatchers.IO) {
            try {
                val c = Calendar.getInstance()
                c.clear()
                c.set(selY, selM - 1, selD, 0, 0, 0)
                c.set(Calendar.MILLISECOND, 0)
                val from = c.timeInMillis
                val to = from + 24L * 3600 * 1000 - 1
                val v = AppContainer.vehicleRepository.getActive()
                if (v == null) DayStats(0, 0.0, 0L, 0.0)
                else {
                    val trips = AppContainer.tripRepository.getBetween(v.id, from, to)
                    DayStats(
                        tripCount = trips.size,
                        distanceKm = trips.sumOf { it.distanceKm },
                        durationSeconds = trips.sumOf { it.durationSeconds },
                        maxSpeedKmh = trips.mapNotNull { it.maxSpeedKmh }.maxOrNull() ?: 0.0,
                    )
                }
            } catch (e: Exception) {
                DayStats(0, 0.0, 0L, 0.0)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) { Text("✕", color = colors.textPrimary, fontSize = 20.sp) }
            Spacer(modifier = Modifier.weight(1f))
            TextButton(onClick = {
                month -= 1
                if (month == 0) { month = 12; year -= 1 }
                selected = Triple(year, month, 1)
            }) { Text("◀", color = colors.cyan, fontSize = 18.sp) }
            Text("HÔM NAY", color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = {
                month += 1
                if (month == 13) { month = 1; year += 1 }
                selected = Triple(year, month, 1)
            }) { Text("▶", color = colors.cyan, fontSize = 18.sp) }
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = {
                year = now.get(Calendar.YEAR)
                month = now.get(Calendar.MONTH) + 1
                selected = Triple(year, month, todaySolar)
            }) { Text("↻", color = colors.cyan, fontSize = 18.sp) }
        }

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

        // Weekday header
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

        val leadingEmpty = firstDow(year, month)

        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            userScrollEnabled = false,
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(leadingEmpty) { _ ->
                LunarCell(
                    solarDay = null, lunar = null, isToday = false, isSelected = false,
                    onClick = null, colors = colors,
                )
            }
            items(grid.size) { idx ->
                val solar = idx + 1
                val lunar = grid[solar]
                val isToday = solar == todaySolar && year == now.get(Calendar.YEAR) && month == now.get(Calendar.MONTH) + 1
                LunarCell(
                    solarDay = solar,
                    lunar = lunar,
                    isToday = isToday,
                    isSelected = solar == selD && month == selM && year == selY,
                    onClick = {
                        selected = Triple(year, month, solar)
                    },
                    colors = colors,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        DayDetailCard(selY, selM, selD, stats, colors)
    }
}

private data class DayStats(
    val tripCount: Int,
    val distanceKm: Double,
    val durationSeconds: Long,
    val maxSpeedKmh: Double,
)

@Composable
private fun LunarCell(
    solarDay: Int?,
    lunar: LunarCalendar.LunarDate?,
    isToday: Boolean,
    isSelected: Boolean,
    onClick: (() -> Unit)?,
    colors: FmmsColors,
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
        modifier = Modifier
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
private fun DayDetailCard(selY: Int, selM: Int, selD: Int, stats: DayStats?, colors: FmmsColors) {
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
                stats == null -> Text("Đang tải...", color = colors.textSecondary, fontSize = 12.sp)
                stats.tripCount == 0 -> Text(
                    "Không có hành trình trong ngày này.",
                    color = colors.textSecondary,
                    fontSize = 12.sp,
                )
                else -> Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround,
                ) {
                    DayCell("CHUYẾN", "${stats.tripCount}", colors.textPrimary)
                    DayCell("QUÃNG ĐƯỜNG", String.format(Locale.US, "%.1f km", stats.distanceKm), colors.cyan)
                    DayCell("THỜI GIAN", dayDuration(stats.durationSeconds), colors.textPrimary)
                    DayCell("TỐC ĐỘ MAX", if (stats.maxSpeedKmh > 0) "${stats.maxSpeedKmh.toInt()} km/h" else "—", colors.amber)
                }
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