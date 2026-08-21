package com.fmms.carlogger.ui.weather

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.data.repository.WeatherData
import com.fmms.carlogger.data.repository.WeatherRepository
import com.fmms.carlogger.ui.DashboardViewModel
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Màn THỜI TIẾT — phong cách app Weather iOS: hiện tại + theo giờ + 7 ngày. */
@Composable
fun WeatherScreen(vm: DashboardViewModel) {
    val colors = LocalFmmsColors.current
    val state by vm.uiState.collectAsStateWithLifecycle()
    val lat = state.telemetry.latitude
    val lon = state.telemetry.longitude

    var data by remember { mutableStateOf(WeatherRepository.lastData) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var placeName by remember { mutableStateOf<String?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current

    // Địa danh ngược từ GPS: "Phường/Xã, Tỉnh/Thành" — không có thì fallback tọa độ
    LaunchedEffect(lat, lon) {
        if (lat == null || lon == null) return@LaunchedEffect
        val name = withContext(Dispatchers.IO) {
            runCatching {
                @Suppress("DEPRECATION")
                val list = android.location.Geocoder(context).getFromLocation(lat, lon, 1)
                list?.firstOrNull()?.let { a ->
                    listOfNotNull(a.subLocality, a.locality, a.subAdminArea, a.adminArea)
                        .distinct()
                        .take(2)
                        .joinToString(", ")
                        .ifBlank { null }
                }
            }.getOrNull()
        }
        placeName = name
    }

    LaunchedEffect(lat, lon) {
        if (lat != null && lon != null && (data == null ||
                System.currentTimeMillis() - data!!.fetchedAt > 15 * 60 * 1000L)
        ) {
            loading = true
            error = null
            val result = withContext(Dispatchers.IO) {
                com.fmms.carlogger.data.repository.WeatherRepository.fetchSync(lat, lon)
            }
            if (result != null) data = result
            else if (data == null) error = "Không tải được thời tiết (kiểm tra mạng / GPS)"
            loading = false
        }
    }

    // Nền mô phỏng theo trạng thái thời tiết thực (nắng/mây/mưa/dông/tuyết/đêm)
    val bgGradient = data?.let {
        weatherGradient(it.current.code, it.current.isDay)
    } ?: listOf(Color(0xFF1B3B6F), Color(0xFF0F2547))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(bgGradient))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Header — đóng bằng cách bấm icon trên thanh điều hướng
        Text(
            "THỜI TIẾT",
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )

        when {
            data == null && loading -> Text("Đang tải...", color = Color.White, fontSize = 14.sp)
            data == null && error != null -> Text(error!!, color = colors.amber, fontSize = 13.sp, textAlign = TextAlign.Center)
            data == null -> Text(
                "Đang chờ tín hiệu GPS để xác định vị trí...",
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
            )
            else -> WeatherBody(data!!, placeName)
        }
    }
}

@Composable
private fun WeatherBody(data: WeatherData, placeName: String?) {
    val colors = LocalFmmsColors.current
    val cur = data.current
    val wmo = wmoDesc(cur.code, cur.isDay)

    Spacer(modifier = Modifier.height(8.dp))
    // Tên vị trí (Geocoder) — fallback tọa độ
    Text(
        "📍 " + (placeName ?: "${String.format(Locale.US, "%.2f", data.latitude)}, ${String.format(Locale.US, "%.2f", data.longitude)}"),
        color = Color.White.copy(alpha = 0.85f),
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        textAlign = TextAlign.Center,
    )
    Spacer(modifier = Modifier.height(4.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(wmo.emoji, fontSize = 48.sp)
        Spacer(Modifier.width(10.dp))
        Text(
            "${cur.temperature.toInt()}°",
            color = Color.White,
            fontSize = 68.sp,
            fontWeight = FontWeight.Thin,
        )
    }
    Text(
        wmo.vi,
        color = Color.White,
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
    )
    Text("Cao ${data.daily.firstOrNull()?.max?.toInt() ?: "—"}° / Thấp ${data.daily.firstOrNull()?.min?.toInt() ?: "—"}°",
        color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp)
    Text(
        "Cảm giác như ${cur.apparentTemp.toInt()}° • Độ ẩm ${cur.humidity}% • Gió ${cur.windKmh.toInt()} km/h",
        color = Color.White.copy(alpha = 0.7f),
        fontSize = 12.sp,
    )

    Spacer(modifier = Modifier.height(16.dp))

    // Chi tiết: UV, mặt trời mọc/lặn, gió, độ ẩm, áp suất
    val today = data.daily.firstOrNull()
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.08f))) {
        Column(Modifier.padding(12.dp)) {
            Text("CHI TIẾT", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                DetailTile("☀️ UV", cur.uvIndex?.let { String.format(Locale.US, "%.1f", it) } ?: "—", Modifier.weight(1f))
                DetailTile("💨 GIÓ", "${cur.windKmh.toInt()} km/h", Modifier.weight(1f))
                DetailTile("💧 ĐỘ ẨM", "${cur.humidity}%", Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                DetailTile("🔽 ÁP SUẤT", cur.pressureHpa?.let { "${it.toInt()} hPa" } ?: "—", Modifier.weight(1f))
                DetailTile("🌅 MẶT TRỜI MỌC", today?.sunrise?.let { hhmm(it) } ?: "—", Modifier.weight(1f))
                DetailTile("🌇 MẶT TRỜI LẶN", today?.sunset?.let { hhmm(it) } ?: "—", Modifier.weight(1f))
            }
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Theo giờ — 24h tới
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.08f))) {
        Column(Modifier.padding(12.dp)) {
            Text("DỰ BÁO THEO GIỜ", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            val upcoming = upcomingHours(data)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                items(upcoming) { h ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(hourLabel(h.time), color = Color.White, fontSize = 11.sp)
                        Spacer(Modifier.height(4.dp))
                        Text(wmoDesc(h.code, true).emoji, fontSize = 22.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("${h.temp.toInt()}°", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        if (h.precipProb > 20) {
                            Text("💧${h.precipProb}%", color = colors.cyan, fontSize = 9.sp)
                        } else {
                            Text(" ", fontSize = 9.sp)
                        }
                    }
                }
            }
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    // 7 ngày
    val gMin = data.daily.minOf { it.min }
    val gMax = data.daily.maxOf { it.max }
    val span = (gMax - gMin).takeIf { it > 0.5 } ?: 1.0
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.08f))) {
        Column(Modifier.padding(12.dp)) {
            Text("7 NGÀY TỚI", color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            data.daily.forEachIndexed { i, d ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        dayLabel(d.date, i),
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1.4f),
                    )
                    Text(wmoDesc(d.code, true).emoji, fontSize = 20.sp, modifier = Modifier.weight(0.8f), textAlign = TextAlign.Center)
                    if (d.precipProb > 20) {
                        Text("💧${d.precipProb}%", color = colors.cyan, fontSize = 10.sp, modifier = Modifier.weight(1f))
                    } else {
                        Spacer(Modifier.weight(1f))
                    }
                    Text(
                        "${d.min.toInt()}°",
                        color = tempColor(d.min),
                        fontSize = 14.sp,
                        textAlign = TextAlign.Right,
                        modifier = Modifier.weight(0.7f),
                    )
                    // Dải nhiệt độ gradient: vị trí + độ rộng theo min/max tuần, màu theo thang nhiệt độ
                    Box(Modifier.weight(1.6f).height(5.dp).padding(horizontal = 3.dp)) {
                        BoxWithConstraints(Modifier.fillMaxSize()) {
                            val w = maxWidth
                            Box(
                                Modifier
                                    .fillMaxSize()
                                    .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(2.dp))
                            )
                            val startFrac = (((d.min - gMin) / span).coerceIn(0.0, 1.0)).toFloat()
                            val widthFrac = (((d.max - d.min) / span).coerceIn(0.06, 1.0)).toFloat()
                            Box(
                                Modifier
                                    .offset(x = w * startFrac)
                                    .width(w * widthFrac)
                                    .fillMaxHeight()
                                    .background(
                                        Brush.horizontalGradient(listOf(tempColor(d.min), tempColor(d.max))),
                                        RoundedCornerShape(2.dp),
                                    ),
                            )
                        }
                    }
                    Text("${d.max.toInt()}°", color = tempColor(d.max), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                if (i < data.daily.lastIndex) HorizontalDivider(color = Color.White.copy(alpha = 0.12f))
            }
        }
    }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

@Composable
private fun DetailTile(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = Color.White.copy(alpha = 0.65f), fontSize = 9.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(3.dp))
        Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
    }
}

/** "2026-08-21T05:38" -> "05:38" */
private fun hhmm(iso: String): String = iso.substringAfter('T', "").ifEmpty { iso }

/** Nền mô phỏng trạng thái thời tiết: nắng sáng, mây, mưa, dông, tuyết, đêm. */
private fun weatherGradient(code: Int, isDay: Boolean): List<Color> = when {
    code == 0 || code == 1 ->
        if (isDay) listOf(Color(0xFF2E7BC4), Color(0xFF8EC9F0))   // nắng: xanh trời
        else listOf(Color(0xFF0D1B2A), Color(0xFF1B2A44))          // đêm quang
    code == 2 || code == 3 ->
        if (isDay) listOf(Color(0xFF54718A), Color(0xFF93A9BC))   // mây
        else listOf(Color(0xFF10192B), Color(0xFF22304A))
    code == 45 || code == 48 ->
        listOf(Color(0xFF607D8B), Color(0xFF90A4AE))               // sương mù
    code in 51..67 ->
        listOf(Color(0xFF2C3A52), Color(0xFF50698A))               // mưa / mưa phùn
    code in 71..77 || code == 85 || code == 86 ->
        listOf(Color(0xFF546E7A), Color(0xFFB0BEC5))               // tuyết
    code in 80..82 ->
        listOf(Color(0xFF27364B), Color(0xFF48607F))               // mưa rào
    code >= 95 ->
        listOf(Color(0xFF171E2E), Color(0xFF33415C))               // dông: tối nặng
    else ->
        if (isDay) listOf(Color(0xFF1B3B6F), Color(0xFF4A6FA5))
        else listOf(Color(0xFF0D1B2A), Color(0xFF1B2A44))
}

/** Màu theo thang nhiệt độ (kiểu iOS): xanh dương lạnh -> vàng -> cam -> đỏ nóng. */
private fun tempColor(temp: Double): Color {
    val stops = listOf(
        0f to Color(0xFF5B9BE8),
        10f to Color(0xFF5AC8FA),
        18f to Color(0xFF63D6A5),
        24f to Color(0xFFFFD60A),
        30f to Color(0xFFFF9F0A),
        38f to Color(0xFFFF375F),
        45f to Color(0xFFFF2D55),
    )
    val t = temp.toFloat().coerceIn(0f, 45f)
    for (i in 0 until stops.lastIndex) {
        val (t1, c1) = stops[i]
        val (t2, c2) = stops[i + 1]
        if (t <= t2) {
            val f = (t - t1) / (t2 - t1)
            return androidx.compose.ui.graphics.lerp(c1, c2, f)
        }
    }
    return stops.last().second
}

private fun upcomingHours(data: WeatherData): List<com.fmms.carlogger.data.repository.WeatherHour> {
    val now = SimpleDateFormat("yyyy-MM-dd'T'HH", Locale.US).format(Date())
    val idx = data.hourly.indexOfFirst { it.time.startsWith(now) }.takeIf { it >= 0 } ?: 0
    return data.hourly.drop(idx).take(24)
}

private fun hourLabel(iso: String): String {
    val h = iso.substringAfter('T').substringBefore(':').toIntOrNull() ?: return iso
    return if (h == 0) "00h" else "${h}h"
}

private fun dayLabel(date: String, index: Int): String {
    if (index == 0) return "Hôm nay"
    return try {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val d = fmt.parse(date)!!
        val cal = Calendar.getInstance().apply { time = d }
        val dow = when (cal.get(Calendar.DAY_OF_WEEK)) {
            Calendar.MONDAY -> "Thứ 2"
            Calendar.TUESDAY -> "Thứ 3"
            Calendar.WEDNESDAY -> "Thứ 4"
            Calendar.THURSDAY -> "Thứ 5"
            Calendar.FRIDAY -> "Thứ 6"
            Calendar.SATURDAY -> "Thứ 7"
            else -> "CN"
        }
        dow
    } catch (e: Exception) {
        date
    }
}

private data class Wmo(val emoji: String, val vi: String)

private fun wmoDesc(code: Int, isDay: Boolean): Wmo = when (code) {
    0 -> Wmo(if (isDay) "☀️" else "🌙", if (isDay) "Đang nắng" else "Trời quang")
    1 -> Wmo(if (isDay) "🌤️" else "🌙", "Ít mây")
    2 -> Wmo("⛅", "Có mây")
    3 -> Wmo("☁️", "Nhiều mây")
    45, 48 -> Wmo("🌫️", "Sương mù")
    in 51..57 -> Wmo("🌦️", "Đang mưa phùn")
    in 61..67 -> Wmo("🌧️", "Đang mưa")
    in 71..77 -> Wmo("🌨️", "Có tuyết rơi")
    in 80..82 -> Wmo("🌧️", "Mưa rào")
    85, 86 -> Wmo("🌨️", "Mưa tuyết")
    95 -> Wmo("⛈️", "Đang có dông")
    96, 99 -> Wmo("⛈️", "Dông kèm mưa đá")
    else -> Wmo("🌡️", "—")
}
