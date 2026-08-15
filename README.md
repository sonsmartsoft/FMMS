# FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
### Multi-Asset Mobility, Finance, Telemetry & Omnichannel AI Platform

Hệ thống quản lý toàn bộ phương tiện và tài sản di chuyển của gia đình (Ô tô Mazda2 Base 2026, Mô tô BMW S1000RR, Xe đạp đường trường Specialized, Xe điện VinFast Feliz S).

---

## 🏛️ KIẾN TRÚC TỔNG THỂ HỆ THỐNG

```text
                        FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
                                          │
             ┌────────────────────────────┼────────────────────────────┐
             │                            │                            │
      WEB APPLICATION             ANDROID IN-CAR APP           SUPABASE CENTRAL DB
  (Next.js 14 + Tailwind)         (Kotlin Jetpack Compose)     (PostgreSQL + RLS)
  • Visual Asset Cards            • ZESTECH 9" ADAS UI         • Ref: opslebsdmwsnsyfmbynf
  • Capability-based UI           • KONNWEI KW906 OBD-II       • Assets & Capabilities
  • TCO & Cost/km Analytics       • Virtual Odometer Ledger    • Telemetry & Trip Logs
  • Floating Multi-AI Chat        • Local Room DB Sync Queue   • RLS & Security Policies
```

---

## 📂 THƯ MỤC NGUỒN (MONOREPO STRUCTURE)

- `web/`: Web App (Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts, Multi-AI Gateway API, Custom Card Settings).
- `android/`: Native Android Application cho màn hình ZESTECH 9 inch (Kotlin, Jetpack Compose, Room DB, WorkManager sync engine, Bluetooth SPP/BLE transport, Virtual Odometer Engine).
- `supabase/migrations/`:
  - `0001_initial_schema.sql`: Core schema (`assets`, `capabilities`, `trips`, `fuel_logs`, `maintenance`, `expenses`, `loans`, `sync_queue`).
  - `0002_indexes.sql`: Composite indexes cho truy vấn thời gian thực.
  - `0003_rls_policies.sql`: Bảo mật Row Level Security cho Fleet/User isolation.
  - `0004_functions_triggers.sql`: Triggers tính tổng chi phí & Virtual ODO offset.
  - `0005_seed_initial_data.sql`: Dữ liệu demo khởi tạo.

---

## 🚀 HƯỚNG DẪN CHẠY WEB APP LOCAL

```bash
cd web
npm install
npm run dev
```

Mở trình duyệt tại: `http://localhost:3000`

---

## 📱 HƯỚNG DẪN BUILD ANDROID APP CHO ZESTECH 9"

1. Mở dự án trong **Android Studio**: `android/`
2. Sync Gradle với JDK 17.
3. Build APK Debug hoặc Release:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
4. Copy file `app-debug.apk` cài đặt trực tiếp lên màn hình ZESTECH 9 inch qua USB.

---

## 🛡️ BẢO MẬT & SECRET RULES

- URL Supabase: `https://opslebsdmwsnsyfmbynf.supabase.co`
- Mọi bí danh bí mật (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,...) được quản lý thông qua biến môi trường server-side, tuyệt đối không hardcode trong client APK hoặc GitHub repository.
