# FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
## TÀI LIỆU KIẾN TRÚC THIẾT KẾ HỆ THỐNG & ĐẶC TẢ KỸ THUẬT (2026)

---

## 1. TRIẾT LÝ KIẾN TRÚC TRỌNG TÂM: TÀI SẢN XE LÀ TRUNG TÂM (ASSET-CENTRIC PHILOSOPHY)

Hệ thống **FMMS** được xây dựng dựa trên nguyên lý **Asset-Centric Architecture (Tài sản là trung tâm bất biến)**, phân tách hoàn toàn giữa **Thực thể Tài sản Di chuyển (Vehicle Entity)** và **Thiết bị Thu thập Phần cứng (Collector Nodes)**:

```text
                               ┌─────────────────────────────────────────────────────────┐
                               │           🚗 THỰC THỂ TÀI SẢN BẤT BIẾN (ASSET)          │
                               │        ID: 20260308-0001-4222-8888-19b213872026         │
                               │               Mazda 2AT 2026 (19B-213.87)               │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
                                                            │ (Quan hệ 1 - N Sở hữu vĩnh viễn)
            ┌───────────────────────────────┬───────────────┴───────────────┬───────────────────────────────┐
            ▼                               ▼                               ▼                               ▼
    🗺️ Chuyến đi (Trips)           ⛽ Nhiên liệu (Fuel Logs)        🛠️ Phụ tùng (Upgrades/Parts)     📊 Chi phí & Vay (Finance)
  • Quãng đường (km)             • Lượng xăng nạp (L)            • Màn hình Zestech ADAS         • Vốn ban đầu (Initial)
  • Tọa độ GPS Trackpoints       • Giá tiền, Cây xăng            • Gập gương điện, TPMS          • Chi phí vận hành (Running)
  • Tiêu hao (L/100km)           • ODO thực tế lúc đổ            • Thảm lót sàn, Bơm lốp         • Dư nợ TPBank (Principal)
            ▲                               ▲
            │                               │
            └───────────────┬───────────────┘
                            │ (Thu thập & Gửi dữ liệu)
 ┌──────────────────────────┴───────────────────────────────────────────────────────────────────────────────┐
 │ 📱 THIẾT BỊ NGOẠI VI THU THẬP TÍN HIỆU (COLLECTOR NODES - Có thể thay thế, nâng cấp mà không mất data xe)│
 │  • Node chính: Màn hình ZESTECH 9" Android (Chạy Native In-Car App FMMS)                                 │
 │  • Cảm biến máy: Adapter KONNWEI KW906 OBD-II Bluetooth (Đọc ECU động cơ, RPM, Coolant, Throttle, MAF)    │
 │  • Định vị: Module GPS Anten gắn xe (Ghi nhận Trackpoints, Vận tốc thực tế)                               │
 │  • Node thay thế/dự phòng: Điện thoại thông minh (Tracker mode) hoặc thiết bị phần cứng mới sau này       │
 └───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 🔑 Ý nghĩa thiết kế:
* **Tính độc lập phần cứng:** Kể cả khi màn hình Android trên xe bị cháy, hỏng hóc, reset dữ liệu hoặc được thay mới bằng một đầu Android khác, toàn bộ dữ liệu lịch sử xe, nhật ký chuyến đi, số ODO và chi phí trên Cloud Database vẫn gắn liền trọn đời với ID chiếc xe `20260308-0001-4222-8888-19b213872026`.
* **Trường `device_id`:** Chỉ được coi là trường siêu dữ liệu (metadata/diagnostic log) để theo dõi thiết bị phần cứng nào đã thực hiện gửi bản ghi.

---

## 2. MA TRẬN DANH MỤC TÀI SẢN GIA ĐÌNH (FLEET MATRIX)

| STT | Tên phương tiện | Loại (Type) | Phân khúc | Biển số / Mã | Nhiên liệu | Trạng thái | Mục đích sử dụng |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **Mazda 2AT 2026** | `CAR` | Sedan/Hatchback | `19B-213.87` | Xăng (44L) | `ACTIVE` | Ô tô gia đình chính (Đi lại, công tác, du lịch) |
| 2 | **Honda Air Blade 2016** | `MOTORCYCLE` | Tay ga 125cc | `88C1-210.63` | Xăng (4.4L) | `ACTIVE` | Xe máy đi lại làm việc hằng ngày |
| 3 | **Honda Air Blade 2021** | `MOTORCYCLE` | Tay ga 125cc | `88L1-604.36` | Xăng (4.4L) | `ACTIVE` | Xe máy gia đình mua tháng 04/2021 |
| 4 | **Thống Nhất MTB 26-05** | `BICYCLE` | Mountain Bike | `MTB 26-555` | Sức người | `ACTIVE` | Xe đạp thể thao rèn luyện sức khỏe |
| 5 | **Thống Nhất MTB 20-05** | `BICYCLE` | Kids/Youth Bike | `MTB 20-999` | Sức người | `ACTIVE` | Xe đạp thể thao trẻ em |
| 6 | **Honda CR-V e:HEV RS** | `CAR` | SUV 5 chỗ Hybrid | `CRV-HYBRID` | Hybrid (53L) | `INACTIVE` | Mục tiêu nâng cấp xe gầm cao Hybrid tương lai |

---

## 3. CHUẨN MỰC BẠCH HÓA TÀI CHÍNH XE (FINANCIAL ACCOUNTING LEDGER)

Hệ thống kế toán phương tiện FMMS chia chi phí thành **4 nhóm chuẩn xác**:

```text
                                ┌────────────────────────────────────────┐
                                │        TỔNG CHI PHÍ TÀI SẢN (TCO)      │
                                └───────────────────┬────────────────────┘
                                                    │
         ┌──────────────────────────┬───────────────┴──────────────┬──────────────────────────┐
         ▼                          ▼                              ▼                          ▼
 1. INITIAL (Vốn ban đầu)    2. RUNNING (Vận hành)        3. UPGRADE (Nâng cấp)      4. LOAN (Vay ngân hàng)
 • Tiền cọc xe lần 1 (10tr)  • Xăng xe thực tế            • Màn ZX ADAS (17tr)       • Vốn vay gốc: 295.000.000 ₫
 • Chuyển tiền đợt 2 (30tr)  • Bảo dưỡng định kỳ Thaco    • Gập gương điện (1.8tr)   • Gốc đã trả:   24.081.632 ₫
 • Thanh toán đợt 3 (62tr)   • Bảo hiểm thân vỏ (4.3tr)   • Phím Media (2tr)         • Lãi đã trả:    6.935.510 ₫
 • Lệ phí trước bạ (40.3tr)  • Đăng kiểm + Phí đường bộ   • Cảm biến TPMS (1.5tr)    • Dư nợ còn lại:270.918.368 ₫
 • Phí đăng ký biển (1.4tr)  • Rửa xe, Epass, BOT         • Thảm 5D, Bơm lốp, v.v.   • Lãi suất: 8% năm đầu
 • Phí DV ngân hàng (3.44tr) • Bê tông sân đỗ xe                                       (Biên độ thả nổi 11.5%)
 • Phí bảo hiểm vay (3tr)    • Máy rửa xe cao áp Bosch
 ──────────────────────────  ──────────────────────────   ──────────────────────────
 💰 Tổng: 150.140.000 ₫       💰 Tổng: 21.732.694 ₫        💰 Tổng: 23.868.000 ₫
```

---

## 4. KIẾN TRÚC HỆ THỐNG THU THẬP IN-CAR (ANDROID ON ZESTECH 9")

1. **Lớp Thu thập (Telemetry & Sensor Layer):**
   * `OBDConnectionManager`: Giao tiếp Bluetooth SPP/BLE với adapter KONNWEI KW906 tốc độ cao (đọc tốc độ xe, vòng tua máy, nhiệt độ nước làm mát, cảm biến bướm ga, lưu lượng khí nạp MAF, điện áp ắc quy).
   * `GpsTracker`: Bắt tọa độ vệ tinh GPS định kỳ từ 2-5 giây/lần.
2. **Lớp Động cơ Tính toán (Engine Layer):**
   * `TripEngine`: Tự động nhận diện thời điểm khởi hành, dừng xe, phát hiện chuyến đi mới hoặc khôi phục chuyến đi mồ côi (`recoverOrphanedTrips`).
   * `VirtualOdometerEngine`: Bù trừ sai lệch số ODO thực tế của xe với số liệu đọc từ ECU hoặc GPS.
3. **Lớp Lưu trữ & Hàng đợi Ngoại tuyến (Room DB & Sync Queue):**
   * Cơ chế **Offline-First**: Khi xe mất sóng 4G/Wifi, dữ liệu lưu an toàn trong Room Database local (`trips`, `telemetry_samples`, `fuel_logs`, `gps_track_points`, `sync_queue`).
   * `SyncWorker`: Tự động kích hoạt khi có mạng, đẩy tuần tự lên Supabase Cloud với cơ chế `resolution=merge-duplicates` chống trùng lặp.

---

## 5. KIẾN TRÚC NỀN TẢNG WEB & TRACE AUDIT (NEXT.JS 14 & SUPABASE)

* **Next.js 14 App Router & TypeScript:** Giao diện Dark/Light thích ứng chuẩn Automotive Glassmorphism.
* **Sync Trace Logger (`syncLogger.ts`):** Ghi nhận real-time mọi hành động `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `RPC` đồng bộ giữa Frontend và Supabase Cloud.
* **Supabase Security & RLS:** Phân quyền theo người dùng (`owner_id`), chính sách Row Level Security, Trigger cập nhật Odometer và tổng chi phí.
* **Multi-AI Assistant Gateway:** Trợ lý ảo AI phân tích dữ liệu xe, nhắc lịch bảo dưỡng và tối ưu chi phí nhiên liệu.

---

## 6. KIẾN TRÚC GIAO DIỆN THÍCH ỨNG ĐA THIẾT BỊ (RESPONSIVE WEB APP ARCHITECTURE)

Hệ thống Web App FMMS được thiết kế theo nguyên lý **Một Ứng Dụng — Một Mã Nguồn — Tự Động Thích Ứng Mọi Khung Hình (One Codebase, Adaptive Layout Across All Viewports)**:

### 6.1. Chuẩn Hóa Ma Trận Breakpoint Hệ Thống
* **XS (`< 480px`):** Điện thoại thông minh nhỏ & trung bình.
* **SM (`480px – 767px`):** Điện thoại màn hình lớn & chế độ xoay ngang.
* **MD (`768px – 1023px`):** Máy tính bảng xoay dọc (iPad, Zestech 9/10 inch).
* **LG (`1024px – 1279px`):** Laptop nhỏ & Máy tính bảng xoay ngang.
* **XL (`1280px – 1439px`):** Màn hình máy tính chuẩn (Desktop).
* **2XL (`≥ 1440px`):** Màn hình độ phân giải cao & TV giám sát Fleet.

### 6.2. Kiến Trúc Khung Ứng Dụng (AppShell Architecture)
```text
                         ClientShell (AppShell)
                                   │
          ┌────────────────────────┼────────────────────────┐
        Navbar                Navigation                   Main
          │                        │                        │
   [☰ Hamburger]                   │                   Responsive
  (Hiện khi < 1024px)              │                   p-3.5..p-6
                                   │                   min-h-[100dvh]
                ┌──────────────────┴──────────────────┐
                │                                     │
        Màn hình ≥ 1024px                     Màn hình < 1024px
                │                                     │
         Persistent Sidebar                    Adaptive Drawer
        (Cố định bên trái)              (Trượt từ trái + Backdrop mờ,
                                         tự đóng khi đổi route / ESC)
```

### 6.3. Chiến Lược Điều Hướng Thích Ứng (Adaptive Navigation)
* **Desktop (≥ 1024px):** Thanh Sidebar bên trái cố định (rộng 240–260px) hiển thị trực quan các phân hệ quản lý và khối trạng thái trực tiếp của xe (Live OBD/GPS).
* **Mobile / Tablet (< 1024px):** Thanh Sidebar tự động chuyển thành **Mobile Navigation Drawer** trượt từ mép trái màn hình (`animate-slideInLeft`), kích hoạt qua nút Hamburger (☰) trên Header.
* **Quy tắc An Toàn Trải Nghiệm (UX Safety Rules):**
  - Tuyệt đối không ẩn hoàn toàn thanh điều hướng mà không cung cấp điểm kích hoạt thay thế.
  - Vùng chạm (Touch Target) của các nút và liên kết menu luôn đạt tối thiểu `44 × 44px`.
  - Drawer tự động đóng khi người dùng chọn một mục điều hướng mới, nhấn phím `Escape`, hoặc chạm vào vùng Backdrop mờ bên ngoài.
  - Khóa cuộn nền (`document.body.style.overflow = 'hidden'`) khi Drawer đang mở để tránh giật cuộn nội dung phía sau.

### 6.4. Thanh Tab Đa Phân Hệ Thích Ứng (Responsive Multi-Tab Pattern)
* Đối với các trang chứa nhiều tab chuyên sâu (ví dụ trang chi tiết xe `/assets/[id]` với 11 tab), hệ thống áp dụng cơ chế kép:
  - **Màn hình nhỏ (< 640px):** Cung cấp Menu chọn nhanh (Quick Dropdown Switcher) giúp người dùng chuyển tab tức thì chỉ với 1 chạm.
  - **Màn hình lớn (≥ 640px):** Hiển thị thanh cuộn mượt các Tab Pills có hỗ trợ vuốt cảm ứng nhạy và hiển thị trạng thái phân hệ trực quan.

