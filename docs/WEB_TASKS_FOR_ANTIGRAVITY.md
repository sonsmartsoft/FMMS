# YÊU CẦU PHẦN WEB — Gửi cho Antigravity

## Bối cảnh
App Android (Kotlin/Compose, package `com.fmms.carlogger`) đã hoàn thiện các tính năng: đọc OBD-II qua Bluetooth ELM327, dashboard realtime (tốc độ, RPM, nhiệt độ, điện áp hiển thị gauge vòng), fuel estimation, trip logging, odometer, GPS tracking mỗi 5s, chế độ GPS-only cho xe đạp (không cần OBD), song ngữ Anh–Việt, theme Dark/Light/System, sync dữ liệu lên Supabase qua hàng đợi cục bộ (`SyncWorker`, offline-first). Bước tiếp theo cần **hiển thị bản đồ trên web** và **đồng bộ vị trí GPS** từ Android lên web. Phần web chạy Next.js 14.2.25, đã deploy tại https://fmms.vercel.app/login, backend Supabase.

## Danh sách công việc cần làm ở phía web/backend

### 1. Tạo bảng `gps_track_points` trên Supabase (migration)
- Cột: `id uuid pk default gen_random_uuid()`, `trip_id uuid null references trips(id)`, `vehicle_id uuid references vehicles(id)`, `device_id uuid not null`, `device_name text null`, `lat double precision not null`, `lng double precision not null`, `speed_kmh real`, `recorded_at timestamptz not null default now()`.
- Index trên `(trip_id, recorded_at)`, `(vehicle_id, recorded_at)` và `(device_id, recorded_at)`.
- RLS: enable, policy `INSERT`/`SELECT` theo `vehicle_id → fleet → owner` (JWT).

### 2. Bảng `devices` (đảm bảo schema đúng)
- Cột: `id uuid pk` (= `device_id` do app sinh), `vehicle_id uuid fk vehicles`, `device_type` (`ELM327-BT` | `GPS-TRACKER`), `device_name text`, `mac_address text` (MAC Bluetooth của adapter; với GPS-only dùng chính `device_id`), `last_seen timestamptz`, `status`, `created_at`, `updated_at`.
- Policy cho phép app tự đăng ký/upsert device theo mac/device_id đã được phép.

### 3. Edge function / RPC `get_fleet_vehicles(device_id)`
- Nhận `{ device_id }`, xác thực quyền của device trong fleet của user, trả về danh sách xe được phép gán.

### 4. Edge function `POST /gps`
- Nhận batch điểm GPS từ Android (JSON array: `id, trip_id, vehicle_id, device_id, device_name, lat, lng, speed_kmh, recorded_at`), kiểm tra quyền sở hữu vehicle, insert batch.
- Batch mẫu mỗi 5 giây khi xe chạy.

### 5. Tab "MAP" trên web (trang user)
- Thêm tab bản đồ vào layout chính sau HOME/TRIPS/FUEL.
- Dùng Leaflet + OpenStreetMap (`react-leaflet`) — đã chốt không dùng Google Maps để tránh phí và key.
- Hiển thị vị trí xe theo **device** (marker + bong bóng `device_name`), vẽ route của trip đang chạy realtime, các trip đã lưu có thể chọn để replay route.

### 6. Replay trip trên web
- Khi user chọn 1 trip trong danh sách → fetch `gps_track_points` của trip đó → vẽ polyline route trên bản đồ kèm điều khiển play/pause.

### 7. Fleet live map (trang admin)
- Admin xem vị trí realtime tất cả xe/thiết bị trong fleet trên 1 bản đồ.
- Subscribe Supabase Realtime (postgres_changes) trên bảng `gps_track_points` để cập nhật live không cần refresh.
- Quản lý quan hệ device↔xe (đổi device sang xe khác khi cần).

### 8. Endpoint `GET /vehicles/:id/gps?from=&to=` (hoặc query trực tiếp qua Supabase client)
- Phục vụ web lấy điểm GPS theo khoảng thời gian/trip cho replay.

## Ghi chú contract (đã cố định, không thay đổi)
- Android gửi GPS dạng **JSON array batch**, mỗi mẫu tối đa 5s.
- Tên bảng/cột theo đúng spec trên (đã đóng băng để không ảnh hưởng bản phát triển iOS sau này).
- RLS phải bật; mọi thao tác ghi phải qua policy theo owner/fleet.

## BỔ SUNG (14/08/2026) — chế độ GPS-only cho xe đạp + quản lý thiết bị

App Android mới có 2 chế độ thiết bị, quản lý theo **tracker device**:

### 1. Chế độ thiết bị
- **`obd` (ô tô)**: telemetry qua ELM327 như trước.
- **`gps` (xe đạp, không OBD)**: app chỉ ghi GPS trackpoints mỗi 5s khi xe chạy, không có telemetry OBD.

### 2. `gps_track_points` — cần thêm 2 cột
- `device_id uuid not null` — định danh tracker (UUID cố định theo từng lần cài app, không phải MAC).
- `device_name text null` — tên user đặt (VD "Tracker xe đạp Uti"), gửi kèm để web map hiển thị tên.
- Index bổ sung trên `(device_id, recorded_at)`.
- Mỗi mẫu batch gửi kèm: `id, trip_id, vehicle_id, device_id, device_name, lat, lng, speed_kmh, recorded_at`.

### 3. Web map cần phân biệt the device
- Marker hiển thị `device_name` (bong bóng), không chỉ tên xe.
- Admin quản lý danh sách thiết bị: tên tracker → thuộc xe nào (`vehicle_id`) → online/offline → vị trí + tốc độ hiện tại + pin.
- Fleet live map subscribe Realtime theo `device_id`.

### 4. Trip ở chế độ GPS-only
- Trip chỉ có: khoảng cách (từ GPS), thời gian, tốc độ tối đa/trung bình. **Không có fuel/consumption** (không OBD).
- Web/fleet hiển thị bình thường, các ô nhiên liệu để trống.

### Ưu tiên (cập nhật)
1. Bảng + RLS + Edge Function (thêm `device_id`, `device_name`).
2. Tab MAP + live position theo device.
3. Replay trip.
4. Fleet admin map (theo device).

---

## BỔ SUNG (17/08/2026) — Quản lý tập trung: Web là nguồn sự thật (Cách B)

Quyết định: **tạo xe trên web trước → Android đồng bộ xe về → gán thiết bị vào `vehicle_id` chính thức**. App KHÔNG tự sinh xe nữa (chỉ dùng xe đã có trên web). Flow:

1. User tạo xe trên web (admin/user screen) → sinh `vehicle_id`.
2. Cài app Android → app tự tạo `device_id` (UUID ổn định, lưu local) + đọc MAC Bluetooth (nếu OBD).
3. App gọi edge function **`get_fleet_vehicles(device_id)`** → trả về danh sách xe thuộc fleet mà user/device được phép → app hiển thị để user **gán thiết bị vào 1 xe**.
4. App đăng ký thiết bị lên bảng `devices` (id = `device_id`, kèm `vehicle_id`, `device_name`, `mac_address`, `device_type` = `ELM327-BT` | `GPS-TRACKER`).
5. Mọi dữ liệu (GPS trackpoints, trips, telemetry) gửi kèm `vehicle_id` (từ assignment, không phải "xe active" tạm thời) + `device_id`.

### Yêu cầu phía backend/web (thêm cho Antigravity)
- **Edge function `POST /rest/v1/rpc/get_fleet_vehicles`** (hoặc RPC tương đương), body `{ device_id }`:
  - Xác thực quyền device (device đã đăng ký trong fleet của user, hoặc anon allow theo `devices`).
  - Trả về mảng: `id, fleet_id, license_plate, make, model, year, trim, engine, fuel_type, tank_capacity_liters, odometer_km`.
- **Bảng `devices`** (đảm bảo đúng schema): `id uuid pk` (= device_id), `vehicle_id uuid fk vehicles`, `device_type`, `device_name`, `mac_address text` (UUID AES khi GPS-only), `last_seen`, `status`, `created_at`, `updated_at`. Policy INSERT/UPSERT: device tự đăng ký theo mac/device_id đã cho phép.
- **RLS**: `devices`, `vehicles`, `gps_track_points`, `trips` đều theo **`vehicle_id` → fleet → owner** (JWT), không dựa trên tên xe.
- **Web admin**: quản lý quan hệ device↔xe (đổi device sang xe khác khi cần → app pull lại).

### Lưu ý cho Android
- `vehicle_id` của thiết bị là **assigned_vehicle_id** (lưu local), không phải xe đang chọn tạm thời → đổi "active" không làm đổi dữ liệu về xe nào.
- Nhiều thiết bị có thể gán cùng 1 xe (1 xe, nhiều tracker) → hợp nhất dữ liệu theo `vehicle_id`.
- App cần endpoint pull xe từ web (đã code, phụ thuộc RPC phía trên).