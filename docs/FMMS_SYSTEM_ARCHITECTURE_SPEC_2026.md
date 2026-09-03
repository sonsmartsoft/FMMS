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
