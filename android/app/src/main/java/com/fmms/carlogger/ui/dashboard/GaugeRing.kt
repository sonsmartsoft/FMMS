package com.fmms.carlogger.ui.dashboard

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fmms.carlogger.ui.theme.LocalFmmsColors

/**
 * Modern circular gauge (ring + tick value) like modern car dashboards — §Dashboard.
 * sweep from -135° (bottom-left) to +135° (bottom-right), i.e. 270° arc.
 */
@Composable
fun GaugeCard(
    title: String,
    value: String,
    unit: String,
    color: Color,
    modifier: Modifier = Modifier,
    maxValue: Float = 1f,
    currentValue: Float = 0f,
    /** Nhãn phụ góc trên phải (vd số máy "P"/"D3"). */
    badge: String? = null,
) {
    val colors = LocalFmmsColors.current
    val raw = if (maxValue > 0f) currentValue / maxValue else 0f
    val fraction = if (raw.isFinite()) raw.coerceIn(0f, 1f) else 0f
    val animated by animateFloatAsState(
        targetValue = fraction,
        animationSpec = tween(durationMillis = 600),
        label = "gauge",
    )

    Card(
        modifier = modifier,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(contentAlignment = Alignment.Center) {
                if (!badge.isNullOrBlank()) {
                    Text(
                        text = badge,
                        color = color,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .background(color.copy(alpha = 0.15f), androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                Canvas(modifier = Modifier.size(96.dp)) {
                    val stroke = 10.dp.toPx()
                    val inset = stroke / 2
                    val arcSize = androidx.compose.ui.geometry.Size(
                        size.width - stroke,
                        size.height - stroke,
                    )
                    val topLeft = Offset(stroke / 2, stroke / 2)
                    // Track
                    drawArc(
                        color = colors.surfaceVariant,
                        startAngle = 135f,
                        sweepAngle = 270f,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = stroke, cap = StrokeCap.Round),
                    )
                    // Value arc
                    drawArc(
                        color = color,
                        startAngle = 135f,
                        sweepAngle = 270f * animated,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = stroke, cap = StrokeCap.Round),
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.Black)
                    if (unit.isNotBlank()) {
                        Text(unit, color = colors.textSecondary, fontSize = 10.sp)
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(title, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
}