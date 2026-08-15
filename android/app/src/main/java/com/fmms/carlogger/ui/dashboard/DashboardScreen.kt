package com.fmms.carlogger.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ZestechDashboardScreen() {
    val darkBackground = Color(0xFF0B0F19)
    val cardBackground = Color(0xFF111827)
    val cyanAccent = Color(0xFF06B6D4)
    val amberAccent = Color(0xFFF59E0B)
    val emeraldAccent = Color(0xFF10B981)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(darkBackground)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Header Status Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "MAZDA 2 BASE 2026",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "30A-888.88 • OBD-II KONNWEI KW906",
                    color = Color.Gray,
                    fontSize = 12.sp
                )
            }

            Surface(
                color = emeraldAccent.copy(alpha = 0.2f),
                shape = RoundedCornerShape(20.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(emeraldAccent, shape = RoundedCornerShape(50))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "OBD CONNECTED",
                        color = emeraldAccent,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Center Hero Range & Fuel Display
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = cardBackground)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("ESTIMATED RANGE", color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text("365 km", color = cyanAccent, fontSize = 36.sp, fontWeight = FontWeight.Black)
                }

                Divider(
                    modifier = Modifier
                        .height(50.dp)
                        .width(1.dp),
                    color = Color.DarkGray
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("FUEL LEVEL", color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text("54% (23.7L)", color = amberAccent, fontSize = 36.sp, fontWeight = FontWeight.Black)
                }

                Divider(
                    modifier = Modifier
                        .height(50.dp)
                        .width(1.dp),
                    color = Color.DarkGray
                )

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("AVG CONSUMPTION", color = Color.Gray, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text("6.9 L/100km", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
                }
            }
        }

        // Bottom Telemetry Gauges Grid (Speed, RPM, Coolant, Voltage)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            GaugeCard(title = "SPEED", value = "62", unit = "km/h", color = cyanAccent, modifier = Modifier.weight(1f))
            GaugeCard(title = "RPM", value = "2,150", unit = "rpm", color = Color(0xFFA855F7), modifier = Modifier.weight(1f))
            GaugeCard(title = "COOLANT", value = "91", unit = "°C", color = emeraldAccent, modifier = Modifier.weight(1f))
            GaugeCard(title = "VOLTAGE", value = "14.1", unit = "V", color = amberAccent, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun GaugeCard(title: String, value: String, unit: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(title, color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(2.dp))
                Text(unit, color = Color.Gray, fontSize = 10.sp)
            }
        }
    }
}
