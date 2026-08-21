# FMMS — BÁO CÁO LỊCH SỬ PHÁT TRIỂN DỰ ÁN

> **Mục đích:** Tài liệu bàn giao (handoff) — giúp AI/kỹ sư mới đọc hiểu toàn bộ dự án,
> các quyết định kỹ thuật, lỗi đã gặp và cách xử lý mà không cần đào lại git history.
>
> **Cập nhật lần cuối:** 2026-08-21 (sau commit `a221b7d`, APK rev28)

---

## 1. TỔNG QUAN DỰ ÁN

**FMMS (Family Mobility Management System)** — hệ thống quản lý phương tiện gia đình / đội xe:

| Thành phần | Công nghệ | Deploy |
|---|---|---|
| **Web app** | Next.js (App Router) + TypeScript + Tailwind CSS | Vercel |
| **Android app** | Kotlin + Jetpack Compose + Room | APK sideload (không lên Play Store) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage) | Supabase Free tier |

**Chức năng chính:**
- Quản lý xe (asset), giấy tờ/đăng kiểm/bảo hiểm, bảo hành, bảo dưỡng, chi phí nhiên liệu
- GPS tracking realtime từ điện thoại Android trong xe (background service) + tracker device ngoài
- Bản đồ live map + trip replay
- Thống kê hành trình/ngày (daily summaries), lịch âm Việt Nam
- Đọc OBD-II qua ELM327 Bluetooth (RPM, tốc độ, nhiệt độ nước, mức xăng, điện áp...)
- Phân quyền user (admin/member), quản lý user

---

## 2. HẠ TẦNG & TRUY CẬP

### 2.1. Supabase
- **Project ref:** `opslebsdmwsnsyfmbynf` → `https://opslebsdmwsnsyfmbynf.supabase.co`
- **Anon key (publishable):** `sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3`
- Service role key: nằm trong Vercel env vars / `.env` (KHÔNG commit — `.env` đã bị remove khỏi git ở commit `ecb208e`)
- pg_cron + pg_net đã bật (schema `extensions.cron`)

### 2.2. Git / GitHub
- **Repo:** `sonsmartsoft/FMMS` (branch `main`)
- **Remote SSH alias:** `git@github-sonsmartsoft:sonsmartsoft/FMMS.git`
  - Cấu hình trong `~/.ssh/config`: `Host github-sonsmartsoft` → `HostName github.com`, `User git`, `IdentityFile ~/.ssh/id_ed25519_sonsmartsoft`
  - ⚠️ Account GitHub chính là **Sondtk5**; account **sonsmartsoft** là owner repo, Sondtk5 được thêm làm **collaborator** (đây là lý do push bị denied ban đầu — xem mục 7.1)
- Khi chuyển máy mới: cần copy `~/.ssh/id_ed25519_sonsmartsoft` + entry `github-sonsmartsoft` trong `~/.ssh/config`

### 2.3. Vercel
- Web deploy tự động từ repo (root = thư mục `web/`)
- Env vars cấu hình trên dashboard Vercel (Supabase URL/keys)

---

## 3. CẤU TRÚC THƯ MỤC

```
FMMS/
├── FamilyMobilityManagement_Implementation_Specification_FINAL_v5.2.md   # Spec gốc v5.2
├── implementation_plan.md
├── README.md
├── docs/                          # Audit, handoff QA, task list web
│   ├── AUDIT_FMMS_V5.5_2026-08-17.md
│   ├── HANDOFF_QA_Antigravity_2026-08-16.md
│   └── WEB_TASKS_FOR_ANTIGRAVITY.md
├── history/                       # ← Thư mục này (báo cáo lịch sử)
├── supabase/
│   └── migrations/                # 0001 → 0008 (chạy thủ công qua SQL Editor)
├── web/                           # Next.js app (deploy root trên Vercel)
│   ├── app/                       # ai-center, analytics, api, documents, finance,
│   │                              # fuel, login, maintenance, map, settings, warranties...
│   ├── components/, lib/, types/
│   └── middleware.ts              # Auth guard
└── android/                       # Android app (Kotlin + Compose)
    ├── releases/                  # ← Nơi lưu APK để commit lên git (QUY ƯỚC!)
    │   ├── FMMS_v1.0.0_rev3..7.apk
    │   └── FMMS_rev20..28.apk
    └── app/src/main/java/com/fmms/carlogger/
        ├── AppContainer.kt        # DI container (repos, DB, managers)
        ├── MainActivity.kt
        ├── core/
        │   ├── database/          # Room: dao/ + entity/
        │   ├── gps/               # LocationManager wrapper
        │   ├── obd/               # ELM327: transport BLE/classic, protocol manager, PID defs
        │   └── odometer/
        ├── data/repository/       # VehicleRepository, SyncQueueRepository...
        ├── domain/engine/         # TripEngine (phát hiện/kết thúc chuyến đi)
        ├── service/TelemetryService.kt  # Foreground service GPS+OBD
        ├── ui/                    # dashboard, trips, fuel, stats, lunar, more, theme, i18n
        └── util/LunarCalendar.kt  # Âm lịch VN (thuật toán Hồ Ngọc Đức)
```

---

## 4. DATABASE (SUPABASE POSTGRES)

### 4.1. Danh sách migrations (chạy THỦ CÔNG qua SQL Editor, không có CLI pipeline)

| File | Nội dung |
|---|---|
| `0001_initial_schema.sql` | Bảng gốc: vehicles/assets, trips, fuel_logs, maintenance, documents, warranties, users/profiles, **daily_summaries** (id UUID PK, asset_id, **date DATE**, distance_km, fuel_used_liters, average_consumption_l100km, fuel_cost, cost_per_km, average_speed_kmh, **trip_count INTEGER**, UNIQUE(asset_id, date)) |
| `0002_indexes.sql` | Index hiệu năng |
| `0003_rls_policies.sql` | RLS mọi bảng; policy "Owners can view daily summaries" cho owner đọc |
| `0004_functions_triggers.sql` | Hàm/trigger nghiệp vụ |
| `0005_seed_initial_data.sql` | Data mẫu ban đầu |
| `0006_gps_track_points.sql` | Bảng `gps_track_points` (vehicle_id, lat, lng, speed, recorded_at...) |
| `0007_fleet_vehicles_rpc_and_devices.sql` | RPC fleet vehicles (Cách B sync) + bảng devices (tracker) |
| `0008_daily_summaries_and_retention.sql` | ALTER daily_summaries thêm cột + pg_cron retention (chi tiết dưới) |

### 4.2. Migration 0008 — Daily Summaries + Retention (QUAN TRỌNG)

**Bối cảnh:** Bảng `daily_summaries` ĐÃ TỒN TẠI từ 0001 với cột `date`/`trip_count`.
Bản 0008 đầu tiên sai (CREATE TABLE với cột `day`/`trips_count`) → lỗi `42703 column "day" does not exist`.
Bản cuối chỉ ALTER thêm cột:

```sql
ALTER TABLE public.daily_summaries
    ADD COLUMN IF NOT EXISTS device_id UUID NOT NULL DEFAULT '00000000-...000',
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_speed_kmh NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS track_points INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON public.daily_summaries (date DESC);
GRANT SELECT ON public.daily_summaries TO authenticated, service_role;
```

**2 cron jobs (ĐÃ ĐĂNG KÝ thành công trên live, jobid 1 & 2):**

1. **`daily-trip-summary`** — `30 0 * * *` (00:30 UTC): gộp trips HÔM QUA vào daily_summaries
   - Group by `(asset_id, (COALESCE(end_time,start_time) AT TIME ZONE 'UTC')::date)`
   - `ON CONFLICT (asset_id, date) DO UPDATE` — upsert an toàn
2. **`gps-daily-count-purge`** — `35 0 * * *` (00:35 UTC):
   - a) Đếm track points hôm qua → `track_points` (kể cả ngày không có trip)
   - b) DELETE `gps_track_points` cũ hơn **30 ngày**
   - c) DELETE trips COMPLETED cũ hơn **90 ngày**
   - Job summary chạy TRƯỚC job purge để không mất dữ liệu

⚠️ **Lưu ý cho AI kế nhiệm:** cron chỉ aggregate "hôm qua". Nếu cần rebuild lịch sử,
dùng chính SQL trong cron body nhưng bỏ mốc thời gian (đã từng chạy full rebuild ngày 2026-08-21).

### 4.3. Bảng trips (cột liên quan GPS/trip engine)
`id UUID PK, asset_id, start_time, end_time, distance_km DOUBLE, duration_seconds INTEGER,
max_speed_kmh, average_speed_kmh, status ('RECORDING'/'COMPLETED'), ...`

---

## 5. WEB APP (NEXT.JS — VERCEL)

Các trang đã hoàn thiện (theo Spec v5.2/v5.5):
- **Auth:** `/login`, middleware guard, auth callback có env fallback (commit `951a2ce`)
- **Assets/documents/maintenance/fuel/warranties/analytics/map/settings/users/master-data**
- Light/dark theme đồng bộ; modal pattern: flex layout + scrollable body + sticky footer
  (fix triệt để lỗi button bị cắt — commit `eb5c35e`)
- Centralized Fleet Vehicle Sync "Cách B" + Device Assignment admin (`84b7d2b`)
- GPS Live Map + Trip Replay + Tracker Device Management (`d120470`)
- Master Data CRUD cho danh mục dịch vụ bảo dưỡng/giá (`874b49c`, `1065520`)

Chi tiết web task còn dở: xem `docs/WEB_TASKS_FOR_ANTIGRAVITY.md` và audit v5.5.

---

## 6. ANDROID APP

### 6.1. Kiến trúc
- **Room DB local** (offline-first) → SyncQueue đẩy lên Supabase khi có mạng
- **TelemetryService**: foreground service thu GPS (+OBD nếu nối) mỗi giây
- **TripEngine**: tự phát hiện chuyến đi (start khi di chuyển, end khi dừng), ghi bảng trips
- **AppContainer**: DI thủ công (không dùng Hilt/Koin)
- UI: Jetpack Compose, dark theme công nghệ (cyan/amber accents), i18n VI

### 6.2. Module OBD (`core/obd/`)
- `OBDTransport` interface: `BluetoothClassicTransport` (SPP — đang dùng) + `BluetoothBleTransport` (có sẵn, CHƯA wire vào manager)
- `ELM327ProtocolManager`: init ATZ/ATE0/ATL0/ATS0/ATH0 → thử chuỗi protocol:
  **ATSP6 (ISO15765-4 CAN 11-bit 500k — ƯU TIÊN MẶC ĐỊNH, đúng xe của user)**
  → ATSP0 (auto) → ATSP7/8/9. Chọn protocol đọc được nhiều PID quan trọng nhất
  (RPM/SPEED/COOLANT/FUEL_LEVEL); break khi ≥3 critical PIDs OK.
- `PidDefinitions`: CMD_RPM `010C`, CMD_SPEED `010D`, CMD_FUEL_LEVEL `012F`,
  CMD_COOLANT `0105`, CMD_VOLTAGE AT-command, DISCOVERY_PIDS (0100/0120/0140...), discoverSupported()
- `OBDConnectionManager`: quản lý MAC adapter (PREF_OBD_MAC), liveness probe

### 6.3. UI Dashboard
- Speedometer: vòng chia 0–220 km/h, **số vẽ dọc theo vòng cung** (nativeCanvas, labelRadius = tickOuter − 27dp, góc 135° + 270°×frac)
- DateClockCard: GIỜ realtime (HH:mm:ss, delay 1s) + DƯƠNG LỊCH (dd/MM/yyyy + thứ tiếng Việt) + ÂM LỊCH (ngày/tháng/năm Can-Chi, màu amber)
- `util/LunarCalendar.kt`: thuật toán âm lịch Hồ Ngọc Đức + helpers `canChiYear()`,
  `lunarDayLabel()` (Mùng 1/Mồng X/Rằm), `lunarMonthLabel()` (tháng Giêng..., nhuận), `fullLunarLabel()`, `weekdayVi()`

### 6.4. Màn Lịch (ui/lunar/LunarCalendarScreen.kt)
- Ô ngày click được (viền cyan khi chọn); thẻ chi tiết ngày hiển thị **TỪNG XE MỘT HÀNG**
  (`VehicleDayStats`: vehicleId, vehicleName, tripCount, distanceKm, durationSeconds, maxSpeedKmh)
- Data: `VehicleRepository.getAll()` × `TripDao.getBetween(vehicleId, from, to)` — bỏ xe không có chuyến
- Tên xe fallback: `name.ifBlank { licensePlate.ifBlank { "Xe ${id.take(6)}" } }`

---

## 7. CÁC LỖI LỚN ĐÃ GẶP & CÁCH XỬ LÝ (KINH NGHIỆM QUAN TRỌNG)

### 7.1. Push GitHub bị denied
- **Hiện tượng:** `Permission denied` khi push bằng key `id_ed25519_sonsmartsoft`
- **Nguyên nhân:** account GitHub thực tế là **Sondtk5**, chưa có quyền write vào repo `sonsmartsoft/FMMS`
- **Xử lý:** Thêm Sondtk5 làm collaborator trên GitHub → push OK qua alias `github-sonsmartsoft`

### 7.2. Migration 0008 lỗi `42703 column "day" does not exist`
- **Nguyên nhân:** viết CREATE TABLE mới trong khi bảng `daily_summaries` đã tồn tại từ 0001
  với tên cột khác (`date`/`trip_count`, không phải `day`/`trips_count`)
- **Bài học:** LUÔN check schema bảng có sẵn trước khi viết migration; dùng ALTER + IF NOT EXISTS
- **Xử lý:** viết lại 0008 dạng ALTER-based (xem mục 4.2). Validate migration trên PostgreSQL
  local với stub (`auth.uid()`, `is_asset_owner()`, `cron.schedule` EXECUTE lệnh thật) trước khi đưa user chạy

### 7.3. Bug `duration_seconds` ×1000 (NGHIÊM TRỌNG — đã fix cả code lẫn data)
- **Hiện tượng:** daily_summaries 2026-08-19 có duration_seconds = 11.516.388 (~133 ngày!)
- **Nguyên nhân:** `TripEngine.kt` lưu milliseconds vào cột seconds:
  `startTime = System.currentTimeMillis()` (epoch millis), `elapsed = now - startTime` gán thẳng
  vào `durationSeconds` và dùng tính avgSpeed (sai 1000×)
- **Fix code (rev26, commit `c9badd1`):**
  - `val elapsed = (now - startTime) / 1000`
  - closeActiveTrip: `durationSeconds = (now - startTime) / 1000`, avgSpeed dùng `elapsedSeconds`
- **Fix data (SQL đã CHẠY THÀNH CÔNG trên live 2026-08-21):**
  ```sql
  UPDATE public.trips
  SET duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER
  WHERE status <> 'RECORDING' AND end_time IS NOT NULL AND duration_seconds > 100000;
  ```
  Sau đó DELETE FROM daily_summaries + re-aggregate toàn bộ lịch sử (dùng body cron, bỏ mốc thời gian).
  Kết quả verify: 08-19 = 13.314s (11353+161+1800) ✓
- **Bài học:** ngưỡng phát hiện bất thường >100.000s (~27.8h) là an toàn cho trip thật

### 7.4. OBD không kết nối được thiết bị mới
- **Nguyên nhân:** code cũ chỉ gửi `ATSP0` (auto-detect); adapter của user cần force protocol
- **Thông tin thiết bị/xe:** VIN `MM7DL2SAAVW949603`, MAX OBD app đọc được với protocol
  **ISO15765-4 CAN (11-bit ID, 500 Kbaud)** = lệnh ELM327 `ATSP6`
- **Xử lý (rev28, commit `a221b7d`):** chuỗi fallback ATSP6 → ATSP0 → ATSP7/8/9,
  chấm điểm bằng số critical PIDs đọc được. ⚠️ CHƯA test thực tế — user đang cài rev28
- **Nếu vẫn fail:** xem xét wire `BluetoothBleTransport` vào OBDConnectionManager (nghi vấn adapter BLE)

### 7.5. Lỗi compile Kotlin đã xử lý (tham khảo nhanh)
- `nativeCanvas` cần import riêng (`androidx.compose.ui.graphics.nativeCanvas`) + `toArgb()`
- `Calendar.set(y, m, d, h, min, s, ms)` 7 tham số KHÔNG tồn tại → set 6 tham số + `set(MILLISECOND, 0)`
- `return` expression required trong fun block body → thêm `return` tường minh
- VehicleEntity: `name` và `licensePlate` đều **non-null String** (dùng ifBlank, không dùng ?:)

### 7.6. Lỗi build transient
- `PackageAndroidArtifact$IncrementalSplitterRunnable IOException: Operation timed out`
  → chỉ cần chạy lại gradle là pass (đã gặp 2026-08-21)

---

## 8. QUY TRÌNH BUILD & RELEASE ANDROID (QUY ƯỚC BẮT BUỘC)

```bash
# Build (trong thư mục android/)
cd /Users/uti/Documents/FMMS/android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug -q

# Verify chữ ký debug
~/Library/Android/sdk/build-tools/36.0.0/apksigner verify \
  app/build/outputs/apk/debug/app-debug.apk

# Copy APK vào releases/ ĐỂ COMMIT LÊN GIT (user yêu cầu rõ ràng — KHÔNG lưu ~/Downloads nữa)
cp app/build/outputs/apk/debug/app-debug.apk android/releases/FMMS_revNN.apk
```

- Version naming: `FMMS_revNN.apk` (hiện tại tới **rev28**)
- Debug keystore ký mặc định; user sideload trực tiếp
- ⚠️ Trước đây APK lưu ra `~/Downloads/` (rev20–27) — từ rev28 trở đi PHẢI vào `android/releases/`

---

## 9. LỊCH SỬ COMMIT THEO GIAI ĐOẠN (tóm tắt git log)

**Giai đoạn 1 — Web foundation (0b10022 → cb1cfd6):**
Tailwind/TS deps fix Vercel build, light/dark mode, asset detail tabs, wire web lên Supabase thật + sample importer, stop tracking .env

**Giai đoạn 2 — Web features v5.2 (3bd8f31 → e29f257):**
Warranty tables, user profile MS365-style, user management + reset password + role toggle, modal z-index fixes (nhiều round), odometer adjustments, multi-service maintenance, master data CRUD, fleet vehicle sync Cách B + device assignment

**Giai đoạn 3 — GPS/Tracking (d120470):**
GPS tracking, live map, trip replay, tracker device management

**Giai đoạn 4 — Retention + Android fixes (ad8aa37 → a221b7d):**
- `ad8aa37` migration 0008 bản đầu (lỗi cột)
- `30f4c2a` sửa 0008 theo bảng có sẵn (date/trip_count)
- `c9badd1` fix TripEngine millis→giây (rev26)
- `0bd76f3` lịch click ngày + số trên vòng speedo + đồng hồ dashboard (rev27)
- `a221b7d` per-vehicle calendar detail + OBD ATSP6 priority (rev28)

---

## 10. TRẠNG THÁI HIỆN TẠI & VIỆC CẦN LÀM TIẾP

### Đã hoàn tất (verified trên live)
- ✅ Migration 0008 deploy: cột mới + index + GRANT + 2 cron jobs đăng ký (jobid 1, 2)
- ✅ Backfill + rebuild daily_summaries sau khi fix trips ×1000 (data sạch, verified 2026-08-21)
- ✅ Android rev28 build + push code

### Đang chờ test / TODO
1. ⏳ **User cài rev28 test OBD** với adapter mới (VIN MM7DL2SAAVW949603).
   Nếu fail → wire BLE transport, hoặc log chi tiết AT-responses để chẩn đoán
2. ⏳ Cron jobs mới đăng ký hôm nay — chưa qua 1 đêm chạy thật; sáng mai check
   `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. 📋 Web: các task còn dở liệt kê trong `docs/WEB_TASKS_FOR_ANTIGRAVITY.md` + audit v5.5
4. 💡 Ý tưởng chưa làm: BLE OBD, export báo cáo, notification bảo dưỡng...

---

## 11. GHI CHÚ CHO AI KẾ NHIỆM

1. **Ngôn ngữ giao tiếp với user:** tiếng Việt. User là người vận hành, không phải dev —
   giải thích rõ, đưa SQL/block code hoàn chỉnh kèm hướng dẫn chạy (Supabase SQL Editor)
2. **Migration Supabase chạy THỦ CÔNG** qua SQL Editor — luôn validate trên Postgres local
   (stub auth/cron) trước khi đưa user
3. **APK output → `android/releases/`** rồi commit (quy ước mục 8)
4. **Không commit secrets** (.env đã remove khỏi tracking)
5. Repo làm việc: `/Users/uti/Documents/FMMS` — KHÔNG dùng temp clone trong /var/folders
6. Khi sửa Android: build xong phải `apksigner verify` trước khi giao user
7. Schema DB: ưu tiên đọc `supabase/migrations/0001_initial_schema.sql` để biết shape bảng gốc
   (nhiều bảng có sẵn từ đầu, đừng CREATE lại)
