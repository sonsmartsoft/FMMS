# FMMS — UI/UX DESIGN SYSTEM & COMPONENT GUIDELINES
> **Phiên bản:** 2026.1  
> **Áp dụng cho:** Android App (Jetpack Compose / OpenCode) & Web Dashboard (Next.js / Tailwind CSS)  
> **Mục tiêu:** Đồng bộ trải nghiệm thị giác cao cấp (Dark Mode, Hi-Tech Glassmorphism, Gradient Accent, Dấu tích xanh Verified, Badge Trạng thái, Typography chuẩn quốc tế).

---

## 🎨 1. BẢNG MÀU CHỦ ĐẠO (FMMS COLOR TOKENS)

| Phân hệ / Ý nghĩa | Màu chính (Hex) | Gradient tuyến tính (Linear Gradient) | Jetpack Compose Token | CSS Variable (Web) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary / Emerald** | `#10B981` → `#059669` | `listOf(Color(0xFF10B981), Color(0xFF059669))` | `FmmsColors.EmeraldGradient` | `--status-green` |
| **Cyan / Hi-Tech OBD** | `#06B6D4` → `#0EA5E9` | `listOf(Color(0xFF06B6D4), Color(0xFF0EA5E9))` | `FmmsColors.CyanGradient` | `--accent-cyan` |
| **Amber / Warning** | `#F59E0B` → `#D97706` | `listOf(Color(0xFFF59E0B), Color(0xFFD97706))` | `FmmsColors.AmberGradient` | `--status-amber` |
| **Rose / Critical** | `#EF4444` → `#DC2626` | `listOf(Color(0xFFEF4444), Color(0xFFDC2626))` | `FmmsColors.RoseGradient` | `--status-rose` |
| **Purple / Warranty**| `#8B5CF6` → `#6D28D9` | `listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9))` | `FmmsColors.PurpleGradient` | `--accent-purple` |
| **Dark Background** | `#0F172A` (Slate 900) | Nền chính ứng dụng Dark mode | `Color(0xFF0F172A)` | `--bg-primary` |
| **Dark Surface Card**| `#1E293B` (Slate 800) | Nền thẻ điều khiển / Card | `Color(0xFF1E293B)` | `--bg-secondary` |
| **Border Subtle** | `#334155` (Slate 700) | Viền mỏng 1dp có alpha 0.4 - 0.6 | `Color(0xFF334155)` | `--border-default` |
| **Text Primary** | `#F8FAFC` (Slate 50) | Chữ tiêu đề chính / số liệu lớn | `Color(0xFFF8FAFC)` | `--text-primary` |
| **Text Muted** | `#94A3B8` (Slate 400) | Nhãn phụ, đơn vị đo, ngày tháng | `Color(0xFF94A3B8)` | `--text-muted` |

---

## 🎴 2. NGUYÊN TẮC THIẾT KẾ THẺ (CARD & GLASSMORPHISM)

1. **Bo góc lớn hiện đại:** Chuẩn bo góc là `16.dp` đến `20.dp` (`RoundedCornerShape(18.dp)`).
2. **Viền thẻ phát sáng nhẹ (Subtle Glowing Border):** Dùng `BorderStroke(1.dp, accentColor.copy(alpha = 0.25f))` để thẻ tách biệt rõ trên nền tối mà không bị thô.
3. **Hiệu ứng đổ bóng mờ có màu (Colored Shadow):** Đổ bóng nhẹ theo màu chủ đạo của thẻ để tạo chiều sâu công nghệ (Hi-Tech Glow).
4. **Phân cấp thị giác (Typography Hierarchy):**
   - **Nhãn phụ (Label):** Luôn viết HOA (`uppercase()`), cỡ chữ nhỏ (`10sp` - `11sp`), đậm (`FontWeight.Bold`), màu xám nhạt (`Color(0xFF94A3B8)`).
   - **Giá trị cốt lõi (Metric Value):** In đậm tối đa (`FontWeight.ExtraBold`), cỡ chữ to (`18sp` - `24sp`), màu trắng hoặc màu Accent nổi bật.

---

## 🛡️ 3. BỘ MÃ MẪU JETPACK COMPOSE (SẴN DÙNG CHO ANDROID)

### 3.1. Dấu tích xanh (Verified / Success Checkmark Badge)
```kotlin
@Composable
fun FmmsVerifiedBadgeIcon(
    size: Dp = 24.dp,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(size)
            .shadow(
                elevation = 6.dp, 
                shape = CircleShape, 
                spotColor = Color(0xFF10B981), 
                ambientColor = Color(0xFF10B981)
            )
            .clip(CircleShape)
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF34D399), Color(0xFF059669))
                )
            )
            .border(1.5.dp, Color(0xFF6EE7B7).copy(alpha = 0.6f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Rounded.Check,
            contentDescription = "Verified / Success",
            tint = Color.White,
            modifier = Modifier.size(size * 0.65f)
        )
    }
}
```

### 3.2. Thẻ Thông báo An Toàn / Không có lỗi (Safe & Healthy Card)
```kotlin
@Composable
fun FmmsAllGoodCard(
    title: String = "Tất cả hệ thống hoạt động tốt",
    subtitle: String = "0 mã lỗi động cơ (DTC) • Động cơ & Cảm biến chuẩn chỉ số",
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B).copy(alpha = 0.3f)),
        border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.35f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            FmmsVerifiedBadgeIcon(size = 38.dp)

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color(0xFF6EE7B7)
                    )
                )
            }
        }
    }
}
```

### 3.3. Thẻ Chỉ số Thông minh (Stat / KPI Card)
```kotlin
@Composable
fun FmmsStatCard(
    title: String,
    value: String,
    subValue: String,
    icon: ImageVector,
    accentColor: Color,
    gradientColors: List<Color>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        border = BorderStroke(1.dp, accentColor.copy(alpha = 0.25f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            accentColor.copy(alpha = 0.08f),
                            Color.Transparent
                        )
                    )
                )
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title.uppercase(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.8.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = value,
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subValue,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = accentColor,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                }

                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brush.linearGradient(gradientColors)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }
    }
}
```

### 3.4. Chip Trạng Thái Đậm Chất Công Nghệ (Status Pill)
```kotlin
@Composable
fun FmmsStatusBadge(
    text: String,
    statusColor: Color,
    leadingIcon: @Composable (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = statusColor.copy(alpha = 0.15f),
        border = BorderStroke(1.dp, statusColor.copy(alpha = 0.35f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            if (leadingIcon != null) {
                leadingIcon()
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = statusColor
                )
            )
        }
    }
}
```

### 3.5. Nút Bấm Hành Động Gradient (Action Button)
```kotlin
@Composable
fun FmmsGradientButton(
    text: String,
    icon: ImageVector? = null,
    gradient: List<Color> = listOf(Color(0xFF10B981), Color(0xFF059669)),
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .height(48.dp)
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(14.dp), spotColor = gradient.first()),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
        contentPadding = PaddingValues()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.linearGradient(gradient))
                .padding(horizontal = 18.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text,
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
            }
        }
    }
}
```

---

## 📱 4. ÁP DỤNG TRỰC TIẾP CHO CÁC MÀN HÌNH ANDROID

1. **Màn hình Chẩn đoán lỗi (Diagnostic / DTC Screen):**
   - Không có lỗi: Dùng `FmmsAllGoodCard` kèm `FmmsVerifiedBadgeIcon`.
   - Có mã lỗi: Dùng Thẻ cảnh báo viền đỏ `Color(0xFFEF4444)`, chip `FmmsStatusBadge` đỏ `CRITICAL`.
2. **Màn hình Trực tiếp OBD (Live Gauges):**
   - Tốc độ: Dùng viền Cyan Gradient (`#06B6D4` → `#0EA5E9`).
   - RPM: Dùng viền Amber Gradient (`#F59E0B` → `#D97706`), chuyển Đỏ khi > 3500 RPM.
3. **Màn hình Nhiên liệu (Fuel Screen):**
   - Mức xăng & % bình xăng: Dùng Gradient Emerald mượt mà kèm thanh tiến trình bo tròn.
