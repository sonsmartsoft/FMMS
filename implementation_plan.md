# Implementation Plan — Family Mobility Management System (FMMS)

Develop a complete, production-ready **Family Mobility Management System (FMMS)** covering multi-asset family tracking (Cars, Motorcycles, Bicycles, E-Bikes, Scooters), a responsive Web Management & Analytics Portal, a native Android in-car telemetry application for ZESTECH 9" ADAS (Mazda2 Base 2026 + KONNWEI KW906 OBD-II), PostgreSQL Supabase backend migrations with RLS, and an extensible Multi-AI Omnichannel Assistant layer.

---

## User Review Required

> [!IMPORTANT]
> **Key Architectural Decisions & User Configuration**
> 1. **Monorepo Directory Structure**: The project will be organized into `web/` (Next.js TypeScript Web App), `android/` (Native Kotlin Jetpack Compose app), and `supabase/` (Migrations, RLS policies, seeds).
> 2. **Multi-Asset Core Schema**: The database uses an `assets` core model with dynamic capability flags (`MILEAGE`, `GPS`, `FUEL`, `OBD`, `BATTERY`, `RIDE`, `FINANCE`, `INSURANCE`). A backward-compatible view `vehicles` is provided for seamless operational queries.
> 3. **Mazda2 Base 2026 Virtual Odometer Ledger**: Implements the fallback algorithm: `Verified OBD ODO` → `Vehicle-Specific ODO` → `GPS Trip Distance` → `Virtual Odometer Ledger` → `Manual Calibration`.
> 4. **Local-First Sync Engine**: Android collects OBD/GPS telemetry into local Room DB and pushes to Supabase via idempotent WorkManager sync queue. Cloud loss never halts OBD or trip logging.
> 5. **Multi-AI & Floating Assistant**: A global floating/draggable AI button will be integrated across the Web App with task-based routing (Gemini, OpenAI, Claude, Local LLM) and safe read/write function calling rules.

---

## Open Questions

> [!NOTE]
> **Implementation Clarifications**
> - **Web Stack Confirmation**: We will use Next.js 14+ (App Router) with TypeScript, Tailwind CSS, Lucide Icons, and Recharts/ECharts for analytics. Please confirm if you have any specific styling library preferences beyond standard Tailwind + CSS Glassmorphism.
> - **Default Assets**: We will include pre-seeded sample assets in Supabase migrations (e.g., Mazda2 Base 2026 Car, Road Bike, E-Bike) for immediate visual demonstration upon initial deployment.

---

## Proposed Changes

### 1. Database Schema & Migrations (`supabase/`)

#### [NEW] [`supabase/migrations/0001_initial_schema.sql`](file:///Users/uti/Documents/FMMS/supabase/migrations/0001_initial_schema.sql)
- Core tables: `profiles`, `fleets`, `assets`, `asset_types`, `asset_capabilities`, `devices`, `trips`, `rides`, `telemetry_samples`, `fuel_logs`, `battery_logs`, `charging_logs`, `daily_summaries`, `monthly_summaries`, `maintenance_records`, `parts`, `asset_parts`, `upgrades`, `expenses`, `loans`, `loan_payments`, `insurance_policies`, `registrations`, `vendors`, `asset_valuations`, `odometer_records`, `odometer_adjustments`, `sync_queue`, `obd_profiles`.
- Foreign key constraints referencing `asset_id` and `owner_id`.
- View `vehicles` mapped to `assets` for backward compatibility.

#### [NEW] [`supabase/migrations/0002_indexes.sql`](file:///Users/uti/Documents/FMMS/supabase/migrations/0002_indexes.sql)
- High-performance composite indexes on `(asset_id, timestamp)`, `(asset_id, start_time)`, `(asset_id, date)`, `(owner_id)`, `(fleet_id)`.

#### [NEW] [`supabase/migrations/0003_rls_policies.sql`](file:///Users/uti/Documents/FMMS/supabase/migrations/0003_rls_policies.sql)
- Row Level Security (RLS) on all tables allowing authenticated owners to read/write their authorized fleet and asset records.

#### [NEW] [`supabase/migrations/0004_functions_triggers.sql`](file:///Users/uti/Documents/FMMS/supabase/migrations/0004_functions_triggers.sql)
- Triggers for automatic summary updates (`daily_summaries`, `monthly_summaries`) and `virtual_odometer` calculation helpers.

#### [NEW] [`supabase/migrations/0005_seed_initial_data.sql`](file:///Users/uti/Documents/FMMS/supabase/migrations/0005_seed_initial_data.sql)
- Seed initial user fleet, Mazda2 Base 2026 asset, Road Bike asset, and sample maintenance/fuel logs.

---

### 2. Web Application (`web/family-mobility-web`)

#### [NEW] [`web/package.json`](file:///Users/uti/Documents/FMMS/web/package.json)
- Next.js 14, React 18, `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `recharts`, `framer-motion`, `clsx`, `tailwind-merge`.

#### [NEW] [`web/tailwind.config.js`](file:///Users/uti/Documents/FMMS/web/tailwind.config.js) & [`web/app/globals.css`](file:///Users/uti/Documents/FMMS/web/app/globals.css)
- Premium dark theme design system with Slate/Zinc gradients, Glassmorphism backdrop filters, vibrant status colors, custom scrollbars, and card styling.

#### [NEW] [`web/lib/supabase/client.ts`](file:///Users/uti/Documents/FMMS/web/lib/supabase/client.ts) & [`web/lib/supabase/server.ts`](file:///Users/uti/Documents/FMMS/web/lib/supabase/server.ts)
- Supabase browser and server-side client configurations reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

#### [NEW] [`web/app/page.tsx`](file:///Users/uti/Documents/FMMS/web/app/page.tsx)
- Home Dashboard:
  - Visual image-based asset cards for Mazda2, Motorcycle, Road Bike, E-Bike.
  - Summary metric cards (Total Assets, Monthly Distance, Total Fuel Cost, Operating Cost/km, Outstanding Loans).
  - Customizable card fields & settings toggle (photo, price, plate, ODO, fuel %, range, next maintenance).
  - Filter bar by asset group (Cars, Bicycles, E-Bikes) and quick search.

#### [NEW] [`web/app/assets/[id]/page.tsx`](file:///Users/uti/Documents/FMMS/web/app/assets/[id]/page.tsx)
- Asset Detail Workspace:
  - Dynamic capability-based tabs: Overview, Operation, Trips/Rides, Fuel/Battery, Maintenance, Parts, Upgrades, Expenses, Finance, Insurance, Documents, Analytics.
  - Custom header showing asset hero photo, status badge, and action buttons.

#### [NEW] [`web/components/ai/AIFloatingButton.tsx`](file:///Users/uti/Documents/FMMS/web/components/ai/AIFloatingButton.tsx) & [`web/components/ai/AIChatDrawer.tsx`](file:///Users/uti/Documents/FMMS/web/components/ai/AIChatDrawer.tsx)
- Global floating draggable AI button with position memory.
- Interactive AI chat drawer supporting natural language queries (in Vietnamese/English), current screen context awareness, multi-provider selection (Gemini, OpenAI, Claude, Local LLM), and function call execution cards.

#### [NEW] [`web/app/api/ai/chat/route.ts`](file:///Users/uti/Documents/FMMS/web/app/api/ai/chat/route.ts)
- Serverless AI Gateway API route: context builder fetching aggregated DB analytics, provider abstraction layer, and tool execution engine.

#### [NEW] [`web/app/settings/page.tsx`](file:///Users/uti/Documents/FMMS/web/app/settings/page.tsx) & [`web/app/health/page.tsx`](file:///Users/uti/Documents/FMMS/web/app/settings/health/page.tsx)
- Central settings center: Dashboard display customization, AI provider key manager, Supabase connection status check, storage & Edge function health indicators.

---

### 3. Native Android In-Car App (`android/MazdaCarLogger`)

#### [NEW] [`android/build.gradle.kts`](file:///Users/uti/Documents/FMMS/android/build.gradle.kts) & [`android/app/build.gradle.kts`](file:///Users/uti/Documents/FMMS/android/app/build.gradle.kts)
- Gradle configuration for Android SDK 34 (Android 13 target for ZESTECH 9" ADAS), Jetpack Compose, Hilt, Room DB, WorkManager, Coroutines, Flow, Supabase Kotlin SDK / Ktor.

#### [NEW] [`android/app/src/main/java/com/fmms/carlogger/core/obd/OBDConnectionManager.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/core/obd/OBDConnectionManager.kt)
- Bluetooth Classic/BLE transport wrapper for KONNWEI KW906 ELM327 adapter. Auto-reconnect flow, protocol initialization (`ATZ`, `ATE0`, `ATSP0`), PID bitmap scanner, diagnostic logging.

#### [NEW] [`android/app/src/main/java/com/fmms/carlogger/core/telemetry/TelemetryEngine.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/core/telemetry/TelemetryEngine.kt)
- Polling profiles (Fast: RPM/Speed 250ms; Normal: Load/Throttle/Coolant/MAF 1s; Slow: Fuel/Voltage 5s). Trip detection engine (start on movement/RPM, end on engine off + 3 min timeout).

#### [NEW] [`android/app/src/main/java/com/fmms/carlogger/core/odometer/VirtualOdometerEngine.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/core/odometer/VirtualOdometerEngine.kt)
- Distance source resolver: OBD ODO → Vehicle-Specific PID → GPS Trip Distance → Virtual Odometer calculation ledger. Manual calibration adjustment record logger.

#### [NEW] [`android/app/src/main/java/com/fmms/carlogger/data/sync/SyncWorker.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/data/sync/SyncWorker.kt)
- Room SQLite → Local Sync Queue → Supabase REST API via WorkManager. Idempotent upserting with local UUIDs.

#### [NEW] [`android/app/src/main/java/com/fmms/carlogger/ui/dashboard/DashboardScreen.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/ui/dashboard/DashboardScreen.kt)
- 9-inch Landscape ZESTECH UI dashboard: High contrast dark theme, large gauge targets (Speed, RPM, Fuel %, Range, Coolant Temp, Voltage, Today's Distance/Cost).

### 4. GPS Maps & Live Tracking (V5.3)

#### [NEW] [`android/.../core/database/entity/GpsTrackPointEntity.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/core/database/entity/GpsTrackPointEntity.kt)
- Room entity for `gps_track_points` (asset_id, trip_id, recorded_at, lat, lon, altitude, speed, accuracy, sync_status). Sampled every 5s + first/last point per trip.

#### [NEW] [`android/.../core/database/dao/GpsTrackPointDao.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/core/database/dao/GpsTrackPointDao.kt)
- DAO: insert, observe by trip, observe latest per asset, pending-sync query.

#### [NEW] [`android/.../ui/map/MapScreen.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/ui/map/MapScreen.kt)
- Live map screen hosted in Compose. Single `MapViewModel`; rendering delegated to `MapFactory` that picks the renderer at runtime:
  - Google Maps SDK (`google-maps-compose`) when Google Play Services present
  - osmdroid `MapView` fallback (ZESTECH, no GMS) with offline tile cache, dark/light tile background
- Features: live marker (from `GpsTracker`), running-trip polyline, historical trip replay, zoom controls.

#### [MOD] [`android/.../ui/dashboard/DashboardScreen.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/ui/dashboard/DashboardScreen.kt)
- Auto-fit: remove fixed landscape assumption; adapt dashboard to portrait/landscape via `BoxWithConstraints`; scrollable when narrow. (Partially done: manifest landscape forced was removed.)

#### [MOD] Android theme
- `MainActivity.kt:71`: replace hardcoded `darkColorScheme()` with theme-aware scheme driven by new `PrefsStore.theme` (dark/light/system), reactive to change.
- Refactor hardcoded colors (`0xFF0B0F19`, `0xFF111827`, accent colors) in `DashboardScreen`, `MoreScreen`, `TripsScreen`, `FuelScreen`, `StatsScreen` into a theme-aware palette.

#### [NEW] `supabase/migrations/0006_gps_track_points.sql`
- `gps_track_points` table + indexes `(asset_id, recorded_at)`, `(trip_id)` + RLS (owner via asset) + sync-queue compatible.

#### [MOD] `web/lib/services/tripService.ts` & new `web/lib/services/trackService.ts`
- Read `gps_track_points` from Supabase; group by trip for replay; last-known position per asset.

#### [NEW] `web/components/map/AssetMap.tsx` (Leaflet)
- Per-asset map tab: last position marker + trip list + polyline replay (no API key, OSM tiles).

#### [NEW] `web/app/fleet/map/page.tsx`
- Fleet live map: one marker per asset (last known GPS).

#### [NEW] `web/app/assets/[id]/page.tsx` map tab
- Reuse `AssetMap` component in the "Bản đồ" tab.

### 5. iOS Port — Future Work (planned after Android/Web ship)

Cross-platform contract is fixed at the **data + backend layer** so iOS plugs in with zero backend changes:

- `gps_track_points` schema + sync protocol identical to Android (no contract change).
- iOS live map via **Google Maps SDK for iOS**, with MapKit/Apple Maps as no-key offline-capable fallback (per spec §234).
- Trip replay + fleet map use the same Supabase data as Android/Web.
- Web map tab is device-agnostic (no iOS-specific branch).
- Theme config (Dark/Light/System) mirrors the Android setting contract.
- Supabase auth for iOS reuses the same project (email/password + magic link already supported).

---

## Verification Plan

### Automated Tests
- **Database Migrations Test**: Execute Supabase local CLI migration dry-run:
  `npx supabase db lint`
- **Web App Build**: Run Next.js build and type check:
  `npm --prefix web run build`
- **Android App Compile Check**: Verify Kotlin Gradle project structure and syntax validity.

### Manual Verification
1. **Web Dashboard Inspection**:
   - Open Web App, verify responsive grid card layout for Mazda2, Motorcycle, Road Bike, E-Bike.
   - Test settings customization: toggle card fields (Price, Fuel %, Plate), verify immediate visual update.
   - Click Mazda2 card to open detail workspace, test dynamic tabs (Overview, Operation, Fuel, Expenses, Maintenance, Finance).
   - Test Global Floating AI assistant button: drag, open chat, query "Mazda2 tháng này chạy bao nhiêu km?", verify structured response.
2. **Database & API Integration**:
   - Verify Supabase project connection health at `/settings/health`.
   - Test inserting new fuel log and expense record, confirm real-time calculation of cost/km.
3. **Android Application Verification**:
   - Verify OBD transport manager code, ELM327 initialization strings, PID parser routines, and 9-inch landscape Compose layout.
