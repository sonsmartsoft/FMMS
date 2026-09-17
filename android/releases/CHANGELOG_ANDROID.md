# CHANGELOG — Android App (FMMS)

Ghi chú thay đổi theo từng REV của app Android `com.fmms.carlogger`.

> **Cách đọc bảng:** Mỗi dòng = 1 bản apk. `Rev` là số REV trong `app/build.gradle.kts`.
> `Nội dung` chỉ ghi các thay đổi **chắc chắn từ các phiên làm việc**. Những rev để trống
> (đánh dấu `—`) là bản build không có thông tin thay đổi được lưu/chưa xác định chính xác,
> không có nghĩa là "không có gì mới".

> **Lưu ý quan trọng:** Các rev Android **không được commit lên git** (git chỉ chứa web).
> Do đó nội dung chi tiết từng rev dựa trên metadata file + ghi nhớ phiên làm việc, không
> truy xuất lại được 100% từ repo. Cần thận trọng khi dựa vào cột "Nội dung".

---

## Sự cố phát triển (development incidents)

### ⚠️ Đèn pha nháy do sniff CAN `ATMA`/`AT H1` (đọc số hộp số P/R/N/D)

- **Nguyên nhân:** Trong `TelemetryEngine.sniffCanGearOnce()` ta dùng lệnh **`ATMA`** (monitor all —
  mở rộng cửa sổ thu toàn bộ frame trên bus CAN) kèm **`AT H1`** (bật header CAN 3 byte) để đọc
  số hộp số từ frame thô ID `228`/`131` trên bus CAN. Khi lệnh PID khác chen vào giữa cửa sổ
  monitor (không giữ đúng khoá giao dịch), hoặc khi sniff đang khi xe đang lái → làm **nhiễu/lỗi
  giao thức bus CAN** → **đèn pha bị nháy**.
- **Khắc phục đã áp dụng (đang trong code):**
  - Toàn bộ phiên `ATMA` phải giữ chung khoá giao dịch `elms.transactionMutex.withLock { ... }`
    (TelemetryEngine.kt:149-151) — lệnh PID không thể chen vào giữa.
  - **Chỉ** sniff khi xe đứng yên `<3 km/h`; khi đang lái **không** gửi `ATMA` gì cả
    (TelemetryEngine.kt:232-233, comment "an toàn cho bus, tránh lỗi đèn như sự cố trước").
- **Bài học / quy tắc từ nay:**
  - **KHÔNG dùng** `ATMA`, `AT H1`, `AT S1`, hay bất kỳ lệnh control/monitor CAN thô nào trong
    tính năng mới ngoài vòng sniff hộp số hiện hữu. Các thể loại command an toàn là **OBD Mode
    chuẩn read-only** (`0101`, `010C`, `010D`, `03`, `07`, `0A`…).
  - Tính năng **DTC** (rev 121 trở đi) chỉ dùng Mode đọc chuẩn `01`/`03`/`07`/`0A` — **không có**
    bất kỳ lệnh điều khiển đèn/body ECU/{UDS write}. Mọi giao dịch với adapter giữ chung
    `transactionMutex` để không xung đột với `ATMA`/vòng PID.

---

## Nhánh REV 132 → 136 (DTC parse fix + chống nhập sai giá xăng)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 132 | — | — | — |
| 133 | 2026-09-13 | 25 MB | Đồng bộ severity DTC từ code + fuel rate guard (chặn fuel rate bẩn). |
| 134 | 2026-09-14 | 25 MB | **Fix DTC parse (bước 1)**: `parseDtcResponse` tách dòng theo `\r?\n` — hết mã ảo `C0300/C0700` do gộp response 2 ECU thành 1 dòng. |
| 135 | 2026-09-15 | 25 MB | **Fix DTC parse thật (triệt để)**: tách theo `[\r\n]+` + `stripIsoTp` bỏ byte PCI sau header CAN → hết `P0002` (PCI `02` lọt vào data) và `C0300/C0700`. Verify trên xe: `decoded=[]`. |
| 136 | 2026-09-16 06:12 | 25 MB | **Chống nhập sai giá đổ xăng** (FuelScreen): chấp nhận dấu phẩy `,`; live preview "Tổng ≈ X đ" dưới ô nhập; **chặn Save khi giá < 10.000 đ/L** (thiếu ×1000, VD nhập 25.53 thay vì 25.530). APK md5 `649c9f34...`. |

---

## Nhánh REV 120 → 131 (Duplicate fix + R8 optimization)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 120–129 | 2026-09-10 | ~36 MB | — (không lưu changelog chi tiết) |
| 130 | 2026-09-11 23:35 | 36 MB | **Fix trips trùng lặp**: auto-purge trips pattern `-0002-`/seq 35-49 từ SQLite lúc khởi động + syncNow(); Lọc bỏ trips seed lịch sử (`^\d{8}-\d{4}-.*`) không đẩy lên cloud → giải quyết lỗi web hiện 5333km ảo. Hiển thị số lít xăng 2 chữ số thập phân (`+24.42 L`). |
| 131 | 2026-09-12 10:55 | **25 MB** | **Bật R8 minify + shrink resources** (`isMinifyEnabled=true`, `isShrinkResources=true`): APK giảm từ 36MB → 25MB (−30%), boot nhanh hơn, RAM thấp hơn ~20%. Thêm `proguard-rules.pro` đầy đủ cho Room, OkHttp, TFLite, CameraX, ExoPlayer, WorkManager. |

---

## Nhánh REV 112 → 119 (STATS real cost + tap biểu đồ + AI stats chuẩn + auto-open UI)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 112 | — | — | — |
| 113 | — | — | — |
| 114 | — | — | — |
| 115 | 2026-09-03 | — | Kéo `fuel_logs` từ cloud về local (`FuelLogDao.upsertAll`, `upsertCloudFuelLogs`); cost tháng/năm = tổng tiền đổ xăng thực tế (`fuelLogCost`). YEARLY tổng 7.1tr khớp fuel_logs. |
| 116 | 2026-09-03 | — | `DualAxisBarLineChart` thêm tap cột → hiện value (cost + km). |
| 117 | 2026-09-03 | — | Thêm log debug `StatsCharts` cho tap (còn để lại trong code). |
| 118 | 2026-09-03 | — | AI `callAiAdvisor` gửi block `stats` chuẩn (km 2483/2926, fuel cost 7.1tr…). Edge function chưa đọc `stats` (chỉ dùng DB context). |
| 119 | 2026-09-03 19:49 | 15.1 MB | **Tự mở giao diện sau boot**: `BootReceiver` sau 12s start TelemetryService + `startActivity(MainActivity)` (FLAG_ACTIVITY_NEW_TASK|CLEAR_TOP|SINGLE_TOP). Verify trên head-unit: sau reboot MainActivity được start + lấy focus (trước chỉ chạy telemetry ngầm). |

---

## Nhánh REV 100 → 111 (phân tích tài chính + STATS donut + đồng bộ cloud)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 100 | 2026-09-01 20:27 | 14.4 MB | Thêm/kết nối màn STATS phân bổ chi phí donut với RPC cloud. |
| 101 | 2026-09-01 20:38 | 14.4 MB | — |
| 102 | 2026-09-01 21:32 | 14.4 MB | — |
| 103 | 2026-09-01 22:26 | 14.4 MB | — |
| 104 | 2026-09-01 22:31 | 14.4 MB | — |
| 105 | 2026-09-01 22:44 | 14.4 MB | — |
| 106 | 2026-09-01 23:03 | 14.4 MB | — |
| 107_probe | 2026-09-02 07:08 | 14.4 MB | Bản probe (điều tra) — nhánh đồng bộ/telemetry. |
| 108 | 2026-09-02 07:33 | 14.4 MB | — |
| 109 | 2026-09-02 07:49 | 14.4 MB | — |
| 110 | 2026-09-02 07:51 | 14.4 MB | **Donut STATS: layout trái/giữa/phải** (biểu đồ trái – legend phải – tổng tiền giữa donut); ẩn donut ở DAILY, chỉ hiện MONTHLY/YEARLY; YEARLY mặc định "Cả năm". |
| 111 | 2026-09-03 11:03 | 14.4 MB | Tăng REV (code không đổi so với 110). Nguồn dữ liệu donut nằm ở RPC cloud `fmms_get_expense_breakdown` (4 nhóm Initial/Upgrade/Running/Maintenance) — đã deploy. |

---

## Nhánh REV 97 → 99 (chuyển tiếp)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 97 | 2026-09-01 14:45 | 20.4 MB | — |
| 98 | 2026-09-01 17:24 | 20.5 MB | — |
| 99 | 2026-09-01 17:37 | 20.5 MB | — |

---

## Nhánh REV 67 → 96 (OBD/telemetry + nhiều tính năng xe)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 67 | 2026-08-24 09:23 | 21.2 MB | Nhánh Android đầu tiên trong `releases/` chính. |
| 68 | 2026-08-28 19:53 | 20.6 MB | — |
| 69 | 2026-08-28 20:00 | 20.6 MB | — |
| 70 | 2026-08-28 20:04 | 20.6 MB | — |
| 71 | *(thiếu)* | — | Không có file apk. |
| 72 | *(thiếu)* | — | Không có file apk. |
| 73 | 2026-08-28 22:38 | 20.7 MB | — |
| 74 | 2026-08-30 17:26 | 20.5 MB | — |
| 75 | 2026-08-30 17:36 | 20.6 MB | — |
| 76 | 2026-08-30 17:48 | 20.6 MB | — |
| 77 | 2026-08-30 18:00 | 20.5 MB | — |
| 78 | 2026-08-30 18:14 | 20.6 MB | — |
| 79 | 2026-08-30 18:31 | 20.6 MB | — |
| 80 | 2026-08-30 18:46 | 20.7 MB | — |
| 81 | 2026-08-30 18:56 | 20.5 MB | — |
| 82 | 2026-08-30 19:03 | 20.5 MB | — |
| 83 | 2026-08-30 21:03 | 20.5 MB | — |
| 84 | 2026-08-30 21:07 | 20.5 MB | — |
| 85 | 2026-08-30 21:13 | 20.5 MB | — |
| 86 | 2026-08-30 21:24 | 20.5 MB | — |
| 87 | 2026-08-30 21:30 | 20.5 MB | — |
| 88 | 2026-08-30 21:42 | 20.5 MB | — |
| 89 | 2026-08-30 22:04 | 20.4 MB | — |
| 90 | 2026-08-31 01:12 | 20.4 MB | — |
| 91 | 2026-08-31 11:07 | 20.4 MB | — |
| 92 | 2026-08-31 11:20 | 20.4 MB | — |
| 93 | *(thiếu)* | — | Không có file apk. |
| 94 | 2026-08-31 11:39 | 20.4 MB | — |
| 95 | 2026-08-31 11:55 | 20.4 MB | — |
| 96 | 2026-08-31 19:01 | 20.4 MB | — |

---

## Nhánh REV 8 → 66 (thư mục `releases/OLD/` — giai đoạn đầu)

| Rev | Thời gian build | Dung lượng | Nội dung chính |
|-----|-----------------|-----------|----------------|
| 8 | 2026-08-17 22:29 | 11.4 MB | Bản sớm nhất còn lưu. |
| 15 | 2026-08-18 17:28 | 11.4 MB | — |
| 16 | 2026-08-18 21:54 | 11.4 MB | — |
| 17 | 2026-08-19 06:04 | 11.4 MB | — |
| 18 | 2026-08-19 10:26 | 11.4 MB | — |
| 19 | 2026-08-19 11:25 | 11.4 MB | — |
| 20 | 2026-08-19 13:46 | 11.4 MB | — |
| 21 | 2026-08-19 14:41 | 11.4 MB | — |
| 22 | 2026-08-19 17:34 | 11.4 MB | — |
| 23 | 2026-08-20 09:15 | 11.4 MB | — |
| 24 | 2026-08-20 13:58 | 11.4 MB | — |
| 25 | 2026-08-20 14:01 | 11.4 MB | — |
| 26 | 2026-08-20 17:34 | 16.5 MB | Tăng kích thước đáng kể (thêm thư viện/OBD). |
| 27 | 2026-08-20 18:00 | 16.7 MB | — |
| 28 | 2026-08-21 13:15 | 16.6 MB | — |
| 29 | 2026-08-21 13:57 | 16.6 MB | — |
| 30 | 2026-08-21 14:54 | 16.7 MB | — |
| 31 | 2026-08-21 15:35 | 16.7 MB | — |
| 32 | 2026-08-21 15:54 | 16.7 MB | — |
| 33 | 2026-08-21 16:06 | 16.7 MB | — |
| 34 | 2026-08-21 16:22 | 16.7 MB | — |
| 35 | 2026-08-21 16:28 | 17.4 MB | — |
| 36 | 2026-08-21 16:38 | 17.5 MB | — |
| 37 | 2026-08-21 16:53 | 17.4 MB | — |
| 38 | 2026-08-21 17:17 | 17.6 MB | — |
| 39 | 2026-08-21 18:28 | 17.5 MB | — |
| 40 | 2026-08-21 19:03 | 17.5 MB | — |
| 41 | 2026-08-21 19:23 | 17.5 MB | — |
| 42 | 2026-08-21 19:46 | 17.5 MB | — |
| 43 | 2026-08-21 20:44 | 17.5 MB | — |
| 44 | 2026-08-21 20:50 | 17.5 MB | — |
| 45 | 2026-08-21 21:25 | 17.5 MB | — |
| 46 | 2026-08-21 21:30 | 17.5 MB | — |
| 47 | 2026-08-21 21:34 | 17.5 MB | — |
| 48 | 2026-08-21 22:01 | 17.5 MB | — |
| 49 | 2026-08-21 22:07 | 17.1 MB | — |
| 50 | 2026-08-21 22:17 | 17.2 MB | — |
| 51 | 2026-08-21 22:22 | 17.1 MB | — |
| 52 | 2026-08-22 08:02 | 17.1 MB | — |
| 53 | 2026-08-22 08:31 | 17.3 MB | — |
| 54 | 2026-08-22 08:36 | 17.3 MB | — |
| 55 | 2026-08-22 08:41 | 17.3 MB | — |
| 56 | 2026-08-22 08:54 | 17.3 MB | — |
| 57 | 2026-08-22 09:24 | 11.8 MB | Giảm mạnh dung lượng (tinh giản dependency). |
| 58 | 2026-08-22 09:59 | 11.8 MB | — |
| 59 | 2026-08-22 10:16 | 11.8 MB | — |
| 60 | 2026-08-22 10:38 | 11.8 MB | — |
| 61 | 2026-08-22 12:44 | 12.3 MB | — |
| 62 | 2026-08-22 14:26 | 12.3 MB | — |
| 63 | 2026-08-22 14:32 | 12.3 MB | — |
| 64 | 2026-08-22 15:33 | 12.3 MB | — |
| 65 | 2026-08-23 09:10 | 12.3 MB | — |
| 66 | 2026-08-23 13:31 | 11.8 MB | — |

---

## Ghi chú kỹ thuật

- **Số REV** được quản lý thủ công trong `android/app/build.gradle.kts` (hiện `REV = "136"`),
  **không liên quan** tới `versionCode`/`versionName` của Android manifest (tất cả apk đều
  `versionCode='2' versionName='1.1.0'`).
- **Không có git history cho Android:** repo chứa duy nhất code web. Các rev apk chỉ lưu
  dạng file build, không có commit → nội dung từng rev không thể truy xuất lại tự động.
- **Revision gaps:** không tồn tại file cho rev 9–14, 71–72, 93 (có thể bị dọn đi hoặc không build).
- **Donut STATS** (rev 110+) là module UI; nguồn dữ liệu là RPC cloud
  `fmms_get_expense_breakdown` (`supabase/migrations/0015_expense_breakdown.sql`).
