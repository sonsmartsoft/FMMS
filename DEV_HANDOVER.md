# FMMS — Handover đầy đủ (chuẩn bị cài lại Mac)

> File này gom toàn bộ thông tin liên quan dự án + lịch sử phát triển để khi cài lại máy
> không mất gì. **QUAN TRỌNG: sao lưu thư mục `/Users/uti/Documents/FMMS` trước khi xoá máy**
> (đĩa USB / iCloud / nguyên ổ). Đây là nơi duy nhất giữ: APK đã build, CHANGELOG, source.

---

## 1. Tổng quan dự án

- **Tên app Android:** FMMS — Car Logger (`com.fmms.carlogger`, versionName `1.1.0`, versionCode `2`).
- **Git repo:** `/Users/uti/Documents/FMMS` (branch `main`) — remote `origin`
  `git@github-sonsmartsoft:sonsmartsoft/FMMS.git`
  (dùng ssh key dạng `github-sonsmartsoft`, cấu hình ở `~/.ssh/config`).
- **Repo gồm 2 phần:**
  - `android/` — app Android (Kotlin + Jetpack Compose). Source có commit lên git.
  - `web/` — frontend web + script SQL/Supabase (git chỉ theo dõi web; APK **không** commit).
- **Phân công:** app Android do assistant lo (build APK, cài qua adb). DB/web/Antigravity
  (Supabase) thuộc user. Trả lời bằng tiếng Việt.
- **Backend:** Supabase project `opslebsdmwsnsyfmbynf.supabase.co`.

---

## 2. Build Android — setup & các đường dẫn quan trọng

- **Thư mục gradle:** `/Users/uti/Documents/FMMS/android/`
- **Android SDK:** `/Users/uti/Library/Android/sdk` (khai trong `android/local.properties`
  → `sdk.dir=/Users/uti/Library/Android/sdk`). Nếu cài lại Mac: cài Android Studio / commandline
  tools, tạo lại `local.properties`.
- **Gradle wrapper:** bản `gradle-8.14.5-bin.zip` (tự tải khi build).
- **APK đầu ra:** mặc định gradle xuất tại
  `android/app/build/outputs/apk/debug/app-debug.apk`, NHƯNG:
- **⚠️ QUAN TRỌNG — build dir đang bị override sang đường dẫn TẠM:**
  `app/build.gradle.kts` dòng 13-14:
  ```
  layout.buildDirectory.set(file("/var/folders/z9/l4ns5bmx58s_vbsrt6vpd34c0000gn/T/opencode/fmms-android-build/app"))
  ```
  Đây là temp profile của opencode, **sẽ bị xoá khi cài lại Mac**. Ngay sau khi cài lại máy:
  1. Khôi phục APK cũ về `releases/` (từ bản sao lưu).
  2. **Xoá 2 dòng override trên** để về mặc định `android/app/build`.
  3. Build, copy APK vào `android/releases/FMMS_revXXXX.apk` (đặt tên REV tiếp theo).
- **Lệnh build:** `cd android && ./gradlew :app:assembleDebug --offline`
  (thêm `--offline` để không cần mạng). Lỗi daemon lock: `./gradlew --stop` + `rm -rf .gradle/8.14.5/fileChanges`.
- **Supabase config cho app** ở `app/build.gradle.kts` buildConfigField:
  - `SUPABASE_URL = https://opslebsdmwsnsyfmbynf.supabase.co`
  - `SUPABASE_PUBLISHABLE_KEY = sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3`

---

## 3. Cài đặt & kiểm tra trên đầu xe (adb over WiFi)

- **Cơ chế:** adb không dây qua port `5555`, app chạy trên Android head-unit (trong xe).
- **Các đầu xe đã dùng:**
  - `192.168.1.95:5555` — đang dùng gần nhất (đã cài rev125, rev126).
  - `192.168.1.87:5555` — đã cài rev123, rev124 (OBD adapter KONNWEI BT `5C:F0:0A:05:A3:F7`).
  - `192.168.1.84:5555` — đã cài rev122.
  - `192.168.1.65:5555` — đầu cũ; **không kết nối được khi Mac ở mạng `172.16.43.x`** (subnet chẵn khác). Xe đổi IP thì hỏi user IP mới.
- **Lệnh:**
  ```
  adb connect 192.168.1.95:5555
  adb -s 192.168.1.95:5555 install -r android/releases/FMMS_rev126.apk
  adb -s 192.168.1.95:5555 shell am force-stop com.fmms.carlogger
  adb -s 192.168.1.95:5555 shell am start -n com.fmms.carlogger/.ui.MainActivity
  ```
  (Activity thật là `.ui.MainActivity`, không phải `.MainActivity`.)
- Nếu `adb devices` báo device offline: `adb disconnect <ip>:5555` → `adb connect` lại.
- Xe tắt máy → device offline. Không ping/ghép được => chờ user bật máy.

---

## 4. Danh sách APK đã phát hành (releases/)

Thư mục: `/Users/uti/Documents/FMMS/android/releases/` (+ `CHANGELOG_ANDROID.md` — log chi tiết từng rev).

| Rev | SHA-256 (16 ký tự đầu) | Nội dung chính |
|---|---|---|
| rev120 | `52f0a315f91a40b4` | trước phiên này |
| rev121 | `7af0c84ddc7869cd` | DTC scan màn Diagnostics + sync cloud |
| rev122 | `f33337e8bb6e1274` | FIX: tiêu đề "Chẩn đoán mã lỗi (DTC)" bị đen trên dark mode → thêm `color = colors.textPrimary` (DiagnosticsScreen.kt:55) |
| rev123 | `79de2dbee618cd8b` | FIX: engine load/mọi PID bị N/A → sửa mask trong `PidDefinitions.kt` (`7 - bit` → `8 - bit`, chuẩn J1979) |
| rev124 | `4e4996d0d379829e` | MỞ RỘNG: đọc TẤT CẢ PID đang poll (bỏ lọc supportedPids — `known` = `PidDefinitions.all()`, ELM327ProtocolManager.kt) |
| rev125 | `60779a7639d62c79` | KPI panel: thay ô **RPM** bằng **THROTTLE** (SpeedometerScreen.kt; thêm `throttleLbl` i18n EN/VI) |
| rev126 | `ead52346c185665b` | **Màn LIVE DATA**: mỗi hàng 3 cột EN · VI + ý nghĩa · giá trị (MoreScreen.kt) — bản mới nhất |

### Lịch sử lỗi kỹ thuật quan trọng (đã sửa)

1. **Tiêu đề DTC đen trên dark mode** (rev122): `Text(...)` không chỉ `color` → mặc định `LocalContentColor` = đen dù darkColorScheme.onBackground trắng. Quy tắc: mọi `Text` phải chỉ màu từ `FmmsColors` (theme-aware), không hardcode đen/trắng.
2. **Engine load + nhiều giá trị N/A** (rev123): công thức parse bit trong discovery mask lệch 1 (byte A MSB = PID $01 theo J1979, không phải $00). Các giá trị bị đọc lệch PID → adapter báo NO DATA. Fix: `base + byteIndex*8 + (8 - bit)`.
3. **Sau rev124 trên xe thật:** rpm/speed/load(32.9%)/throttle(12.9%)/fuel(83.1%)/battery(~13.3V)/runtime(~2918s) đọc OK. **Đáng lưu ý MAZDA (Skyactiv) dùng MAP, không chắc có MAF** — nếu MAF vẫn N/A = có thể xe không hỗ trợ, không phải lỗi app.

---

## 5. Quy tắc AN TOÀN (bắt buộc, đã 2 lần gây sự cố)

- **⚠️ Đèn pha nháy** từng xảy ra do dùng `ATMA`/`AT H1` (sniff CAN đọc số hộp số từ frame thô ID `228`/`131`). Log chi tiết ở đầu `CHANGELOG_ANDROID.md`.
- **Từ nay KHÔNG dùng** `ATMA`, `AT H1`, `AT S1`, CAN thô, hay UDS write trong tính năng mới. Chỉ OBD Mode read-only chuẩn: `01/03/07/0A`.
- Mọi giao dịch với adapter ELM327 giữ chung `transactionMutex.withLock { ... }` để không xung đột.
- Sniff hộp số (`TelemetryEngine.sniffCanGearOnce`) chỉ chạy khi xe đứng yên `<3 km/h`.

---

## 6. File code quan trọng (đường dẫn tương đối từ `/Users/uti/Documents/FMMS/android/`)

- `app/src/main/java/com/fmms/carlogger/ui/dashboard/SpeedometerScreen.kt` — gauge analog + panel KPI + mini gauge (tap để đổi metric: RPM/COOLANT/FUEL/VOLTAGE/LOAD).
- `app/src/main/java/com/fmms/carlogger/ui/more/MoreScreen.kt` — màn LIVE DATA (LiveDataScreen, 3 cột EN·VI·ý nghĩa), DIAGNOSTICS (log in-memory), CLOUD (queue).
- `app/src/main/java/com/fmms/carlogger/ui/diagnostics/DiagnosticsScreen.kt` — DTC scan.
- `app/src/main/java/com/fmms/carlogger/core/obd/PidDefinitions.kt` — định nghĩa PID + mask J1979.
- `app/src/main/java/com/fmms/carlogger/core/obd/ELM327ProtocolManager.kt` — protocol ELM327, `readPid` filter (dòng ~167-177), `known`.
- `app/src/main/java/com/fmms/carlogger/domain/engine/TelemetryEngine.kt` — engine telemetry + sniff hộp số.
- `app/src/main/java/com/fmms/carlogger/service/TelemetryService.kt` — vòng OBD ~2.5s, `persistSample`, push cloud ~20s/lần.
- `app/src/main/java/com/fmms/carlogger/data/repository/SyncQueueRepository.kt` — queue đồng bộ cloud.
- `app/src/main/java/com/fmms/carlogger/ui/i18n/Strings.kt` — chuỗi EN/VI.
- `app/src/main/java/com/fmms/carlogger/AppContainer.kt` — DI; `onLog → diagLog.logRaw` (log OBD chỉ lưu in-memory, xem ở More → Diagnostics).

## 7. Cơ chế đồng bộ lên web (đã hoạt động)

- `TelemetryService.persistSample()` gói **đầy đủ** giá trị OBD + GPS vào 1 mẫu (rpm, speed, load, coolant, intake, MAF, throttle, fuel, fuelRate, battery, runtime, STFT, LTFT, odometer, lat/lng, gps speed/accuracy, data quality…).
- Cứ ~20s push 1 mẫu qua `POST /rest/v1/telemetry_samples` (Prefer `resolution=merge-duplicates`), chờ khi lỗi mạng → SyncWorker đẩy lại; thành công mới xoá queue.
- Bảng web: `telemetry_samples`, `gps_track_points`, `trips`, `vehicle_diagnostic_scans`, `vehicle_dtc_logs`, `obd_dtc_dictionary`.
- View DB: pull qua adb (`run-as com.fmms.carlogger` + copy `/data/data/com.fmms.carlogger/databases/` ra `/tmp`).

---

## 8. Việc cần làm SAU KHI cài lại Mac (checklist)

- [ ] Cấu hình ssh key `github-sonsmartsoft` trong `~/.ssh/config` và khôi phục `id_ed25519_sonsmartsoft`.
- [ ] Clone repo: `git clone git@github-sonsmartsoft:sonsmartsoft/FMMS.git`.
- [ ] Cài đặt Web: `cd FMMS/web && npm install` (chạy `npm run dev` để test).
- [ ] Cài đặt Android SDK (`/Users/uti/Library/Android/sdk`) / Android Studio Ladybug; tạo `android/local.properties` (`sdk.dir=/Users/uti/Library/Android/sdk`).
- [ ] **Xoá override build dir** trong `app/build.gradle.kts` (dòng 13-14) nếu cần về mặc định.
- [ ] Build Android APK: `cd android && ./gradlew :app:assembleRelease` (hoặc `assembleDebug`).

---

## 9. Trạng thái hệ thống hiện tại (07/09/2026)

- **Android App:** Bản mới nhất **rev126** đã build và cài đặt thành công trên xe (`192.168.1.95:5555`). Toàn bộ mã nguồn Android đã được commit sạch lên branch `main`.
- **Database Supabase Live (`opslebsdmwsnsyfmbynf`):**
  - **Odometer xe Mazda 2AT:** Đã chuẩn hóa chính xác **3.030 km** (`assets.current_odometer_km = 3030`).
  - **Chuỗi chuyến đi:** Đầy đủ **98 chuyến** (1 Showroom + 64 Excel + 33 OBD), tổng quãng đường đúng $3.030,00\text{ km}$.
  - **Trigger ODO tự động (`0021_smart_odometer_trigger.sql`):** Tự động cập nhật ODO xe theo `MAX(end_odometer)` mỗi khi có chuyến đi mới, chống lệch/chống cộng lặp.
  - **Đồng bộ Đổ xăng (`FIX_FUEL_LOGS_SYNC_AND_SCHEMA.sql`):** Bổ sung 7 cột OBD + RLS mở cho `anon` + trigger tự động ghi nhận vào `expenses`.
- **Web App (Vercel):** Đang chạy ổn định tại [fmms.vercel.app](https://fmms.vercel.app), hỗ trợ bộ lọc năm động (All / 2024 / 2025 / 2026 / 2027) và biểu đồ tài chính.