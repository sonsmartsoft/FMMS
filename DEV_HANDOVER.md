# 🛠️ FMMS — HỒ SƠ BÀN GIAO & KHÔI PHỤC HỆ THỐNG SAU KHI CÀI LẠI MAC
*(Cập nhật đầy đủ đến ngày **03/10/2026** — Bao gồm toàn bộ 4 phân hệ: Web, Mobile iOS/Android, Android Đầu Xe Zestech REV 140 & Supabase)*

> **QUAN TRỌNG TRƯỚC KHI CÀI LẠI MÁY MAC**:
> Toàn bộ mã nguồn, các bản cài đặt APK, khóa ký ứng dụng (`debug.keystore`), khóa SSH (`~/.ssh`), và **toàn bộ lịch sử não bộ trò chuyện AI Antigravity (`~/.gemini/antigravity/brain`)** đều đã được sao lưu tự động sang ổ cứng di động **Samsung T9** tại:
> - `/Volumes/T9/FMMS` (Bản sao đồng bộ trực tiếp toàn bộ dự án)
> - `/Volumes/T9/FMMS_BACKUP` (Bản nén snapshot + bộ công cụ khôi phục sau khi cài lại Mac `mac_restore_kit/`)

---

## 1. Cấu Trúc Thư Mục Chuẩn Của Dự Án (`/Users/uti/Documents/FMMS`)

```text
FMMS/
├── AGENTS.md                            # Bộ nhớ tổng thể cho AI Agent (tự động đọc khi mở dự án)
├── DEV_HANDOVER.md                      # Tài liệu bàn giao & hướng dẫn khôi phục khi cài lại Mac
├── README.md                            # Giới thiệu tổng quan kiến trúc hệ thống FMMS
├── releases/                            # 📦 THƯ MỤC BỘ CÀI APK ĐÃ PHÂN LOẠI RÕ RÀNG
│   ├── App_Android_Xe_OTo_OBD/          # 🚗 App dành riêng cho màn hình Android đầu xe Zestech
│   │   └── FMMS_CarLogger_OBD_rev140.apk
│   └── App_Tai_Chinh_Mobile/            # 📱 App Quản lý Tài chính & Sổ thu chi cho ĐT Android
│       └── FMMS_Finance_Android_v1.2.0.apk
├── web/                                 # 🌐 Web App (Next.js 14 App Router - fmms.vercel.app)
├── mobile/                              # 📱 Mobile App (Flutter iOS & Android - com.sonsmartsoft.fmms)
│   ├── ios/                             # Dự án Xcode cho iPhone 11 & iPhone 15 (Mặc định Release)
│   ├── android/                         # Dự án Android cho Samsung A52 & điện thoại Android
│   └── releases/                        # Bản lưu APK Mobile Finance
├── android/                             # 🚗 In-Car Android App cho đầu Zestech 9" (com.fmms.carlogger)
│   ├── app/                             # Mã nguồn Kotlin + Jetpack Compose + BLE OBD KW906
│   └── releases/                        # Bản lưu FMMS_rev140.apk + CHANGELOG_ANDROID.md + OLD/
├── supabase/                            # ☁️ Cơ sở dữ liệu Supabase (Migrations, Triggers, SQL)
├── scripts/                             # ⚡ Các script tự động hóa đồng bộ, sao lưu & khôi phục
│   ├── sync_to_t9.sh                    # Đồng bộ toàn bộ dự án + APK + AI Brain sang ổ T9
│   ├── backup_to_t9.sh                  # Nén snapshot .tar.gz có gắn timestamp sang ổ T9
│   └── restore_after_mac_reinstall.sh   # Script 1-chạm khôi phục toàn bộ sau khi cài lại Mac
├── docs/                                # 📚 Tài liệu kiến trúc, đặc tả kỹ thuật & Design System
└── history/                             # 📜 Nhật ký lịch sử phát triển chi tiết
```

---

## 2. Hướng Dẫn Khôi Phục 1-Chạm Sau Khi Cài Lại Máy Mac

Sau khi cài mới lại macOS và cắm ổ cứng **Samsung T9** vào máy:

### Bước 1: Chạy script khôi phục tự động từ ổ T9
Mở **Terminal** và chạy lệnh:
```bash
bash /Volumes/T9/FMMS/scripts/restore_after_mac_reinstall.sh
```
Script này sẽ tự động thực hiện:
1. Copy toàn bộ dự án từ `/Volumes/T9/FMMS` về `/Users/uti/Documents/FMMS`.
2. Khôi phục khóa SSH (`~/.ssh/id_ed25519_sonsmartsoft` & `~/.ssh/config`) để đẩy code lên GitHub ngay lập tức mà không cần tạo lại key.
3. Khôi phục khóa ký Android (`~/.android/debug.keystore`) để khi build APK mới có thể **cài đè (`adb install -r`)** trực tiếp lên đầu xe và điện thoại mà không bị lỗi lệch chữ ký.
4. Khôi phục toàn bộ lịch sử hội thoại và bộ nhớ của **Antigravity AI** (`/Users/uti/.gemini/antigravity/brain/8e2a0311-2116-4248-bf08-b99129c55dc4`) để AI nhớ 100% lịch sử trao đổi trước đó.

### Bước 2: Cài đặt công cụ biên dịch (nếu cần build mới)
- **Web (`web/`)**: Cài Node.js 20+, chạy `cd ~/Documents/FMMS/web && npm install && npm run dev`.
- **Mobile (`mobile/`)**: Cài Flutter SDK + Xcode (đăng nhập Apple ID `sondtk5@gmail.com` trong *Xcode -> Settings -> Accounts*).
- **Android Đầu Xe (`android/`)**: Cài Android SDK tại `/Users/uti/Library/Android/sdk`.

---

## 3. Lệnh Cài Đặt Nhanh Cho Từng Thiết Bị

### A. Cài App Đầu Xe Ô Tô Zestech (`com.fmms.carlogger` — REV 140)
```bash
# Thay IP_DAU_XE bằng IP hiện tại của đầu xe (ví dụ 192.168.1.72 hoặc 192.168.1.63)
IP_DAU_XE="192.168.1.72"
adb connect ${IP_DAU_XE}:5555
adb -s ${IP_DAU_XE}:5555 install -r ~/Documents/FMMS/releases/App_Android_Xe_OTo_OBD/FMMS_CarLogger_OBD_rev140.apk

# Cấp quyền tự chạy ngầm & tự thức dậy sau khi tắt/bật khóa điện ACC (chỉ cần chạy 1 lần)
adb -s ${IP_DAU_XE}:5555 shell "cmd notification allow_listener com.fmms.carlogger/com.fmms.carlogger.service.reboot.KeepAliveBootService; dumpsys deviceidle whitelist +com.fmms.carlogger; appops set com.fmms.carlogger RUN_IN_BACKGROUND allow; appops set com.fmms.carlogger RUN_ANY_IN_BACKGROUND allow; am start -n com.fmms.carlogger/.ui.MainActivity"
```

### B. Cài App Tài Chính Lên Điện Thoại Android (Samsung Galaxy A52)
```bash
adb install -r ~/Documents/FMMS/releases/App_Tai_Chinh_Mobile/FMMS_Finance_Android_v1.2.0.apk
```

### C. Cài App Tài Chính Bản Release Lên iPhone 11 / iPhone 15
*(Bắt buộc cài bản **Release** để mở app độc lập khi rút cáp)*:
```bash
cd ~/Documents/FMMS/mobile/ios
xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Release -destination 'generic/platform=iOS' -allowProvisioningUpdates build

# Cài lên iPhone 11 (00008030-0008392A2233402E) hoặc iPhone 15 (00008120-0010543410A14032)
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "Runner.app" | grep "Release-iphoneos" | head -n 1)
xcrun devicectl device install app --device 00008030-0008392A2233402E "$APP_PATH"
xcrun devicectl device process launch --device 00008030-0008392A2233402E com.sonsmartsoft.fmms
```
*(Hoặc mở `mobile/ios/Runner.xcworkspace` bằng Xcode rồi bấm nút **Run ▶** — `Runner.xcscheme` đã được cấu hình sẵn `buildConfiguration = "Release"`).*