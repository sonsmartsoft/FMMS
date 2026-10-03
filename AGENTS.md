# 🤖 AGENTS.md — Bộ Nhớ Hệ Thống & Ngữ Cảnh Toàn Diện Dự Án FMMS
*(Cập nhật lần cuối: 03/10/2026 — Tự động nạp ngữ cảnh cho AI Assistant ngay cả sau khi cài lại máy Mac)*

> **QUY TẮC BẮT BUỘC CHO AI AGENT**:
> 1. Luôn giao tiếp với người dùng bằng **Tiếng Việt** rõ ràng, ngắn gọn, đi thẳng vào kết quả.
> 2. Dự án gồm **4 phân hệ đồng bộ chung 1 cơ sở dữ liệu Supabase (`opslebsdmwsnsyfmbynf`)**:
>    - `web/`: Ứng dụng Web Quản trị Phương tiện & Tài chính Gia đình (Next.js 14 App Router, triển khai tại `fmms.vercel.app`).
>    - `mobile/`: Ứng dụng Tài chính & Sổ Thu Chi Đa Nền Tảng (Flutter — chạy giống nhau 100% trên cả **iPhone iOS** và **Điện thoại Android**, Bundle ID / Package: `com.sonsmartsoft.fmms`, phiên bản `v1.2.0`).
>    - `android/`: Ứng dụng Đầu Xe Ô Tô ZESTECH 9" (Kotlin + Jetpack Compose, Package: `com.fmms.carlogger`, bản mới nhất **REV 140**).
>    - `supabase/`: Toàn bộ schema PostgreSQL, migrations, triggers đồng bộ 2 chiều và RLS policies.
> 3. **Thư mục bộ cài phát hành (`releases/`) luôn phải phân loại rõ 2 nhánh**:
>    - `releases/App_Android_Xe_OTo_OBD/FMMS_CarLogger_OBD_rev140.apk` — Dành riêng cho màn hình Android đầu xe ô tô Zestech (`com.fmms.carlogger`).
>    - `releases/App_Tai_Chinh_Mobile/FMMS_Finance_Android_v1.2.0.apk` — Dành riêng cho điện thoại Android quản lý tài chính (`com.sonsmartsoft.fmms`).

---

## 1. Thông Tin Định Danh Thiết Bị & Hệ Thống

### A. Cơ sở dữ liệu Cloud (Supabase)
- **Project ID**: `opslebsdmwsnsyfmbynf`
- **URL**: `https://opslebsdmwsnsyfmbynf.supabase.co`
- **Publishable Key**: `sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3`
- **Phương tiện chính (Mazda 2 AT 2026 - BKS `19B-213.87`)**:
  - `asset_id`: `20260308-0001-4222-8888-19b213872026`
- **Git Remote**: `git@github-sonsmartsoft:sonsmartsoft/FMMS.git` (nhánh `main`)
- **Ổ cứng di động sao lưu**: `/Volumes/T9/FMMS` và `/Volumes/T9/FMMS_BACKUP`

### B. Danh sách thiết bị phần cứng đã kết nối & cài đặt
1. **iPhone 15 (`uti’s iPhone`)**:
   - UDID: `00008120-0010543410A14032`
   - App: `com.sonsmartsoft.fmms` (Bản **Release** Flutter iOS, Apple Team ID: `GXMUTB8YR3` / `sondtk5@gmail.com`)
2. **iPhone 11 (`Iphone`)**:
   - UDID: `00008030-0008392A2233402E`
   - App: `com.sonsmartsoft.fmms` (Bản **Release** Flutter iOS; `Runner.xcscheme` đã chỉnh `LaunchAction` mặc định sang `Release` để mở độc lập không cần gắn cáp Xcode debugger)
3. **Điện thoại Samsung Galaxy A52 (`SM-A525F`)**:
   - ADB Serial: `R58R76VJLEV`
   - App: `com.sonsmartsoft.fmms` (`FMMS_Finance_Android_v1.2.0.apk`)
4. **Đầu Android Xe Ô Tô ZESTECH 9" (Mazda 2)**:
   - ADB over Wi-Fi: Port `5555` (IP thường gặp: `192.168.1.72`, `192.168.1.63`, `192.168.1.95`, `192.168.1.87`)
   - OBD-II Adapter: **KONNWEI KW906 BLE GATT** (`5C:F0:0A:05:A3:F7`)
   - App: `com.fmms.carlogger` (Bản **REV 140**)

---

## 2. Lịch Sử Các Hạng Mục Đã Hoàn Thành (Đến 03/10/2026)

### A. Phân hệ Đầu Xe Android (`android/` — `com.fmms.carlogger` — Bản REV 140)
- **REV 140 (03/10/2026) — Sửa triệt để lỗi không tự khởi động khi nổ máy trên đầu Zestech**:
  - **Nguyên nhân gốc**: Đầu xe Zestech (`com.nwd.*`) không cold-boot khi tắt máy mà vào chế độ ngủ đông (**ACC Sleep**) và gọi `NwdManagerService.forceStopPackage` tắt các ứng dụng bên thứ 3; khi bật khóa điện (**ACC ON**), đầu xe thức dậy từ RAM nên không phát `BOOT_COMPLETED`. Ngoài ra khi tắt khóa điện, Bluetooth tắt đột ngột gây lỗi `DeadSystemRuntimeException` tại `BleOBDTransport.writeChunks()` làm sập tiến trình, và `BootReceiver` cũ để `exported="false"` + `goAsync()` delay 12s (vượt ngưỡng ANR 10s của Android).
  - **Giải pháp đã triển khai**:
    1. Tạo [`KeepAliveBootService.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/service/reboot/KeepAliveBootService.kt) kế thừa `NotificationListenerService` và đăng ký vào `Settings.Secure.enabled_notification_listeners` (cùng cơ chế với `KikiBootService` và `com.zestech.dvd.service.BootService`). Ngay sau khi `NwdManagerService` `forceStop` lúc tắt máy, hệ thống Zestech tự động re-bind dịch vụ này sau 200ms, xóa cờ `stopped=true` và giữ `BroadcastReceiver` động trong RAM để bắt `ACTION_SCREEN_ON` + `com.nwd.action.ACTION_MCU_STATE_CHANGE` ngay giây đầu tiên khi nổ máy.
    2. Cập nhật [`BootReceiver.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/service/reboot/BootReceiver.kt) và [`AndroidManifest.xml`](file:///Users/uti/Documents/FMMS/android/app/src/main/AndroidManifest.xml): bật `android:exported="true"`, `directBootAware="true"`, nhận đầy đủ tín hiệu đánh thức phần cứng Zestech (`com.nwd.action.ACTION_MCU_STATE_CHANGE`, `com.nwd.ACTION_OS_WAKE_UP`, `USB_DEVICE_ATTACHED`, `USB_PORT_CHANGED`, `MEDIA_MOUNTED`, `CONNECTIVITY_CHANGE`, `BOOT_COMPLETED`), rút ngắn `goAsync()` xuống `< 3s`.
    3. Bọc `try/catch (Throwable)` cho toàn bộ thao tác GATT trong [`BleOBDTransport.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/core/obd/BleOBDTransport.kt) và bỏ qua `DeadSystemRuntimeException` trên background thread trong [`FmmsApplication.kt`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/FmmsApplication.kt).
    4. Tự động kích hoạt `startTelemetryService()` ngay trong [`AppContainer.init()`](file:///Users/uti/Documents/FMMS/android/app/src/main/java/com/fmms/carlogger/AppContainer.kt) mỗi khi tiến trình được đánh thức.
- **REV 131–139**:
  - Sửa thuật toán tính quãng đường chuyến đi (ưu tiên hiệu số ODO ECU trong cửa sổ 25s, chỉ bù GPS ở hai đầu chưa phủ ODO, loại bỏ nhân đôi quãng đường).
  - Thêm giao diện CarUI Launcher, ADAS CameraX + TFLite nhận diện vật cản, Lịch Vạn Niên (`LunarCalendarScreen`), Quét cảm biến áp suất lốp (`TpmsScanScreen`), Trình phát YouTube nhúng (`media3-exoplayer-hls`).

### B. Phân hệ App Tài Chính Mobile (`mobile/` — Flutter iOS & Android — `v1.2.0`)
- Giao diện chuẩn **Spendee + MISA Sổ Thu Chi** tối ưu cho iPhone (11, 15) và Android (Samsung Galaxy A52):
  - **Tổng quan & Sổ thu chi (`CashbookScreen`)**: Bộ lọc thời gian thông minh, tìm kiếm, груп theo ngày, đồng bộ thời gian thực với bảng `transactions` và `expenses` trên Supabase.
  - **Ghi chép bằng Giọng nói AI & Quét hóa đơn**: Nhập liệu tự nhiên tiếng Việt, tự động bóc tách số tiền, danh mục, ví và ghi chú.
  - **Quản lý Đa Ví, Ngân sách 6 Hũ, Sổ Nợ & Khoản Vay, Bảo mật FaceID/Vân tay**.
  - **Đồng bộ 100% iOS & Android**: Đã cấu hình đầy đủ `mobile/android` (Gradle Kotlin DSL, `compileSdk = 36`, `FlutterFragmentActivity`, quyền Microphone/Speech/Camera/Biometrics) và `mobile/ios` (`Runner.xcscheme` mặc định build **Release** để chạy độc lập không cần máy tính).

### C. Phân hệ Web (`web/` — Next.js 14)
- **Sửa lỗi báo cáo lịch sử di chuyển & ODO theo ngày (`web/app/assets/[id]/page.tsx` - commit `34e7172`)**:
  - Thuật toán `Auto Gap Detection` và `dailyReport` đã tiến `prevTripEndOdo` qua các mốc checkpoint rời rạc (`FUEL`, `ODO_LOG`, `MAINTENANCE`, `EXPENSE`) để không cộng dồn nhầm quãng đường của các ngày chỉ đổ xăng (ví dụ ngày 28–29/09: `86.5 km`) sang ngày 01/10.
  - Phân bổ chính xác quãng đường thiếu hụt trước chuyến đầu ngày (`44.6 km`, `3,818.3 → 3,862.9 km`) về ngày 30/09, giúp ngày **01/10/2026** hiển thị chuẩn xác **26.6 km** (`3,862.9 → 3,889.5 km`).
  - Thêm bộ lọc nhanh `'Tháng 10'`, mở rộng cửa sổ `DrillDownModal` gấp đôi (`1200px`), cảnh báo hạn bảo dưỡng thông minh theo màu sắc.
