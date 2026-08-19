package com.fmms.carlogger.ui.lunar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
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
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import com.fmms.carlogger.util.LunarCalendar
import java.util.Calendar
import java.util.Locale

/** Âm lịch — lưới tháng dương lịch với ngày âm lồng dưới mỗi ô. */
@Composable
fun LunarCalendarScreen(onBack: () -> Unit) {
    val colors = LocalFmmsColors.current
    val now = Calendar.getInstance()
    var year by remember { mutableStateOf(now.get(Calendar.YEAR)) }
    var month by remember { mutableStateOf(now.get(Calendar.MONTH) + 1) }
    val todaySolar = now.get(Calendar.DAY_OF_MONTH)
    val grid = remember(year, month) { LunarCalendar.monthGrid(year, month) }
    val todayLunar = remember { LunarCalendar.today() }

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
            }) { Text("◀", color = colors.cyan, fontSize = 18.sp) }
            Text(
                if (isSameMonthYear(year, month)) "HÔM NAY" else "HÔM NAY",
                color = colors.textPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
            )
            TextButton(onClick = {
                month += 1
                if (month == 13) { month = 1; year += 1 }
            }) { Text("▶", color = colors.cyan, fontSize = 18.sp) }
            Spacer(modifier = Modifier.weight(1f))
            IconButton(onClick = {
                year = now.get(Calendar.YEAR)
                month = now.get(Calendar.MONTH) + 1
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
            text = "Âm lịch: ${lunarName(todayLunar)}",
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

        val firstDayOfWeek = firstDow(year, month) // 0=T2 ... 6=CN
        val leadingEmpty = firstDayOfWeek

        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            userScrollEnabled = false,
            modifier = Modifier.fillMaxWidth(),
        ) {
            items(leadingEmpty) { _ -> LunarCell(solarDay = null, lunar = null, isToday = false, colors = colors) }
            items(grid.size) { idx ->
                val solar = idx + 1
                val lunar = grid[solar]
                LunarCell(
                    solarDay = solar,
                    lunar = lunar,
                    isToday = (solar == todaySolar && isSameMonthYear(year, month)),
                    colors = colors,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surface),
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                Text("Hôm nay", color = colors.textSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                val t = LunarCalendar.today()
                Text(
                    "Dương: ${todaySolar}/${month}/${year}",
                    color = colors.textPrimary,
                    fontSize = 14.sp,
                )
                Text(
                    "Âm: ${lunarName(t)}",
                    color = colors.cyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun LunarCell(
    solarDay: Int?,
    lunar: LunarCalendar.LunarDate?,
    isToday: Boolean,
    colors: com.fmms.carlogger.ui.theme.FmmsColors,
) {
    Box(
        modifier = Modifier
            .aspectRatio(1f)
            .padding(2.dp)
            .clip(RoundedCornerShape(10.dp))
            .then(
                if (isToday) Modifier.border(2.dp, colors.cyan, RoundedCornerShape(10.dp))
                else Modifier
            )
            .background(if (isToday) colors.cyan.copy(alpha = 0.12f) else Color.Transparent),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (solarDay == null) return@Column
            val lunarDay = lunar?.day
            val hl = lunarDay != null && LunarCalendar.isHighlightLunarDay(lunarDay)
            Text(
                solarDay.toString(),
                color = colors.textPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
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

private fun lunarName(l: LunarCalendar.LunarDate): String {
    val months = arrayOf("", "Giêng", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Một", "Chạp")
    return (if (l.isLeapMonth) "tháng nhuận " else "tháng ") + months[l.month] +
        " năm ${l.year} (mồng ${l.day})"
}

private fun isSameMonthYear(year: Int, month: Int): Boolean {
    val c = Calendar.getInstance()
    return c.get(Calendar.YEAR) == year && c.get(Calendar.MONTH) + 1 == month
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