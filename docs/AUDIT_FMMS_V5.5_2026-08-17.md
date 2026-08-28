# FMMS V5.5 AUDIT

- Ngày: 2026-08-17
- Phạm vi: toàn bộ project (web/, android/, supabase/) + spec V5.2 (file spec cao nhất hiện có)
- Phương pháp: đọc source, gọi REST Supabase thật (project `opslebsdmwsnsyfmbynf`), kiểm tra từng CRUD,
  từng button có thực sự gọi DB, scan hardcode/mock/TODO.

> Lưu ý chung: web app đã được nối Supabase thật ở `0cf68e5`. Phần lớn button Add/Edit được nối service.
> Nhưng nhiều tính năng trong spec là **UI-only**, **persist = 0**, và có **auth bypass nghiêm trọng**.

---

## 🟢 COMPLETE

| # | Chức năng | Ghi chú |
|---|-----------|---------|
| 1 | Login email/password (Supabase Auth) | `web/app/login/page.tsx` real |
| 2 | Magic Link đăng nhập | `signInWithOtp` real |
| 3 | Add Asset | `HomePage.tsx:80-107` → `assetService.createAsset` real insert |
| 4 | Asset list / Dashboard đọc Supabase | `HomePage.tsx:54-60` real |
| 5 | Asset Detail đọc real + Realtime telemetry | `[id]/page.tsx:106-191` |
| 6 | Edit Asset (master, không full) | `[id]/page.tsx:385-411` → `updateAsset` |
| 7 | Add Fuel log | `fuel/page.tsx:51-71` real |
| 8 | Add Maintenance | `maintenance/page.tsx:65-88` real |
| 9 | Expense CRUD đầy đủ (add/edit/delete) | `finance/page.tsx:108-141` real |
| 10 | Add Trip / Part / Insurance / Claim / Odometer adjust | `[id]/page.tsx` các handler real |
| 11 | Record loan payment + cập nhật balance | `finance/page.tsx:143-168` real |
| 12 | Odometer adjustment ghi bảng + cập nhật asset | `odometerService.ts` real |
| 13 | Warranty tables tồn tại (warranties, warranty_claims) | DB REST trả `[]` (bảng có, RLS chặn) |
| 14 | RLS enabled cho ~27 bảng chính | migration 0003 |
| 15 | System Health: DB/Auth/AI là real check có latency | `settings/health/page.tsx:41-93` |
| 16 | AI chat route có gateway C2A + Gemini fallback + context Supabase | `api/ai/chat/route.ts:15-171` |
| 17 | Android: OBD thật (ELM327 Bluetooth), không giả lập dữ liệu | `android/.../ELM327ProtocolManager.kt`, `TelemetryEngine.kt` |
| 18 | Android: offline Room + sync queue trips/vehicles | `SyncQueueRepository.kt`, `SyncWorker.kt` |
| 19 | Android compile được (APK debug tồn tại) | `app/build/outputs/apk/debug/app-debug.apk` |
| 20 | Document create + list | `documentService` real |
| 21 | Logout hiện có | `Navbar.tsx:34-41` |

---

## 🟡 PARTIAL

| # | Chức năng | Hiện trạng | Thiếu | File/route | DB table | Fix đề xuất |
|---|-----------|-----------|--------|-----------|----------|-------------|
| P-1 | **Dashboard card fields** | Card render `fuel_level_percent`, `avg_consumption_l100km`, `next_maintenance_due`... nhưng DB `assets` **không có các cột này** (REST trả `42703`) và `mapAssetRow` (assetService.ts:37-65) cũng drop chúng → luôn `—`/N/A | Cột DB + mapping | `lib/services/assetService.ts`, `components/dashboard/AssetCard.tsx` | `assets` | Thêm cột vào schema + mapper |
| P-2 | **Dashboard Settings không persist** | `DisplaySettingsModal` lưu vào React state ClientShell (không truyền xuống page nào), `HomePage` card-config cũng local state | Không lưu DB/localStorage | `components/dashboard/DisplaySettingsModal.tsx:38-49`, `components/home/HomePage.tsx:466-472` | `dashboard_settings` (tồn tại, PK=user_id, nhưng query `select=id` lỗi `42703`) | Viết service đọc/ghi `dashboard_settings`, truyền settings xuống HomePage |
| P-3 | **Assets page "Thêm phương tiện" là nút chết** | Button `app/assets/page.tsx:63-69` **không có onClick** | Không mở form, không CRUD | `app/assets/page.tsx:63-69` | `assets` | Gắn handler → mở modal/redirect đến HomePage add |
| P-4 | **Warranty: chỉ create claim, không add bảo hành standalone** | `[id]/page.tsx:993` nút "Thêm bảo hành" chỉ `setOpenModal('warranty')` — modal không có submit → không insert được `warranties` | Form + submit gọi `createWarranty` | `app/assets/[id]/page.tsx:993`, `lib/services/warrantyService.ts:39` | `warranties` | Hoàn thiện modal warranty |
| P-5 | **Maintenance multi-service là UI-only** | `addServiceItem/removeServiceItem` chỉ sửa state local; ghi 1 record với notes nối chuỗi | Bảng `maintenance_orders`+`maintenance_order_items` không tồn tại (REST `PGRST205`) | `app/maintenance/page.tsx:53-88` | `maintenance_orders`, `maintenance_order_items` | Tạo bảng + ghi từng line item |
| P-6 | **Finance: loan chỉ hiển thị loan đầu tiên** | `finance/page.tsx:78,88` chỉ lấy `l[0]`; schedule tính client-side `generateLoanSchedule:25-51` (không hardcode 60 kỳ — lấy từ `term_months`, OK) | Không add/edit/delete loan qua UI; schedule không lưu `loan_payments` đến khi thanh toán | `app/finance/page.tsx` | `loans`, `loan_payments` | Thêm UI quản lý loan (create/edit/delete) |
| P-7 | **Documents: không upload file** | `documents/page.tsx:84` `storage_path: docForm.storage_path || 'documents/file.pdf'` — không có file input | Upload thật + preview + replace | `app/documents/page.tsx`, `lib/services/documentService.ts` | `asset_documents`, Supabase Storage | Dùng Storage bucket |
| P-8 | **Analytics: tính client-side, hardcode năm 2026** | `analytics/page.tsx:67` `startsWith("2026-")`; KHÔNG dùng `analyticsService` (bảng `monthly_summaries`/`daily_summaries` tồn tại nhưng service interface sai tên cột: `total_distance_km` vs DB `distance_km`) | Dùng real summaries + filter day/month/year + select vehicle | `app/analytics/page.tsx`, `lib/services/analyticsService.ts` | `monthly_summaries`, `daily_summaries` | Sửa service cột, dùng summary, bỏ hardcode năm |
| P-9 | **AI Settings lưu localStorage, không persist server** | `settings/ai/page.tsx:123-125` chỉ `localStorage.setItem('fmms_ai_config')`; route đọc `process.env.C2A_*`/`GEMINI_API_KEY` (env Vercel) | Không có bảng `ai_providers`/`ai_integrations` (REST `PGRST205`), không có API lưu cấu hình | `app/settings/ai/page.tsx`, `app/api/ai/chat/route.ts` | `ai_providers`, `integration_configs` | Tạo bảng + API CRUD config |
| P-10 | **System Health: Vercel/GitHub hardcode ok:true** | `settings/health/page.tsx:233-234` `{ok:true}` không có check runtime | Kiểm tra thực tế Vercel/GitHub/Sheets/Android sync/device | `app/settings/health/page.tsx:232-236` | — | Thêm real check |
| P-11 | **AI Chat: provider selector giả** | `AIChatDrawer.tsx:21,73-84` chọn Gemini/OpenAI/Claude/LocalLLM nhưng route chỉ dùng C2A/Gemini; fallback trong catch là **data bịa** (644km, 808,500đ) | Provider mapping thật, không bịa số | `components/ai/AIChatDrawer.tsx:41-52` | — | Gọi route với provider thật, bỏ text bịa |
| P-12 | **Android: sync chỉ trips+vehicles, không có auth** | `SyncWorker.kt:67-81` dùng publishable key (không user JWT) → RLS chặn → data không sync được; telemetry/fuel/maintenance không enqueue | Auth + enqueue đầy đủ | `android/.../data/sync/SyncWorker.kt`, `VehicleRepository.kt` | `trips`, `vehicles` | Thêm auth JWT người dùng, enqueue đầy đủ entities |
| P-13 | **Android: manifest lỗi package → app không launch** | `AndroidManifest.xml:41` `.MainActivity` = `com.fmms.carlogger.MainActivity` nhưng class thật là `com.fmms.carlogger.ui.MainActivity` → `ActivityNotFoundException` | Fix package | `android/app/src/main/AndroidManifest.xml:41`, `MainActivity.kt:1` | — | Đổi manifest hoặc package |
| P-14 | **Android: ODO virtual engine không được gọi** | `VirtualOdometerEngine.kt:19-21` khởi tạo từ prefs nhưng 3 mutator không được gọi → odo đứng yên 12846 | Wire trip completion → onTripCompleted | `android/.../core/odometer/VirtualOdometerEngine.kt`, `DashboardViewModel.kt` | — | Gọi engine khi trip xong |
| P-15 | **Edit Asset không đầy đủ field** | `updateAsset` chỉ update subset: name,type,brand,model,year,color,plate,odo,status,desc | Thiếu: VIN, engine, price, dates, tank, battery... | `lib/services/assetService.ts:203-223` | `assets` | Bổ sung toàn bộ field theo spec 230.4 |
| P-16 | **Insurance/Registration chỉ create+list web** | `insuranceService`: get/create/delete; không có UI edit metadata, expiry alert chỉ là badge dẫn xuất | Edit + alert real | `app/documents/page.tsx`, `lib/services/insuranceService.ts` | `insurance_policies`, `registrations` | Thêm edit form + alert do DB |

---

## 🔴 MISSING

### Security / Core
| # | Chức năng spec | File xác nhận | Mức độ |
|---|----------------|---------------|--------|
| M-1 | **Admin/Member phân quyền** (member chỉ xem xe được chỉ định, không edit) — bảng `household_members`, `asset_members`, `invitations` **không tồn tại** (REST `PGRST205`) | `supabase/migrations/*`, spec §230.1.5 | 🔴 |
| M-2 | **Audit log không được ghi từ bất kỳ đâu** — bảng `audit_logs` tồn tại nhưng không service nào `insert` vào nó | toàn web | 🔴 |
| M-3 | **Expense/Maintenance/Fuel Edit+Delete trên các trang riêng** — fuel chỉ Add, maintenance chỉ Add, part chỉ Add | `fuel/page.tsx`, `maintenance/page.tsx`, `[id]/page.tsx` | 🔴 |
| M-4 | **Upgrades CRUD** — không có UI/service upgrades (bảng `upgrades` có RLS nhưng không web dùng) | — | 🔴 |
| M-5 | **OBD calibration/correction so sánh raw vs corrected** (fuel calibration, telemetry_calibrations) — chỉ có odometer adjustment, không có fuel/telemetry calibration | `lib/services/odometerService.ts` | 🔴 |

### AI
| # | Chức năng | Hiện trạng | Mức |
|---|-----------|-----------|-----|
| M-6 | **AI Memory** (conversation history, session, preferences, saved notes, clear conversation) | Không tồn tại | 🔴 |
| M-7 | **AI Privacy scope selector** (chọn dữ liệu AI được đọc, raw OBD OFF mặc định) | Không tồn tại | 🔴 |
| M-8 | **Telegram / Zalo integration** | Không có code (settings có giới thiệu cần `C2A_BASE_URL`) | 🔴 🟡 |
| M-9 | **AI Automation** (trigger maintenance/report → gửi Telegram) | Không tồn tại | 🔴 |
| M-10 | **Voice input** | Icon mic `AIChatDrawer.tsx:131-135` không có handler | 🔴 |
| M-11 | **Multi-provider abstraction đầy đủ** (ai_providers/ai_task_routes) | Route cứng C2A→Gemini; UI localStorage | 🔴 |

### Android / Devices
| # | Chức năng | Hiện trạng | Mức |
|---|-----------|-----------|-----|
| M-12 | **Android đăng nhập + lưu token an toàn** | Không có auth: dùng anon key; prefs plaintext | 🔴 |
| M-13 | **Telemetry sync lên cloud** | Room-local, purge 90 ngày, không sync | 🔴 |
| M-14 | **Device registration / pairing account** | Chỉ lưu MAC Bluetooth; không ràng buộc account | 🟡 |
| M-15 | **Android sync retry đúng** | `Result.retry()` ngay cả khi thành công (`SyncWorker.kt:59`) | 🟡 |
| M-16 | **Battery/charging logs, rides (bicycle)** | Entity không có, engine không có | 🔴 |

### Khác
| # | Chức năng | Hiện trạng | Mức |
|---|-----------|-----------|-----|
| M-17 | **Phân trang/lọc nâng cao Finance/Expense** (date range filter, category filter) | Expense list không filter theo ngày/category | 🔴 |
| M-18 | **Notification settings / integration configs UI** | `settings/page.tsx` các thẻ `href:'#'` (Google Sheets, Thông báo, Bảo mật, Tùy chỉnh Dashboard) là **no-op link** | 🔴 |
| M-19 | **Asset delete/deactivate** | Không có trên dashboard (chỉ soft status trong edit) | 🔴 |
| M-20 | **Insurance expiry alert live** | Chỉ badge client-side | 🟡 |

---

## ⚠️ HARDCODE / MOCK

| File:Line | Nội dung | Chức năng |
|-----------|----------|-----------|
| `web/components/ai/AIChatDrawer.tsx:51` | text bịa "Mazda2 ... 644 km ... 808.500đ ... 6.9L/100km" trong `catch` | AI reply giả khi chat lỗi |
| `web/app/ai-center/page.tsx:18-118` | `DEMO_RESPONSES` 4 câu trả lời bịa (1.506.950đ, 12.846km, 2.154km, 6.2/6.9L) + `setTimeout 800ms` giả | Toàn bộ trang AI Center là demo, không gọi API |
| `web/middleware.ts:33-34` | `fmms_demo_session` cookie = bypass auth | Bypass xác thực production |
| `web/app/login/page.tsx:235-249` | `demo@fmms.com` / `12345678` + fallback set cookie demo | Demo login bypass |
| `web/components/layout/Navbar.tsx:18,28` | `useState('demo@fmms.com')`, email demo → role ADMIN | Default user/role giả |
| `web/app/settings/health/page.tsx:233-234` | `{ok:true}` Vercel/GitHub | Health check giả |
| `web/lib/supabase/client.ts:5-6`, `server.ts:7-8`, `middleware.ts:15-16`, `auth/callback/route.ts:13-14` | Supabase URL + key hardcode fallback | Key client hardcode (public key, rủi ro thấp nhưng vi phạm policy) |
| `android/app/build.gradle.kts:23-24,38-40` | `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` + `MAZDA2_ASSET_ID` hardcode | BuildConfig hardcode |
| `android/.../VehicleRepository.kt:150` | `prefs.getFloat("odo_km", 12846f)` | ODO default giả (Mazda2) |
| `android/.../MoreScreen.kt:373,396-397` | `mutableStateOf("Mazda2")`, `make="Mazda"` | Default xe giả |
| `android/.../TelemetryService.kt:144` | `setContentTitle("Mazda2 Logger")` | Tiêu đề cứng |
| `web/lib/data/mockData.ts` | `INITIAL_ASSETS`, `MOCK_FUEL_LOGS`, `MOCK_MAINTENANCE_RECORDS`, `MOCK_EXPENSES`, `MOCK_TRIPS`, `MOCK_LOAN`, `MOCK_PARTS` | **Dead code** (chỉ `DEFAULT_CARD_SETTINGS` được dùng) — nên xoá |
| `web/lib/services/sampleDataImporter.ts:11-243` | 4 xe Mazda/VinFast/BMW/Specialized + fuel/expense/loan sample; nút "Import dữ liệu mẫu" `HomePage.tsx:239` | Bơm data giả vào DB thật khi user bấm |
| `supabase/migrations/0005_seed_initial_data.sql` | Demo fleet/user 0000...1, Mazda2 odo 12846, loan BIDV | Seed data demo |
| `web/app/analytics/page.tsx:67` | `startsWith("2026-")` | Hardcode năm |
| placeholder số: 12846, 23100, 35.0, 520000000, 490000000, 500000, 808500, 6500000... | `fuel/page.tsx`, `maintenance/page.tsx`, `[id]/page.tsx`, `finance/page.tsx` | Placeholder giá trị mẫu |
| `web/app/finance/page.tsx:273`, `[id]/page.tsx:495`, `AssetCard.tsx:66-70` | badge "● ACTIVE" hardcode, bỏ qua `asset.status` | Trạng thái sai |
| `web/app/assets/[id]/page.tsx:577` | "Trạng thái: Bình thường" hardcode | Dữ liệu tĩnh |
| `web/app/assets/[id]/page.tsx:1004-1011` | Warranty card hardcode "3 năm / 100.000 km", "CÒN HẠN", "01/01/2026" | Warranty tĩnh |

Số literal **62** và **2150**: **KHÔNG tồn tại** trong source (chỉ xuất hiện trong spec làm ví dụ mockup; `866250` và `~2.154` là trùng khớp ngẫu nhiên). 🟢

TODO/FIXME comments: **không có** trong `app/`/`components/` (grep sạch). Có nhiều `catch {}` nuốt lỗi (fuel:28, maintenance:41, finance:80, analytics:30, documents:68).

---

## 🔐 SECURITY ISSUES

| # | Vấn đề | Mức | Fix |
|---|--------|-----|-----|
| S-1 | **`fmms_demo_session` cookie bypass toàn bộ auth** trên production middleware. Bất kỳ ai set cookie `fmms_demo_session=1` là vào được app (dù RLS vẫn chặn đọc, nhưng trang render, gọi API) | P0 | Xoá demo bypass khỏi middleware + login |
| S-2 | **Android dùng anon/publishable key làm Authorization** → ghi/đọc qua PostgREST mà không có user identity → RLS chặn → data không bao giờ sync được, và nếu RLS lỏng thì 1 key chung truy cập mọi dữ liệu | P0 | Auth JWT user trên Android |
| S-3 | **Supabase key hardcode trong 4 file web + BuildConfig Android** (publishable/anon — an toàn vì public, nhưng dễ bị "mượn" credit; service_role KHÔNG xuất hiện ✅) | P1 | Chỉ dùng env, không fallback hardcode |
| S-4 | **Prefs Android plaintext** (OBD MAC, cấu hình) mặc dù có dependency security-crypto | P1 | Dùng EncryptedSharedPreferences |
| S-5 | RLS: các bảng v5.2 mới `dashboard_settings` đã có policy; `audit_logs` policy `auth.uid()=user_id`; nhưng **`warranties`/`warranty_claims` policy nằm trong SETUP_PASTE sql, KHÔNG có trong migrations 0001-0005** — nếu deploy bằng migration `supabase db push` sẽ không có RLS | P1 | Đồng bộ migration |
| S-6 | `is_asset_owner` dùng `SECURITY DEFINER` — kiểm tra asset_id → owner. OK nhưng cần đảm bảo không leak qua column dẫn xuất | P2 | Review |
| S-7 | User isolation: RLS `owner_id = auth.uid()` đúng cho user A ≠ user B ✅ | — | OK |

---

## 🗄 DATABASE ISSUES

| # | Vấn đề | Mức |
|---|--------|-----|
| D-1 | `assets` thiếu cột mà UI render: `fuel_level_percent`, `estimated_range_km`, `avg_consumption_l100km`, `next_maintenance_due`, `total_rides`, `avg_speed_kmh` (REST `42703`) | P0 |
| D-2 | `analyticsService.ts` interface dùng sai tên cột so với `monthly_summaries` (`total_distance_km` vs `distance_km`, `total_fuel_liters` vs `fuel_used_liters`, `total_fuel_cost` vs `fuel_cost`, `total_expenses` vs `total_expense`) → service sẽ lỗi khi gọi | P1 |
| D-3 | `dashboard_settings` PK=`user_id` nhưng query `select=id` lỗi `42703` → chưa có service/web dùng | P1 |
| D-4 | Bảng spec yêu cầu nhưng **không tồn tại**: `ai_providers`, `ai_provider_credentials`, `ai_task_routes`, `integration_configs`, `notification_settings`, `asset_card_settings`, `household_members`, `asset_members`, `invitations`, `maintenance_orders`, `maintenance_order_items`, `warranty_items`, `asset_types`, `asset_categories`, `asset_groups`, `asset_images`, `rides`, `charging_logs`, `asset_parts`, `vendors`, `asset_valuations`, `odometer_records`, `telemetry_calibrations`, `fuel_calibrations`, `sync/...` (REST `PGRST205`) | P1 |
| D-5 | Chỉ 27 table tồn tại trong SETUP sql; spec đòi nhiều hơn | P1 |
| D-6 | Missing indexes ngoài v5.2? (có idx_warranties_asset/claims/warranty/audit) | P2 |
| D-7 | `monthly_summaries` trigger chỉ chạy sau `INSERT` trên `expenses` (không ghi distance_km/hỗ trợ UPDATE) | P2 |
| D-8 | `dashboard_settings` thêm nhưng HomePage không đọc | P1 |
| D-9 | Seed 0005 dùng UUID user giả `0000...0001` không khớp user thật → data seed không thuộc ai, RLS không cho user thật đọc | P2 |

---

## 🤖 AI ISSUES

| # | Vấn đề | Mức |
|---|--------|-----|
| A-1 | AI Center page hoàn toàn demo (`DEMO_RESPONSES`, `setTimeout`) — trả lời bịa số liệu | P0 |
| A-2 | AIChatDrawer fallback `catch` hiển thị data bịa (644km/808.500đ) | P0 |
| A-3 | Provider lựa chọn trong UI (Gemini/OpenAI/Claude/LocalLLM) không khớp route (only C2A/Gemini) | P1 |
| A-4 | Không có AI Memory (lịch sử hội thoại, preferences) | P1 |
| A-5 | Không có AI Privacy scope (raw OBD OFF mặc định) | P1 |
| A-6 | No integration config DB (`ai_providers`) → không configure được từ Web UI mà phải sửa env | P1 |
| A-7 | Không có Telegram/Zalo adapter | P2 |
| A-8 | Không có automation trigger | P2 |

---

## 📱 ANDROID ISSUES

| # | Vấn đề | Mức |
|---|--------|-----|
| AN-1 | **Manifest package sai → `ActivityNotFoundException` khi mở app** (`com.fmms.carlogger.MainActivity` vs `com.fmms.carlogger.ui.MainActivity`) | P0 |
| AN-2 | Không auth (chỉ publishable key), không lưu token an toàn | P0 |
| AN-3 | Sync chỉ trips + vehicles; telemetry/fuel/maintenance/daily không enqueue; tryReconnect rỗng | P1 |
| AN-4 | `Result.retry()` vô điều kiện kể cả khi thành công | P2 |
| AN-5 | ODO virtual engine không được gọi → odo đứng yên | P1 |
| AN-6 | BLE transport dead code; DEMO_MODE enum unused | P3 |
| AN-7 | Không có fuel/battery log đầy đủ trên Android hiển thị | P2 |

---

## 📊 ANALYTICS ISSUES

| # | Vấn đề | Mức |
|---|--------|-----|
| LY-1 | Chart/KPI tính client-side, không dùng `monthly_summaries`/`daily_summaries` (service sai cột) | P1 |
| LY-2 | Hardcode năm 2026 | P1 |
| LY-3 | Thiếu filter vehicle / day / month / year | P1 |
| LY-4 | Theme "TB tiêu thụ" hiển thị `—` | P2 |

---

## 🎯 PRIORITY

### P0 — Critical / Security / Data loss
1. Xoá auth bypass `fmms_demo_session` (middleware + login) — `S-1`, `M-1` liên quan
2. Android: fix manifest package để app launch được (`AN-1`)
3. Android: thêm auth JWT user trước khi sync (`S-2`, `AN-2`)
4. Xoá fake AI reply: `ai-center` demo + `AIChatDrawer` catch bịa (`A-1`, `A-2`)
5. Thêm cột DB cho `assets` mà UI render + sửa `mapAssetRow` (`D-1`, `P-1`)

### P1 — Core functionality
1. Dashboard Settings persist vào `dashboard_settings` (`P-2`, `D-8`)
2. Assets page: gắn nút "Thêm phương tiện" (`P-3`)
3. Warranty: hoàn thiện form add warranty (`P-4`)
4. Maintenance multi-service: tạo `maintenance_orders`/`maintenance_order_items` (`P-5`)
5. Finance: thêm UI create/edit loan (không chỉ loan đầu) (`P-6`)
6. Documents: upload file thật (Storage bucket) (`P-7`)
7. Analytics: dùng summaries + bỏ hardcode năm + filter (`P-8`, `LY-1..3`, `D-2`)
8. AI config persist `ai_providers` + API (`P-9`, `A-6`)
9. Audit log thật: ghi `audit_logs` từ mọi CRUD quan trọng (`M-2`)
10. Admin/Member roles: tạo bảng `household_members`/`asset_members`/`invitations` + RLS (`M-1`)
11. Bổ sung field Edit Asset đầy đủ theo spec 230.4 (`P-15`)
12. Đồng bộ RLS warranties vào migrations (`S-5`, `D-5`)

### P2 — Important
1. Health check real cho Vercel/GitHub/Android sync (`P-10`)
2. Service filters + expense date/category filter (`M-17`)
3. OBD fuel/telemetry calibration (`M-5`)
4. Android: enqueue đầy đủ entities + retry đúng (`AN-3`, `AN-4`)
5. Insurance/Registration edit + expiry alert thật (`P-16`)
6. Asset delete/deactivate confirm (`M-19`)
7. Settings page: thay link `#` bằng trang thật hoặc "coming soon" (`M-18`)

### P3 — Enhancement
1. AI Memory + Privacy scope + Voice input (`M-6`, `M-7`, `M-10`)
2. Telegram/Zalo (`M-8`), AI Automation (`M-9`)
3. Android: BLE, encrypted prefs, remove ODO hardcode (`AN-6`, `S-4`, `M-12`)
4. Xoá dead code `mockData.ts` (giữ `DEFAULT_CARD_SETTINGS`) (`HARDCODE`)
5. Seed data khớp user thật hoặc gỡ bỏ (`D-9`)

---

# IMPLEMENTATION ACTION LIST

## P0
1. Remove `fmms_demo_session` auth bypass: `web/middleware.ts:33-34`, `web/app/login/page.tsx:235-249`, `Navbar.tsx`
2. Fix Android manifest package: `android/app/src/main/AndroidManifest.xml:41` → `com.fmms.carlogger.ui.MainActivity`
3. Android auth: thêm login + token JWT → thay publishable key trong `SyncWorker.kt`
4. Remove fake AI: rewrite `ai-center/page.tsx` to call `/api/ai/chat`, remove canned fallback in `AIChatDrawer.tsx:51`
5. Add `assets` missing columns + fix `mapAssetRow`

## P1
1. Dashboard settings persist (`dashboard_settings` service + wire)
2. Assets page add-vehicle button
3. Warranty create form
4. `maintenance_orders`/`maintenance_order_items` tables + multi-service insert
5. Loan CRUD UI in Finance
6. Document real upload via Supabase Storage
7. Analytics: fix analyticsService columns, use summaries, remove year hardcode, add filters
8. `ai_providers` table + API config persist
9. Write `audit_logs` on critical CRUD
10. Admin/Member role tables + RLS
11. Full-field asset edit
12. Migrations sync with SETUP_PASTE sql

## P2
1. Real health checks (Vercel/GitHub/Sheets/Android)
2. Expense date/category/vehicle filters
3. OBD fuel/telemetry calibration workflow
4. Android full entity sync + proper retry
5. Insurance/registration edit + expiry alerts
6. Asset delete/deactivate confirm
7. Settings page real routes

## P3
1. AI Memory + Privacy scope + voice input
2. Telegram/Zalo + AI automation
3. Android BLE + encrypted prefs + remove hardcoded data
4. Remove dead mockData.ts (keep DEFAULT_CARD_SETTINGS)
5. Align seed data to real user / remove