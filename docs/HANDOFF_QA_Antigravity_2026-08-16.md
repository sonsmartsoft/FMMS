# HANDOFF — FMMS QA TEST SUMMARY & YÊU CẦU SỬA (cho Antigravity)
> Ngày: 16/08/2026 · Nguồn: kiểm tra mã nguồn `/Users/uti/Documents/FMMS` + bản production `https://fmms.vercel.app/`
> Ghi chú: Vấn đề `.env` / secrets đã được chủ dự án loại trừ khỏi phạm vi đợt này — không cần xử lý.

---

## A. KẾT LUẬN TỔNG QUAN

**Bản production hiện tại là GIAO DIỆN DEMO (renders 100% dữ liệu giả cứng trong code), CHƯA PHẢI hệ thống tích hợp theo Implementation Specification v5.1.**

Mức độ hoàn thành so với spec:

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| UI/UX giao diện chung | 🟡 KHÁ | Dark UI, tiếng Việt, đủ sidebar & các màn |
| Dashboard asset cards | 🟡 KHÁ | Đủ 4 asset, filter, search, KPI |
| Kết nối Supabase | 🔴 CHƯA | DB trả lỗi, mọi trang dùng mock data |
| Authentication / RLS | 🔴 CHƯA | Không có login, ai mở URL cũng thấy dashboard |
| AI Gateway thật | 🔴 CHƯA | Chỉ keyword-matching, không gọi provider nào |
| Thêm / Sửa / Xóa dữ liệu | 🔴 CHƯA | Chỉ thêm được, không sửa/xóa được |
| Asset Detail theo spec | 🟡 CHƯA ĐỦ | Thiếu nhiều tab & field bắt buộc |
| Khoản vay chi tiết | 🔴 CHƯA | Chỉ tổng quan, không có lịch trả nợ |
| Cấu hình AI Providers | 🔴 CHƯA | Không có màn cấu hình provider |
| Android app | 🔴 CHƯA | Chỉ skeleton 5 file, thiếu Room/GPS/sync/... |

---

## B. CÁC LỖI ĐÃ KIỂM CHỨNG (kèm file/ dòng mã nguồn)

### B1. Supabase KHÔNG kết nối — toàn bộ app dùng dữ liệu giả
- TEST THỰC TẾ: gọi REST `GET https://opslebsdmwsnsyfmbynf.supabase.co/rest/v1/assets?select=id&limit=1` bằng publishable key (`sb_publishable_AateqAZX...`) → **HTTP 404** (tables `assets`, `trips`, `fuel_logs`, `maintenance_records` đều 404). Bảng chưa được migrate vào project, HOẶC chưa expose.
- Trang production `/settings/health` hiển thị **"Supabase PostgreSQL DB: ERROR"**.
- Mã nguồn:
  - `web/lib/supabase/client.ts` — có `createClient()` nhưng **chỉ MỘT nơi gọi**: `web/app/settings/health/page.tsx` (đếm `assets`).
  - MỌI trang còn lại import dữ liệu từ `web/lib/data/mockData.ts`:
    - `INITIAL_ASSETS`, `MOCK_FUEL_LOGS`, `MOCK_MAINTENANCE_RECORDS`, `MOCK_EXPENSES`, `MOCK_TRIPS`, `MOCK_LOAN`, `MOCK_PARTS`.
    - Các file bị ảnh hưởng: `components/home/HomePage.tsx`, `app/assets/page.tsx`, `app/assets/[id]/page.tsx`, `app/fuel/page.tsx`, `app/maintenance/page.tsx`, `app/finance/page.tsx`, `app/documents/page.tsx`, `app/analytics/page.tsx`.
- Migration đã viết nhưng (có vẻ) chưa được apply: `supabase/migrations/0001_initial_schema.sql` → `0005_seed_initial_data.sql`.

### B2. KHÔNG có Authentication — mở URL là vào được dashboard
- Không có trang login/signup, không có middleware bảo vệ route.
- Spec yêu cầu: Supabase Auth + RLS, user chỉ đọc/ghi được fleet/asset được ủy quyền (mục 79, 80).
- Ngoài ra seed dùng user demo `00000000-0000-...-0001` KHÔNG tồn tại trong `auth.users` → kể cả migrate xong, một user thật cũng không thấy data.

### B3. AI Chat là FAKE — không gọi bất kỳ provider nào
- File: `web/app/api/ai/chat/route.ts`.
- Mô tả trong code: `// Mock Context Building & Tool Execution Engine`.
- Không có lời gọi Gemini/OpenAI/Claude. Chỉ khớp từ khóa (`xăng`, `bảo dưỡng`, `chi phí`, ...) trả về câu soạn sẵn và **tự khai báo sai** "dữ liệu nhiên liệu trong Supabase DB" trong khi không hề query DB.
- Các con số trong reply (35.0 Liters, 6.9 L/100km, 2,558 ₫/km...) đều HARDCODE.
- Chọn provider trên UI (`AIChatDrawer.tsx`) chỉ đổi label, không đổi backend.

### B4. UI — "ADD-ONLY", KHÔNG CÓ CHỨC NĂNG SỬA/XÓA
- Các handler `saveFuel`/`saveMaint`/`saveExpense`/`saveTrip`/`savePart` trong `web/app/assets/[id]/page.tsx` đều chỉ **append** (`setXxx([{...}, ...xxx])`), không có update/delete.
- Không có bất kỳ `handleEdit`, `onDelete`, nút Sửa/Xóa trong toàn bộ `web/` (đã grep).
- Nút **"Thêm phương tiện"**:
  - `components/home/HomePage.tsx:102-106` — KHÔNG có `onClick` (bấm không xảy ra gì).
  - `app/assets/page.tsx:43-49` — KHÔNG có `onClick`.
  - Không có Add/Edit vehicle modal/form.
- Header Asset Detail (`app/assets/[id]/page.tsx:169-202`) thiếu các nút bắt buộc theo spec: `[Edit] [Add Expense] [Add Maintenance]`.

### B5. Asset Detail CHƯA ĐẦY ĐỦ theo spec §9/§91
Tabs hiện tại (`app/assets/[id]/page.tsx:96-107`):
```
Tổng quan | Vận hành & OBD | Chuyến đi | Nhiên liệu | Bảo dưỡng
Phụ tùng & Nâng cấp | Chi phí | Khoản vay | Bảo hiểm & Giấy tờ | Phân tích TCO
```
- ❌ **Thiếu tab tách biệt**: `Upgrades` (đang gộp vào "Phụ tùng & Nâng cấp"), `Insurance` (đang gộp vào "Bảo hiểm & Giấy tờ"), `Documents`.
- ❌ **Overview** (dòng 229-266) chỉ có: Giá mua, Giá trị hiện tại, Bảo dưỡng tiếp theo + 4 ô động cơ/nhiên liệu/bình/L100. **Thiếu**: Mileage, Status, Total Cost, Cost/km, Maintenance Status, Finance Status, Insurance Status.
- ❌ **Operation** (dòng 268-309) chỉ có 4 số OBD **HARDCODE** (62 km/h, 2,150 rpm, 91°C, 14.1V — giả, không phải telemetry) + ledger virtual odometer. **Thiếu**: Current Fuel, Fuel %, Estimated Liters, Estimated Range, Average Consumption, Today's Distance, Monthly Distance, Last Trip, OBD Status, GPS Status.
- ⚠️ Mọi giá trị "Live OBD" là HARDCODE → vi phạm spec "No fake telemetry" (mục 47.2).

### B6. Khoản vay KHÔNG có chi tiết
- `web/app/finance/page.tsx` — màn Loan chỉ là 1 thẻ tổng quan (gốc, trả trước, lãi suất, kỳ hạn, thanh toán/tháng, ngày, dư nợ, tiến độ %).
- **Thiếu**: bảng lịch trả nợ (`loan_payments` — Payment #, Due Date, Principal, Interest, Fees, Total, Paid Date, Status, Remaining Balance). Spec §66 bắt buộc.
- Không có thêm/sửa/xóa khoản vay.

### B7. CẤU HÌNH AI PROVIDERS KHÔNG tồn tại
- `web/app/settings/page.tsx:17-25` — card "Cấu hình AI Providers" có `href: '#'` → render disabled (`cursor-not-allowed`), **bấm không vào được**.
- KHÔNG có màn cấu hình per-provider: API key, model, default provider, routing, usage, privacy... (spec §106, §179-182).
- Trang `/settings/health` hiển thị "Gemini/OpenAI/Claude Ready · HEALTHY" → **HARDCODE, không phải test thật**.

### B8. Android app mới chỉ là skeleton
- `android/` chỉ có 5 file Kotlin: `MainActivity.kt`, `ui/dashboard/DashboardScreen.kt`, `core/obd/OBDConnectionManager.kt`, `core/obd/ELM327ProtocolManager.kt`, `core/odometer/VirtualOdometerEngine.kt`.
- Thiếu toàn bộ: Room DB, GPS, Trip Engine, Fuel Engine, Sync Queue, WorkManager, maintenance, statistics, multi-vehicle, backup/export, foreground service... (spec §75).

### B9. Phụ (nhỏ)
- Thiếu OG meta, favicon (HTML kết quả fetch không có `<link rel="icon">`, không `og:*`).
- Nhãn trộn ngôn ngữ trên card: "Mileage" (EN) cạnh "Mức xăng" (VI).
- Nút "Cài đặt Dashboards" (DisplaySettingsModal) có tồn tại nhưng chỉ điều chỉnh hiển thị trong phiên, chưa lưu server.

---

## C. KẾ HOẠCH AI INTEGRATION — CHATGPT2API GATEWAY

Chủ dự án chọn dùng **ChatGPT2API** (https://github.com/TriTue2011/chatgpt2api) làm AI backend cho FMMS, thay cho việc tích hợp trực tiếp nhiều provider.

### Kiến trúc
```
FMMS Web (/api/ai/chat/route.ts)
    ↓ gọi OpenAI-compatible
Base URL: http://<C2A_SERVER>:3030/v1   (hoặc URL tunnel công khai)
API Key : CHATGPT2API_AUTH_KEY           (biến env server-side, KHÔNG lộ frontend)
Model   : Combo "AI Agent" / "chatgpt/auto" / "gemini_free/auto" / "oc/auto"
```

### Vì sao phù hợp spec
- Chuẩn OpenAI API → FMMS chỉ cần 1 lời gọi `POST /v1/chat/completions` là đạt **§104-105** (provider abstraction) và **§181** (fallback tự động qua Combo trong dashboard ChatGPT2API).
- Chi phí thấp: tận dụng ChatGPT Web free, Gemini AI Studio free, OpenCode free (không cần token), DeepSeek/Groq/Mistral.
- Có sẵn dashboard quản lý account pool, models, combos, backup.

### Hạ tầng (chủ dự án xác nhận)
- Chạy bằng **Docker** trên **Android box** HOẶC **Docker Desktop trên PC ở nhà** (LAN) — không phải VPS.
- Hệ quả: FMMS Web trên Vercel (cloud) cần đường truy cập tới gateway ở nhà → bắt buộc expose an toàn.

### Yêu cầu Antigravity thực hiện
1. **Thêm provider ChatGPT2API vào màn cấu hình AI** (`/settings/ai`): 3 trường Base URL, API Key, Default Model/Combo + nút `[Test kết nối]` (gọi `/v1/models`).
2. **Thay `/api/ai/chat/route.ts`** (hiện là keyword-matching fake) bằng lời gọi thật:
   - `POST {C2A_BASE_URL}/v1/chat/completions`, header `Authorization: Bearer {C2A_API_KEY}`, body `{ model, messages, temperature }`.
   - Giữ nguyên kiến trúc route phía server — key KHÔNG được lộ xuống client.
3. **Expose gateway ở nhà an toàn** (chọn 1):
   - **Khuyến nghị**: Cloudflare Tunnel (`cloudflared`) → URL `https://...trycloudflare.com/v1`, bảo vệ bằng auth key.
   - Thay thế: chỉ dùng nội bộ nếu FMMS AI gọi qua một Edge Function/VPS trung gian có internet.
   - ⚠️ Không bao giờ expose port `6080` (noVNC) ra internet; đặt `VNC_PASSWORD`; dùng `CHATGPT2API_AUTH_KEY` mạnh.
4. **Env mới trên Vercel** (KHÔNG commit vào Git): `C2A_BASE_URL`, `C2A_API_KEY`, `C2A_DEFAULT_MODEL`.
5. **Bất biến spec**: AI tắt/không khả dụng → FMMS core (assets, trips, fuel, maintenance...) vẫn chạy bình thường (**§130, §200**). UI phải hiển thị trạng thái AI rõ ràng.

### Rủi ro cần lưu ý
- Máy ở nhà phải bật 24/7; mất điện/mất mạng → AI chat tạm ngưng (chức năng xe vẫn OK vì local-first).
- Token ChatGPT free có thể hết hạn → cần combo fallback + theo dõi trong dashboard để giảm gián đoạn.

---

## D. DANH SÁCH SỬA THEO ƯU TIÊN

### 🔴 CẤP CỨU — nền tảng
1. **Apply migration lên project `opslebsdmwsnsyfmbynf`** (`supabase link` + `supabase db push`), coi chừng bảng đã tồn tại → dùng `CREATE TABLE IF NOT EXISTS` & `ON CONFLICT`. Verify REST trả 200.
2. **Bật Supabase Auth** (login/register), tạo middleware Next.js bảo vệ tất cả route; listener `onAuthStateChange`.
3. **Thay thế toàn bộ mock data** bằng query Supabase qua repository layer (`lib/data` → `lib/services`), có fallback UX khi offline/empty. Seed phải tạo đúng user trong `auth.users` rồi mới tạo fleet/assets.
4. **Xác minh `/settings/health` phản ánh trạng thái thật** (bỏ "HEALTHY/Connected" hardcode).

### 🟠 CAO — đúng spec
5. **Thêm CRUD đầy đủ**: Add/Edit/Delete cho assets, fuel, maintenance, expenses, trips, parts, upgrades, loans, payments, insurance, documents. Nút "Thêm phương tiện" (Home + Assets) phải mở form thật. Header Asset Detail thêm `[Edit] [Add Expense] [Add Maintenance]`.
6. **Asset Detail đủ tab theo §91**: tách `Upgrades`, `Insurance`, `Documents`; **Overview** thêm Mileage, Status, Total Cost, Cost/km, Maintenance/Finance/Insurance Status; **Operation** thêm Current Fuel, Fuel %, Estimated Liters, Estimated Range, Average Consumption, Today's Distance, Monthly Distance, Last Trip, OBD Status, GPS Status. **Bỏ OBD hardcode** (thay bằng N/A khi chưa có telemetry).
7. **Khoản vay chi tiết**: thêm bảng `loan_payments`, hiển thị lịch trả nợ, thêm/sửa thanh toán.
8. **Cấu hình AI Providers thật** (`/settings/ai`): per-provider (key, model, status, test), default provider, routing, usage/cost, privacy. Bỏ keyword-matching trong `/api/ai/chat/route.ts`, gọi provider thật phía server, context builder từ analytics.

### 🟡 TRUNG BÌNH
9. SEO/UX: OG meta, favicon, thống nhất nhãn tiếng Việt.
10. Android: hoàn thiện full-feature theo spec §75 (ít nhất Room + GPS + Trip + Sync).

---

## E. CHECKLIST RE-TEST SAU KHI ANTIGRAVITY SỬA

```
[ ] REST assets/trips/fuel_logs/maintenance_records trả 200 (không còn 404)
[ ] /settings/health: Supabase DB = Connected (thật, không hardcode)
[ ] Đăng nhập/đăng ký được; route bị middleware chặn khi chưa login
[ ] Dashboard hiển thị data từ Supabase (không còn mock)
[ ] Thêm phương tiện mở form và insert được
[ ] Sửa + Xóa được: asset, fuel, maintenance, expense, trip, part
[ ] Asset Detail đủ 12 tab; Overview đủ 10 field; Operation đủ nội dung spec §93
[ ] Không còn số OBD hardcode; thiếu telemetry thì hiển thị N/A
[ ] Khoản vay có lịch trả nợ đầy đủ
[ ] /settings/ai cấu hình được từng provider + test kết nối
[ ] ChatGPT2API: /settings/ai có Base URL + API Key + Model/Combo + nút Test
[ ] /api/ai/chat gọi thật POST {C2A}/v1/chat/completions (không còn keyword-matching)
[ ] C2A_BASE_URL / C2A_API_KEY / C2A_DEFAULT_MODEL nằm trong env Vercel, không có trong Git
[ ] Gateway ở nhà expose qua Cloudflare Tunnel (hoặc trung gian), auth key mạnh, port 6080 không mở ra internet
[ ] AI chat gọi provider thật và trả lời bằng dữ liệu analytics thật
[ ] AI tắt → FMMS core vẫn hoạt động bình thường
[ ] Android: APK build được, có Room+GPS+sync (hoặc xác nhận roadmap rõ)
```

## F. TÀI LIỆU THAM CHIẾU
- Spec: `~/Documents/FMMS/FamilyMobilityManagement_Implementation_Specification_FINAL_v5.1.md`
  - §8-9 (dashboard), §61-74 (modules), §79-80 (security), §86-101 (multi-asset), §104-130 (AI), §131-150 (deploy), §176-201 (config/health/offline).
- Migration hiện có: `supabase/migrations/0001..0005`.