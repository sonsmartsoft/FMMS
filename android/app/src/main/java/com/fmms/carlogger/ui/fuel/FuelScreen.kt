package com.fmms.carlogger.ui.fuel

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Save
import androidx.compose.material3.*
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fmms.carlogger.AppContainer
import com.fmms.carlogger.core.database.entity.FuelLogEntity
import com.fmms.carlogger.domain.model.FuelEstimate
import com.fmms.carlogger.ui.common.FmmsGradientButton
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FuelViewModel : ViewModel() {
    private val c = AppContainer

    val estimate: StateFlow<FuelEstimate> = c.fuelEngine.estimate
    private val _logs = MutableStateFlow<List<FuelLogEntity>>(emptyList())
    val logs = _logs

    private val _saving = MutableStateFlow(false)
    val saving = _saving

    init {
        viewModelScope.launch {
            c.vehicleRepository.getActive()?.let { vehicle ->
                c.fuelLogRepository.observeByVehicle(vehicle.id).collect { rawList ->
                    // Auto-enrich historical logs with delta ODO & consumption so all existing logs display detailed badges
                    val sortedAsc = rawList.sortedBy { it.odometerKm ?: 0.0 }
                    val enriched = sortedAsc.mapIndexed { index, cur ->
                        if (index > 0) {
                            val prev = sortedAsc[index - 1]
                            val prevOdo = prev.odometerKm ?: 0.0
                            val curOdo = cur.odometerKm ?: 0.0
                            val delta = curOdo - prevOdo
                            val prevOdometer = cur.prevOdometerKm ?: if (prevOdo > 0 && delta > 0) prevOdo else null
                            val consumption = cur.calculatedConsumptionL100km ?: if (delta > 0 && cur.fuelLiters > 0) ((cur.fuelLiters / delta) * 100.0) else null
                            val fuelConsumed = cur.fuelConsumedLiters ?: if (consumption != null) cur.fuelLiters else null
                            cur.copy(
                                prevOdometerKm = prevOdometer,
                                calculatedConsumptionL100km = consumption,
                                fuelConsumedLiters = fuelConsumed
                            )
                        } else {
                            cur
                        }
                    }.sortedByDescending { it.timestamp }
                    _logs.value = enriched
                }
            }
        }
    }

    fun addRefuel(fuelLiters: Double, pricePerLiter: Double, tankFull: Boolean) {
        viewModelScope.launch {
            _saving.value = true
            val vehicle = c.vehicleRepository.getActive() ?: return@launch
            // ODO thật từ ECU (01A6) đã đồng bộ vào vehicle.odometerKm; chỉ dùng virtual khi chưa có số thật.
            val odo = vehicle.odometerKm.takeIf { it > 0 }
                ?: c.odometerEngine.state.value.virtualOdoKm
            val now = System.currentTimeMillis()

            // Dung tích bình (mặc định Mazda 2 là 44L nếu chưa khai báo)
            val tankCapacity = if (vehicle.tankCapacityLiters > 0) vehicle.tankCapacityLiters else 44.0

            // 1. Mức xăng trước khi đổ từ OBD PID 012F
            val currentEstimate = c.fuelEngine.estimate.value
            val fuelLevelBeforePct = currentEstimate.levelPercent
            val fuelLitersBefore = fuelLevelBeforePct?.let { (it * tankCapacity / 100.0) }
                ?: currentEstimate.estimatedLiters

            // 2. Mức xăng sau khi đổ
            val fuelLitersAfter = if (tankFull) {
                tankCapacity
            } else if (fuelLitersBefore != null) {
                (fuelLitersBefore + fuelLiters).coerceAtMost(tankCapacity)
            } else {
                null
            }
            val fuelLevelAfterPct = if (tankFull) {
                100.0
            } else if (fuelLitersAfter != null) {
                (fuelLitersAfter / tankCapacity * 100.0).coerceAtMost(100.0)
            } else {
                null
            }

            // 3. Tính toán chính xác lượng nhiên liệu tiêu thụ và mức L/100km từ lần đổ trước
            val prevLogs = c.fuelLogRepository.getByVehicle(vehicle.id)
            val prevLog = prevLogs.firstOrNull()

            var prevOdometerKm: Double? = null
            var fuelConsumedLiters: Double? = null
            var calculatedConsumptionL100km: Double? = null

            if (prevLog != null && prevLog.odometerKm != null && odo > prevLog.odometerKm) {
                prevOdometerKm = prevLog.odometerKm
                val deltaDistanceKm = odo - prevLog.odometerKm

                val prevLitersAfter = prevLog.fuelLitersAfter
                    ?: (if (prevLog.tankFull) tankCapacity else (prevLog.fuelLitersBefore?.plus(prevLog.fuelLiters))?.coerceAtMost(tankCapacity))

                if (prevLitersAfter != null && fuelLitersBefore != null) {
                    val consumed = prevLitersAfter - fuelLitersBefore
                    if (consumed > 0 && deltaDistanceKm > 0) {
                        fuelConsumedLiters = consumed
                        calculatedConsumptionL100km = (consumed / deltaDistanceKm) * 100.0
                    }
                }
            }

            val log = FuelLogEntity(
                id = java.util.UUID.randomUUID().toString(),
                vehicleId = vehicle.id,
                timestamp = now,
                odometerKm = odo,
                fuelLiters = fuelLiters,
                pricePerLiter = pricePerLiter,
                totalCost = fuelLiters * pricePerLiter,
                currency = "VND",
                station = null,
                tankFull = tankFull,
                notes = null,
                createdAt = now,
                updatedAt = now,
                fuelLevelBeforePct = fuelLevelBeforePct,
                fuelLitersBefore = fuelLitersBefore,
                fuelLevelAfterPct = fuelLevelAfterPct,
                fuelLitersAfter = fuelLitersAfter,
                calculatedConsumptionL100km = calculatedConsumptionL100km,
                prevOdometerKm = prevOdometerKm,
                fuelConsumedLiters = fuelConsumedLiters,
            )
            c.fuelLogRepository.upsert(log)
            _saving.value = false
        }
    }
}

@Composable
fun FuelScreen(vm: FuelViewModel = viewModel()) {
    val estimate by vm.estimate.collectAsStateWithLifecycle()
    val logs by vm.logs.collectAsStateWithLifecycle(emptyList())
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(strings.fuel, color = colors.textPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surface),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    FuelRing(
                        levelPercent = estimate.levelPercent,
                        liters = estimate.estimatedLiters,
                        modifier = Modifier.weight(0.9f),
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(
                        modifier = Modifier.weight(1.1f),
                        horizontalAlignment = Alignment.Start,
                    ) {
                        FuelStatRow(strings.range, estimate.rangeKm?.let { "${it.toInt()} km" } ?: strings.learning, colors.cyan)
                        Spacer(modifier = Modifier.height(8.dp))
                        FuelStatRow(strings.per100km, estimate.consumptionL100km?.let { String.format(Locale.US, "%.1f L/100km", it) } ?: strings.learning, colors.textPrimary)
                    }
                }
            }
        }

        item {
            AddRefuelBar(vm)
        }

        if (logs.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                    Text(strings.noRefuels, color = colors.textSecondary, fontSize = 14.sp)
                }
            }
        } else {
            items(logs) { log ->
                val fmt = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.US)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surface),
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(fmt.format(Date(log.timestamp)), color = colors.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${strings.odoLabel} ${log.odometerKm?.let { "${it.toInt()} km" } ?: "—"}${log.prevOdometerKm?.let { " (+${(log.odometerKm!! - it).toInt()} km)" } ?: ""} • ${if (log.tankFull) strings.fullTank else "Đổ lẻ"}",
                                    color = colors.textSecondary,
                                    fontSize = 12.sp,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(String.format(Locale.US, "+%.1f L", log.fuelLiters), color = colors.cyan, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                log.totalCost?.let {
                                    Text(String.format(Locale.US, "%,.0f ₫", it), color = colors.textSecondary, fontSize = 11.sp)
                                }
                            }
                        }

                        // OBD Level & Precision Consumption Breakdown
                        if (log.fuelLevelBeforePct != null || log.calculatedConsumptionL100km != null || (log.odometerKm ?: 0.0) <= 20.0) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Divider(color = colors.surfaceVariant, thickness = 0.5.dp)
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (log.fuelLevelBeforePct != null) {
                                    Text(
                                        "OBD: ${String.format(Locale.US, "%.0f%%", log.fuelLevelBeforePct)} (${String.format(Locale.US, "%.1fL", log.fuelLitersBefore ?: 0.0)}) ➔ ${String.format(Locale.US, "%.0f%%", log.fuelLevelAfterPct ?: 0.0)}",
                                        color = colors.textSecondary,
                                        fontSize = 11.sp,
                                    )
                                } else {
                                    Text(
                                        "Bơm: +${String.format(Locale.US, "%.1f", log.fuelLiters)}L",
                                        color = colors.textSecondary,
                                        fontSize = 11.sp,
                                    )
                                }

                                if (log.calculatedConsumptionL100km != null && log.fuelConsumedLiters != null) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = colors.cyan.copy(alpha = 0.15f),
                                    ) {
                                        Text(
                                            "Tiêu hao: ${String.format(Locale.US, "%.1f", log.calculatedConsumptionL100km)} L/100km (-${String.format(Locale.US, "%.1fL", log.fuelConsumedLiters)})",
                                            color = colors.cyan,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        )
                                    }
                                } else if ((log.odometerKm ?: 0.0) <= 20.0) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = colors.amber.copy(alpha = 0.15f),
                                    ) {
                                        Text(
                                            "🌱 Mốc nhận xe & Đầy bình",
                                            color = colors.amber,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FuelRing(levelPercent: Double?, liters: Double?, modifier: Modifier = Modifier) {
    val colors = LocalFmmsColors.current
    val pct = when {
        levelPercent != null -> levelPercent / 100.0
        liters != null -> (liters / CAPACITY_LITERS).coerceIn(0.0, 1.0)
        else -> 0.0
    }.coerceIn(0.0, 1.0)
    val animated by animateFloatAsState(
        targetValue = pct.toFloat(),
        animationSpec = tween(durationMillis = 800),
        label = "fuelLevel",
    )

    Box(contentAlignment = Alignment.Center, modifier = modifier) {
        Canvas(modifier = Modifier.size(130.dp)) {
            val stroke = 12.dp.toPx()
            val inset = stroke / 2
            val arcSize = androidx.compose.ui.geometry.Size(
                size.width - stroke,
                size.height - stroke,
            )
            val topLeft = Offset(stroke / 2, stroke / 2)
            drawArc(
                color = colors.surfaceVariant,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            drawArc(
                color = colors.amber,
                startAngle = 135f,
                sweepAngle = 270f * animated,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            // Tick marks at E / F
            drawCircle(color = colors.textSecondary, radius = 3.dp.toPx(), center = Offset(12.dp.toPx(), size.height / 2 + 58.dp.toPx()))
            drawCircle(color = colors.textSecondary, radius = 3.dp.toPx(), center = Offset(size.width - 12.dp.toPx(), size.height / 2 + 58.dp.toPx()))
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                String.format(Locale.US, "%.0f%%", animated * 100),
                color = colors.amber,
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
            )
            if (liters != null) {
                Text(
                    String.format(Locale.US, "%.1f L", liters),
                    color = colors.textSecondary,
                    fontSize = 12.sp,
                )
            }
        }
    }
}

private const val CAPACITY_LITERS = 44.0

@Composable
private fun FuelStatRow(label: String, value: String, color: Color) {
    val colors = LocalFmmsColors.current
    Column {
        Text(label, color = colors.textSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Text(value, color = color, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun AddRefuelBar(vm: FuelViewModel) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    val estimate by vm.estimate.collectAsStateWithLifecycle()
    var liters by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var full by remember { mutableStateOf(true) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surface),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Live OBD Indicator
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Ghi nhận đổ xăng", color = colors.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                if (estimate.levelPercent != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = colors.amber.copy(alpha = 0.15f),
                    ) {
                        Text(
                            "⛽ OBD: ${String.format(Locale.US, "%.1f%%", estimate.levelPercent)} (${String.format(Locale.US, "%.1fL", estimate.estimatedLiters ?: 0.0)})",
                            color = colors.amber,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = colors.cyan.copy(alpha = 0.12f),
                    ) {
                        Text(
                            "🔌 OBD: Tự động bắt khi nổ máy",
                            color = colors.cyan,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = liters,
                    onValueChange = { liters = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text(strings.litersLbl, color = colors.textSecondary) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text(strings.pricePerL, color = colors.textSecondary) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(strings.fullTank, color = colors.textSecondary, fontSize = 13.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(checked = full, onCheckedChange = { full = it })
                }
                FmmsGradientButton(
                    text = strings.save,
                    icon = Icons.Rounded.Save,
                    onClick = {
                        val l = liters.toDoubleOrNull()
                        val p = price.toDoubleOrNull()
                        if (l != null && p != null) {
                            vm.addRefuel(l, p, full)
                            liters = ""
                            price = ""
                        }
                    },
                    height = 40.dp,
                    modifier = Modifier.width(120.dp),
                )
            }
        }
    }
}