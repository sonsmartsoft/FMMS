package com.fmms.carlogger.ui.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    Canvas(modifier = modifier.fillMaxWidth().height(180.dp)) {
        val maxCost = data.maxOfOrNull { it.fuelCostVnd }?.takeIf { it > 0 } ?: 1.0
        val maxKm = data.maxOfOrNull { it.distanceKm }?.takeIf { it > 0 } ?: 1.0
        val barW = size.width / data.size.coerceAtLeast(1)
        val chartTop = 8.dp.toPx()
        val chartBottom = size.height - 2.dp.toPx()
        val chartHeight = chartBottom - chartTop

        // Lưới ngang phụ (đường): 4 mốc
        for (i in 0..4) {
            val y = chartTop + chartHeight * i / 4f
            drawLine(
                color = gridColor,
                start = Offset(0f, y),
                end = Offset(size.width, y),
                strokeWidth = 1f,
            )
        }

        // Cột chi phí (₫) — trục trái
        data.forEachIndexed { i, stat ->
            val h = (stat.fuelCostVnd / maxCost).toFloat() * chartHeight
            val left = i * barW + barW * 0.2f
            val w = barW * 0.6f
            if (h > 0f) {
                drawRoundRect(
                    color = costColor,
                    topLeft = Offset(left, chartBottom - h),
                    size = Size(w, h),
                    cornerRadius = CornerRadius(6f, 6f),
                )
            }
        }

        // Đường quãng đường (km) — trục phải
        val stepX = size.width / (data.size - 1).coerceAtLeast(1)
        val pts = data.mapIndexed { i, stat ->
            Offset(
                i * stepX + barW / 2f,
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

        // Nhãn trục phải (km) top/bottom
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
