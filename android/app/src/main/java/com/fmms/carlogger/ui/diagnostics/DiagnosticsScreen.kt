package com.fmms.carlogger.ui.diagnostics

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fmms.carlogger.core.database.entity.DtcLogEntity
import com.fmms.carlogger.ui.common.FmmsAllGoodCard
import com.fmms.carlogger.ui.common.FmmsGradientButton
import com.fmms.carlogger.ui.common.FmmsStatusBadge
import com.fmms.carlogger.ui.i18n.LocalStrings
import com.fmms.carlogger.ui.theme.LocalFmmsColors

@Composable
fun DiagnosticsScreen(onBack: (() -> Unit)? = null, vm: DiagnosticsViewModel = androidx.lifecycle.viewmodel.compose.viewModel()) {
    val colors = LocalFmmsColors.current
    val strings = LocalStrings.current
    val state by vm.uiState.collectAsStateWithLifecycle()
    if (onBack != null) {
        androidx.activity.compose.BackHandler(enabled = true) { onBack() }
    }

    val hasFaults = state.logs.isNotEmpty()
    val accent = if (hasFaults) colors.red else colors.emerald

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (onBack != null) {
                TextButton(onClick = { onBack() }) { Text(strings.backChip, color = colors.cyan) }
                Spacer(Modifier.width(8.dp))
            }
            Text("Chẩn đoán mã lỗi (DTC)", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
        }
        Spacer(Modifier.height(8.dp))

        // Status header — no fault → All-Good card; has faults → accent warning card
        if (!hasFaults) {
            FmmsAllGoodCard(
                title = "Tất cả hệ thống hoạt động tốt",
                subtitle = "0 mã lỗi động cơ (DTC) • Động cơ & Cảm biến chuẩn chỉ số",
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Surface(
                color = accent.copy(alpha = 0.12f),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        FmmsStatusBadge(
                            text = "${state.logs.size} mã lỗi",
                            statusColor = accent,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "⚠ Mã lỗi đang hoạt động",
                            color = accent,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    if (state.summary != null) {
                        Spacer(Modifier.height(6.dp))
                        Text(state.summary.orEmpty(), color = colors.textSecondary, fontSize = 12.sp)
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        FmmsGradientButton(
            text = if (state.scanning) "Đang quét…" else "QUÉT CHẨN ĐOÁN",
            icon = if (state.scanning) null else Icons.Rounded.Search,
            gradient = if (hasFaults) listOf(Color(0xFFEF4444), Color(0xFFDC2626)) else listOf(Color(0xFF06B6D4), Color(0xFF0EA5E9)),
            onClick = { vm.scanNow() },
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))

        if (state.logs.isEmpty()) {
            Text(
                "Chưa ghi nhận mã lỗi nào. Bấm quét chẩn đoán hoặc chờ quét tự động khi có lỗi.",
                color = colors.textSecondary,
                fontSize = 13.sp,
            )
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.logs, key = { it.id }) { log ->
                    DtcCard(log)
                }
            }
        }
    }
}

@Composable
private fun DtcCard(log: DtcLogEntity) {
    val colors = LocalFmmsColors.current
    Surface(
        color = colors.surface,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.red.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(log.dtcCode, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = colors.red)
                Spacer(modifier = Modifier.weight(1f))
                val statusColor = when (log.status) {
                    "PERMANENT" -> colors.red
                    "CONFIRMED" -> colors.amber
                    else -> colors.cyan
                }
                FmmsStatusBadge(text = log.status, statusColor = statusColor)
            }
            if (!log.descriptionVi.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(log.descriptionVi.orEmpty(), fontSize = 13.sp, color = colors.textSecondary)
            }
            if (!log.freezeFrame.isNullOrBlank() && log.freezeFrame != "{}") {
                Spacer(Modifier.height(4.dp))
                Text("Freeze frame: ${log.freezeFrame}", fontSize = 10.sp, color = colors.textSecondary)
            }
        }
    }
}
