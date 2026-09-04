package com.fmms.carlogger.ui.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import android.graphics.Paint
import java.util.Locale

/**
 * Biểu đồ cột + đường kép 2 trục: cột = chi phí (₫, trục trái), đường = quãng đường (km, trục phải).
 * Tái tạo giao diện ComposedChart (Recharts) bên Web với Dual Y-Axis.
 */
@Composable
fun DualAxisBarLineChart(
    data: List<PeriodStat>,
    costColor: Color,
    kmColor: Color,
    textColor: Color,
    gridColor: Color,
    modifier: Modifier = Modifier,
) {
    var selectedIndex by remember { mutableStateOf<Int?>(null) }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(180.dp)
            .pointerInput(data) {
                detectTapGestures { offset ->
                    if (data.isEmpty()) return@detectTapGestures
                    val bw = size.width / data.size
                    val idx = (offset.x / bw).toInt().coerceIn(0, data.size - 1)
                    selectedIndex = if (selectedIndex == idx) null else idx
                    android.util.Log.d("StatsCharts", "tap idx=$idx label=${data.getOrNull(idx)?.label} sel=$selectedIndex")
                }
            },
    ) {
        val maxCost = data.maxOfOrNull { it.fuelCostVnd }?.takeIf { it > 0 } ?: 1.0
        val maxKm = data.maxOfOrNull { it.distanceKm }?.takeIf { it > 0 } ?: 1.0
        val bw = size.width / data.size.coerceAtLeast(1)
        val chartTop = 20.dp.toPx()
        val chartBottom = size.height - 2.dp.toPx()
        val chartHeight = chartBottom - chartTop

        for (i in 0..4) {
            val y = chartTop + chartHeight * i / 4f
            drawLine(
                color = gridColor,
                start = Offset(0f, y),
                end = Offset(size.width, y),
                strokeWidth = 1f,
            )
        }

        val selected = data.getOrNull(selectedIndex ?: -1)
        val textPaint = Paint().apply {
            color = android.graphics.Color.WHITE
            textSize = 9.sp.toPx()
            isAntiAlias = true
        }

        data.forEachIndexed { i, stat ->
            val h = (stat.fuelCostVnd / maxCost).toFloat() * chartHeight
            val left = i * bw + bw * 0.2f
            val w = bw * 0.6f
            val isSel = selectedIndex == i
            if (h > 0f) {
                drawRoundRect(
                    color = if (isSel) costColor.copy(alpha = 0.35f) else costColor,
                    topLeft = Offset(left, chartBottom - h),
                    size = Size(w, h),
                    cornerRadius = CornerRadius(6f, 6f),
                )
            }
            if (isSel) {
                val labelCost = formatVnd(stat.fuelCostVnd)
                val labelKm = String.format(Locale.US, "%.0f km", stat.distanceKm)
                val label = if (stat.fuelCostVnd > 0 && stat.distanceKm > 0) {
                    "$labelCost · $labelKm"
                } else if (stat.fuelCostVnd > 0) labelCost
                else if (stat.distanceKm > 0) labelKm
                else "0"
                val cx = left + w / 2f
                val labelY = (chartBottom - h - 6.dp.toPx()).coerceAtLeast(12.dp.toPx())
                val pad = 4.dp.toPx()
                val textW = textPaint.measureText(label)
                drawRoundRect(
                    color = costColor,
                    topLeft = Offset(cx - textW / 2 - pad, labelY - textPaint.textSize - pad / 2),
                    size = Size(textW + pad * 2, textPaint.textSize + pad),
                    cornerRadius = CornerRadius(4f, 4f),
                )
                drawContext.canvas.nativeCanvas.drawText(
                    label,
                    cx - textW / 2,
                    labelY,
                    textPaint,
                )
            }
        }

        val stepX = size.width / (data.size - 1).coerceAtLeast(1)
        val pts = data.mapIndexed { i, stat ->
            Offset(
                i * stepX + bw / 2f,
                chartBottom - (stat.distanceKm / maxKm).toFloat() * chartHeight,
            )
        }
        if (pts.size > 1) {
            val path = Path().apply {
                moveTo(pts.first().x, chartBottom)
                pts.forEach { lineTo(it.x, it.y) }
                lineTo(pts.last().x, chartBottom)
                close()
            }
            drawPath(path, color = kmColor.copy(alpha = 0.16f))
            for (i in 0 until pts.size - 1) {
                drawLine(
                    color = kmColor,
                    start = pts[i],
                    end = pts[i + 1],
                    strokeWidth = 4.dp.toPx(),
                    cap = StrokeCap.Round,
                )
            }
            pts.forEach { p -> drawCircle(color = kmColor, radius = 3.5.dp.toPx(), center = p) }
        }
    }

    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        data.forEach { s ->
            Text(s.label, color = textColor, fontSize = 9.sp, maxLines = 1)
        }
    }
}

/** Biểu đồ cột đơn giản cho quãng đường theo ngày. */
@Composable
fun KmBarChart(
    data: List<Double>,
    labels: List<String>,
    color: Color,
    textColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.fillMaxWidth().height(150.dp)) {
        val max = data.maxOrNull()?.takeIf { it > 0 } ?: 1.0
        val barW = size.width / data.size.coerceAtLeast(1)
        val chartBottom = size.height - 2.dp.toPx()
        data.forEachIndexed { i, v ->
            val h = (v / max).toFloat() * (chartBottom - 6.dp.toPx())
            val left = i * barW + barW * 0.18f
            val w = barW * 0.64f
            if (h > 0f) {
                drawRoundRect(
                    color = if (v > 0) color else color.copy(alpha = 0.12f),
                    topLeft = Offset(left, chartBottom - h),
                    size = Size(w, h),
                    cornerRadius = CornerRadius(6f, 6f),
                )
            }
        }
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        labels.forEach { Text(it, color = textColor, fontSize = 9.sp, maxLines = 1) }
    }
}

/** Chú giải (legend) màu cho biểu đồ. */
@Composable
fun ChartLegend(
    color: Color,
    label: String,
    textColor: Color,
) {
    Row(
        modifier = Modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Canvas(modifier = Modifier.height(10.dp).padding(vertical = 2.dp).fillMaxWidth(0.02f)) {
            drawLine(
                color = color,
                start = Offset(0f, size.height / 2),
                end = Offset(size.width, size.height / 2),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round,
            )
        }
        Text(label, color = textColor, fontSize = 10.sp, fontWeight = FontWeight.Medium)
    }
}

/** Định dạng tiền VND ngắn gọn: 1.23tr / 820k. */
fun formatVnd(value: Double): String = when {
    value >= 1_000_000 -> String.format(Locale.US, "%.1f tr", value / 1_000_000)
    value >= 1_000 -> String.format(Locale.US, "%.0fk", value / 1_000)
    else -> String.format(Locale.US, "%.0f ₫", value)
}

/** Định dạng tiền VND đầy đủ có dấu chấm phân cách. */
fun formatVndFull(value: Double): String {
    val rounded = value.toLong()
    val s = rounded.toString()
    val sb = StringBuilder()
    s.reversed().forEachIndexed { i, ch ->
        if (i > 0 && i % 3 == 0) sb.append('.')
        sb.append(ch)
    }
    return sb.reverse().toString() + "₫"
}

/** Bảng màu cho donut chi phí (tương đồng CHART_COLORS bên Web). */
val DONUT_COLORS = listOf(
    Color(0xFF38BDF8), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF8B5CF6),
    Color(0xFFEC4899), Color(0xFFF87171), Color(0xFFFBBF24), Color(0xFF06B6D4),
    Color(0xFF64748B), Color(0xFF34D399), Color(0xFFA78BFA), Color(0xFFFB923C),
)

/** Biểu đồ tròn (donut) phân bố chi phí theo danh mục. */
@Composable
fun DonutChart(
    data: List<ExpenseSlice>,
    centerLabel: String,
    centerValue: String,
    modifier: Modifier = Modifier.fillMaxWidth().height(180.dp),
) {
    val colors = LocalFmmsColors.current
    val total = data.sumOf { it.amount }
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            if (total <= 0) return@Canvas
            val strokeWidth = 26.dp.toPx()
            val radius = (minOf(size.width, size.height) - strokeWidth) / 2f
            val center = Offset(size.width / 2f, size.height / 2f)
            val topLeft = Offset(center.x - radius, center.y - radius)
            val arcSize = Size(radius * 2, radius * 2)
            val pad = 3f
            var start = -90f
            data.forEachIndexed { i, slice ->
                val sweep = (slice.amount / total).toFloat() * 360f
                drawArc(
                    color = DONUT_COLORS[i % DONUT_COLORS.size],
                    startAngle = start + pad / 2,
                    sweepAngle = (sweep - pad).coerceAtLeast(0.5f),
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Butt),
                )
                start += sweep
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(centerLabel, color = colors.textSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(centerValue, color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.Black, maxLines = 1)
        }
    }
}
