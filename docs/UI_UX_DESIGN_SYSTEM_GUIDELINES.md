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

---

## 🌐 5. TIÊU CHUẨN THIẾT KẾ ĐA THIẾT BỊ & ĐIỀU HƯỚNG DI ĐỘNG (RESPONSIVE WEB APP SPECIFICATION)

1. **Ma Trận Kích Thước & Điểm Ngắt (Breakpoint Standards):**
   - `xs: < 480px`: Điện thoại di động nhỏ (iPhone SE, Galaxy A/S tiêu chuẩn).
   - `sm: 480px – 767px`: Điện thoại cỡ lớn / xoay ngang.
   - `md: 768px – 1023px`: Máy tính bảng (iPad, Surface) và đầu màn hình xe hơi Zestech 9/10".
   - `lg: 1024px – 1279px`: Laptop & Màn hình làm việc nhỏ.
   - `xl: 1280px – 1439px`: Desktop tiêu chuẩn.
   - `2xl: ≥ 1440px`: Màn hình lớn độ nét cao.

2. **Quy Chuẩn Chạm Cảm Ứng (Touch Target Ergonomics):**
   - Mọi nút bấm, icon thao tác, liên kết menu trên thiết bị di động phải đạt vùng chạm tối thiểu **`44 × 44px`** (`--touch-target-min: 44px`).
   - Khoảng cách an toàn giữa các phần tử cảm ứng tối thiểu `8px` để chống bấm nhầm.

3. **Cơ Chế Mobile Navigation Drawer:**
   - Khi viewport `< 1024px`, Sidebar chuyển thành Drawer trượt từ mép trái (`animate-slideInLeft`), có nền mờ làm mờ nội dung (`backdrop-blur-sm`).
   - Tự động đóng khi: (1) người dùng chọn route bất kỳ, (2) bấm nút X, (3) bấm vào backdrop mờ ngoài, (4) nhấn phím `Escape`.

4. **Trang Chi Tiết Đa Tab (Multi-Tab Switching):**
   - Hỗ trợ thanh cuộn ngang cảm ứng mượt mà (`overflow-x-auto` kết hợp bo tròn pill tabs).
   - Trên màn hình hẹp (`< 640px`), bổ sung Dropdown Switcher chọn nhanh trực tiếp giúp người dùng nhảy tab ngay lập tức mà không cần vuốt qua lại nhiều lần.

5. **Hiển Thị Tràn Viền Trên Màn Hình Máy Tính Lớn (Fluid Full-Width Desktop Optimization):**
   - **Gỡ bỏ giới hạn cố định:** Thẻ `<main>` bao bọc toàn bộ ứng dụng (`ClientShell.tsx`) không đặt giới hạn chiều rộng cứng như `max-w-7xl`, `max-w-6xl` hay căn giữa thu hẹp `mx-auto`. Chiều rộng luôn là `w-full` (100% fluid).
   - **Khoảng đệm thích ứng (Adaptive Padding):** Áp dụng padding hai bên lề chuẩn: `p-3.5 sm:p-5 lg:p-6 xl:p-8` kết hợp thanh `Navbar` `px-2.5 sm:px-4 md:px-6 xl:px-8` đảm bảo nội dung không bị dính sát mép trên màn hình 24", 27", 32" (1080p, 2K, 4K).
   - **Lưới hiển thị co giãn (Fluid Grids):** Danh sách thẻ xe hỗ trợ `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6`, tự động chuyển sang 4 cột trên màn hình siêu rộng để thẻ không bị kéo dãn bất thường.
   - **Bảng biểu & Biểu đồ:** Các bảng dữ liệu (Nhiên liệu, Bảo dưỡng, Hành trình, Tài chính) dùng `overflow-x-auto` với `w-full`; biểu đồ Recharts khai báo `ResponsiveContainer width="100%"` tự động trải đều không gian hiển thị.

---

## 📊 6. TIÊU CHUẨN HIỂN THỊ DỮ LIỆU TRÊN BIỂU ĐỒ (CHART DATA LABELS SYSTEM)

1. **Mục Tiêu:**
   - Cho phép người dùng trực tiếp quan sát các giá trị số liệu trên các cột, điểm dữ liệu mà không nhất thiết phải di chuột hay rê tay mở Tooltip.
   - Cung cấp nút chuyển đổi nhanh trực tiếp tại từng biểu đồ (Per-Chart Quick Toggle) kết hợp ghi nhớ trạng thái thông minh qua `localStorage`.

2. **Cấu Trúc Nút Bấm Chuẩn (`ChartLabelToggle` / `ChartValueToggle`):**
   - **Thành phần:** Nút bấm trực quan với icon động `Eye` (khi bật) và `EyeOff` (khi tắt), chuyển đổi linh hoạt giữa 2 trạng thái Outlined và Contained.
   - **Trạng thái Tắt (Hide / OFF - Outlined):**
     - Viền subtle (`border border-slate-300 dark:border-slate-700/80`), nền trong suốt hoặc hover nhẹ (`hover:bg-slate-100 dark:hover:bg-slate-800/70`), chữ màu ghi thanh thoát (`text-slate-600 dark:text-slate-400`).
     - Icon `EyeOff` mờ nhẹ, văn bản hiển thị `"Hiện số"` (hoặc `"Hiện Km"` / `"Hiện giá trị"`).
     - Tooltip giải thích: `"Hiển thị nhãn số kèm nền chống lóa"`.
   - **Trạng thái Bật (Show / ON - Contained):**
     - Nền khối rực rỡ chuẩn nhận diện thương hiệu (`bg-cyan-500 hover:bg-cyan-600 text-white`), viền sáng nhẹ (`border-cyan-400/50`), đổ bóng mềm chống bệt màu (`shadow-sm shadow-cyan-500/25`).
     - Icon `Eye` sắc nét, văn bản hiển thị `"Ẩn số"` (hoặc `"Ẩn Km"` / `"Ẩn giá trị"`).
     - Tooltip giải thích: `"Ẩn nhãn số để biểu đồ thoáng hơn"`.
   - **Kích thước & Chế độ thu gọn:**
     - Mặc định: Cao ~28px (`h-7`), font chữ `text-xs font-semibold`, padding `px-2.5 py-1 rounded-lg`.
     - Chế độ `compact` (icon-only): `p-1.5 rounded-lg` dành riêng cho các thẻ phụ chật chội hoặc thiết bị siêu nhỏ.
     - Tương thích ngược 100% với prop `label` truyền vào từ trước (`label="Hiện Km"` tự động chuyển thành `"Hiện Km"` khi tắt và `"Ẩn Km"` khi bật).

3. **Nguyên Tắc Định Dạng Số Thông Minh (Smart Formatting):**
   - **Tiền tệ lớn:** `X.XM ₫` (ví dụ `1.2M ₫`, `350k ₫`).
   - **Nhiên liệu:** `X.XL` hoặc `XL` (ví dụ `42.5L`).
   - **Khoảng cách:** `X,XXX km` hoặc `Xk km`.
   - **Đơn giá:** `XX.Xk` hoặc `XX,XXX ₫/L`.
   - **Bộ lọc số 0:** Các tháng/kỳ không phát sinh chi phí (`value === 0` hoặc `null`) trả về chuỗi rỗng `''` để giữ biểu đồ luôn tinh gọn, không bị rối mắt.

4. **Chống Tràn Lề & Đè Chữ (Anti-Overlapping & Top Margin):**
   - Biểu đồ tự động tăng lề trên (`margin.top: showChartLabels ? 24 : 15`) khi nhãn được kích hoạt, tránh việc số liệu bị cắt cụt ở đỉnh đồ thị.
   - Với biểu đồ xếp chồng (Stacked Area/Bar), sử dụng đường gián tiếp trong suốt hoặc đặt nhãn ở tổng số liệu cao nhất để tránh đè chéo nhãn các lớp con.

5. **Quy Chuẩn Thanh Điều Khiển & Bộ Lọc Năm Trên Mobile (Anti-Card-Overflow Specification):**
   - **Tuyệt đối không đặt `shrink-0` ở thanh container bao ngoài:** Container chứa các nút năm/bộ lọc phải khai báo `max-w-full overflow-x-auto scrollbar-none` để người dùng có thể cuộn ngang mượt mà khi dữ liệu có nhiều năm hoặc nhiều danh mục, không bị tràn/đè ra ngoài viền thẻ (`out thẻ`).
   - **Rút gọn nhãn thông minh trên Mobile:**
     - `"Tất cả các năm"` ➔ `<span className="hidden xs:inline">Tất cả các năm</span><span className="xs:hidden">Tất cả</span>`.
     - `"Năm 2026"` ➔ `<span className="hidden xs:inline">Năm </span>2026`.
   - **Đặt `shrink-0` cho từng nút con:** Đảm bảo từng nút năm hoặc icon không bị bẹp méo khi nội dung chạm mép container.
   - **Padding thẻ biểu đồ chuẩn Mobile:** Dùng `p-3.5 sm:p-5 rounded-2xl` thay vì `p-5` cố định để chừa đủ khoảng thở cho nội dung trên thiết bị 360–390px.




