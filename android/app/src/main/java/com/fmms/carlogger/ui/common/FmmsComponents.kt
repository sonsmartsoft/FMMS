package com.fmms.carlogger.ui.common

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fmms.carlogger.ui.theme.LocalFmmsColors
import com.fmms.carlogger.ui.theme.LocalDarkTheme

private val Emerald = Color(0xFF10B981)
private val EmeraldDeep = Color(0xFF059669)
private val EmeraldBright = Color(0xFF34D399)
private val EmeraldMint = Color(0xFF6EE7B7)
private val Slate800 = Color(0xFF1E293B)

private fun emeraldGradient() = listOf(EmeraldBright, EmeraldDeep)

/**
 * KPI card (Glassmorphism) — gradient nhẹ + viền theo accent, tối ưu cho
 * màn hình Head-unit 9" và điện thoại (font co giãn, fillMaxWidth).
 */
@Composable
fun FmmsStatCard(
    title: String,
    value: String,
    subValue: String,
    icon: ImageVector,
    accentColor: Color,
    gradientColors: List<Color>,
    modifier: Modifier = Modifier,
) {
    val colors = LocalFmmsColors.current
    val isDark = LocalDarkTheme.current
    val surface = if (isDark) Slate800 else Color.White
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = surface),
        border = BorderStroke(1.dp, accentColor.copy(alpha = if (isDark) 0.25f else 0.40f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(accentColor.copy(alpha = if (isDark) 0.08f else 0.06f), Color.Transparent)
                    )
                )
                .padding(16.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title.uppercase(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = colors.textSecondary,
                            fontSize = 10.sp,
                            letterSpacing = 0.8.sp,
                        ),
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = value,
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.textPrimary,
                        ),
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subValue,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = accentColor,
                            fontWeight = FontWeight.SemiBold,
                        ),
                    )
                }

                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brush.linearGradient(gradientColors)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }
        }
    }
}

/**
 * Status badge chip — nền tint 15% + viền cùng màu 35% (Pill shape).
 * Không dùng màu nền gắt, tránh loá trên màn hình nhỏ.
 */
@Composable
fun FmmsStatusBadge(
    text: String,
    statusColor: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = statusColor.copy(alpha = 0.15f),
        border = BorderStroke(1.dp, statusColor.copy(alpha = 0.35f)),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                color = statusColor,
            ),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

/**
 * Action button gradient — bo 14.dp + đổ bóng theo màu đầu gradient.
 * `height` có thể chỉnh nhỏ hơn cho nút phụ (mặc định 48.dp vừa chạm ngón trên Head-unit).
 */
@Composable
fun FmmsGradientButton(
    text: String,
    icon: ImageVector? = null,
    gradient: List<Color> = emeraldGradient(),
    height: Dp = 48.dp,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .height(height)
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(14.dp), spotColor = gradient.first()),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
        contentPadding = PaddingValues(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.linearGradient(gradient))
                .padding(horizontal = 18.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                if (icon != null) {
                    Icon(imageVector = icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text,
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    ),
                )
            }
        }
    }
}

/**
 * Dấu tích xanh dạng huy hiệu tròn phát sáng (Verified / OK badge).
 */
@Composable
fun FmmsVerifiedBadgeIcon(
    size: Dp = 24.dp,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(size)
            .shadow(
                elevation = 6.dp,
                shape = CircleShape,
                spotColor = Emerald,
                ambientColor = Emerald,
            )
            .clip(CircleShape)
            .background(Brush.linearGradient(emeraldGradient()))
            .border(1.5.dp, EmeraldMint.copy(alpha = 0.6f), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Rounded.Check,
            contentDescription = "Verified / OK",
            tint = Color.White,
            modifier = Modifier.size(size * 0.65f),
        )
    }
}

/**
 * Pill trạng thái có dấu tích xanh — "Hệ thống bình thường" / "0 Lỗi" / "Đã đồng bộ".
 */
@Composable
fun FmmsSuccessVerifiedChip(
    text: String = "Hệ thống bình thường",
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = Emerald.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, Emerald.copy(alpha = 0.35f)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            FmmsVerifiedBadgeIcon(size = 16.dp)
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = if (LocalDarkTheme.current) EmeraldBright else EmeraldDeep,
                ),
            )
        }
    }
}

/**
 * Thẻ "Tất cả hoạt động tốt" — nền xanh rêu sẫm + dấu tích xanh lớn.
 * Dùng cho trạng thái không có lỗi DTC / tiết kiệm nhiên liệu / an toàn.
 */
@Composable
fun FmmsAllGoodCard(
    title: String = "Tất cả hệ thống hoạt động tốt",
    subtitle: String = "0 mã lỗi động cơ (DTC) • Động cơ & Cảm biến chuẩn chỉ số",
    modifier: Modifier = Modifier,
) {
    val isDark = LocalDarkTheme.current
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isDark) Color(0xFF064E3B).copy(alpha = 0.30f) else Emerald.copy(alpha = 0.10f)
        ),
        border = BorderStroke(1.dp, Emerald.copy(alpha = 0.35f)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            FmmsVerifiedBadgeIcon(size = 40.dp)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = LocalFmmsColors.current.textPrimary,
                    ),
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = if (isDark) EmeraldMint else EmeraldDeep,
                    ),
                )
            }
        }
    }
}
