# GHI CHÚ ĐẦU ZESTECH (Mazda2 AT 2026) — KIẾN THỨC TÍCH LŨY

> Cập nhật: 23/08/2026. Tài liệu này tổng hợp mọi thứ đã học được khi đưa FMMS
> lên đầu xe: phần cứng, camera, CAN/OBD an toàn, YouTube, quy trình build/cài.

---

## 1. Thông số đầu máy & kết nối

| Hạng mục | Giá trị đã chốt |
|---|---|
| Đầu máy | ZESTECH N70 (Android 13), màn 2000×1200, SoC **Unisoc** |
| ADB WiFi | `adb connect <IP>:5555` — **IP thay đổi** (.70 → .76), kiểm tra bằng `ping` trước |
| ADB flaky | push hay bị `failed to read copy response: EOF`; `adb disconnect` + `connect` để hồi sinh; nếu vẫn lỗi → dùng thẳng `adb install -r` (streamed) |
| Quy trình cài | build → `push /data/local/tmp/fmms.apk` → `pm install -r`, xác nhận `Success` + `dumpsys package ... lastUpdateTime` |
| WebView hệ thống | **com.android.webview Chromium 101.0.4951.61 (2022)** — KHÔNG đổi được sang Chrome (`cmd webviewupdate set-webview-implementation com.android.chrome` FAIL vì khoá chữ ký). Đây là trần kỹ thuật cho mọi tính năng web |
| App có sẵn | AVM 360 cam `com.ivicar.avm` (tự chạy lại + giữ cam), camera core `com.nwd.camera.core` (giữ device 1), ZTTube `com.lochv.zestech.ZTTube` (NewPipe fork), **YouTube chính thức cũng có**, Chrome 151, EZVIZ, Hik-Connect, VIETMAP LIVE… |

### Bài học WebView cũ (Chromium 101)
- m.youtube.com: duyệt/tìm OK, **video KHÔNG render** (audio chạy, decoder
  `C2UnisocVideoDecoderComponent` chạy, nhưng frame không lên màn).
- YouTube Leanback `/tv`: phát nhạc được nhưng UI xấu, vẫn không xem được hình.
- `LAYER_TYPE_SOFTWARE`: làm bố cục trang vỡ nặng hơn → **đừng dùng**.
- Chặn ads bằng shouldInterceptRequest + CSS + auto-skip JS hoạt động tốt
  (chỉ can thiệp khi `.ad-showing`; tuyệt đối không match `.ytp-ad-module`
  vì node đó luôn tồn tại → sẽ tua nhạc đang chơi về cuối).
- Kết luận: **mọi video web đều chết ở đây**. Muốn nhúng video thật thì phải
  player riêng (ExoPlayer) — xem mục 4.

---

## 2. Camera 360 (học từ app AVM)

### Sơ đồ camera
- Camera2 ID khả dụng cho app thứ ba: **2, 3, 4, 5** (device 1 do nwd core giữ).
- Mapping thực tế (người dùng đã sửa): **4=TRƯỚC, 2=SAU, 3=TRÁI, 5=PHẢI**
- Cam TRÁI/PHẢI gắn XOAY 90° — bằng chứng: APK AVM
  `/system/app/avm_nowada_N70_VP1.1.14.apk`, assets `adjust_displayviews.json`
  có riêng view "Left(Rotate 90°)" / "Right(Rotate 90°)".
  Chiều xoay (CW hay CCW) chưa chốt trực quan — dùng long-press để chỉnh.
- Stream SurfaceTexture: 1280×720 (xác nhận qua dumpsys media.camera).
- AVM render bằng OpenGL + khử méo fisheye; FMMS chỉ cover-crop gần đúng.

### App AVM tự chiếm camera → phải `am force-stop com.ivicar.avm` trước khi mở tab 360.

### Bài học render (QUAN TRỌNG — đừng lặp lại)
- ❌ TextureView.setTransform với ma trận tự dựng (cả chiều xuôi lẫn ngược):
  ảnh bị thu vào một góc trên máy này — bỏ hẳn.
- ✅ **SurfaceView + holder.setFixedSize đúng tỉ lệ + quay bằng
  `graphicsLayer { rotationZ }` của Compose** — ổn định.
- ✅ Cam bên (xoay 90°): crop dọc 9:16 giữa khung sensor qua
  `CaptureRequest.SCALER_CROP_REGION` (405×720 giữa 1280×720) +
  surface dọc 720×1280 + rotationZ 90° → ảnh ngang 16:9 chuẩn, không méo.
- ✅ GIỮ LÂU ô cam = đổi góc 0→90→180→270 (hiệu chỉnh tại chỗ).
- Verify không nhìn ảnh trực tiếp được: screencap → PIL/numpy đo % phủ nội dung
  từng ô (threshold sáng >16, span hàng/cột >10%) + motion diff 2 ảnh cách nhau 2s.

---

## 3. CAN/OBD — đọc số hộp số THẬT + AN TOÀN BUS ⚠️

### Bảng gear đã chốt (quét 2026-08-23 + live verify)
- **ID 228 byte0 nibble-thấp**: `01=P, 02=R, 03=N, 04=D`
- **Đối chứng chéo**: byte1 của **ID 131** phải == nibble của 228, lệch → bỏ mẫu.
- Byte4 = 0x20 là HẰNG SỐ, KHÔNG phải bitmask số (lý thuyết cũ sai).

### Kiến trúc đọc
- Vòng quét PID chính ~2.5s/lệnh (full sweep ~3 phút) — KHÔNG nhồi ATMA vào đây.
- `gearJob` coroutine riêng, chu kỳ **1.2s**, gọi `sniffCanGear()`:
  `AT H1` + `AT S1` (header) rồi `ATMA` 300ms, parse frame, đối chứng chéo.
- Kết quả → `_live.gearLabel` (P/R/N/D). Không có tín hiệu → null → UI "--".
- Khi lái: fallback ước tính từ RPM/tốc độ ("D#").
- Header tự hồi phục: frames rỗng → cờ `canHeadersSet=false` để gửi lại lệnh header.

### ⚠️ LƯU Ý AN TOÀN GỬI DATA OBD (sự cố đèn pha nháy)
Nguyên nhân gốc lần trước: ATMA chạy liên tục + **lệnh PID chen ngang cửa sổ
ATMA** (không có khoá giao dịch) → adapter clone rối → error frames trên bus →
ECU đèn pha nháy. Đã vá và PHẢI GIỮ nguyên:
1. **Khoá giao dịch chung `elms.transactionMutex`**: mọi phiên ATMA giữ khoá suốt
   (header + capture + abort); mọi lệnh PID cũng qua khoá này. Tuyệt đối không
   gọi thẳng transport ngoài khoá.
2. **CHỈ sniff khi xe đứng yên (< 3 km/h)** — đang lái không gửi bất kỳ lệnh CAN
   nào; số D lúc chạy do ước lượng RPM/tốc độ.
3. **Backoff**: ≥4 mẫu trống liên tiếp → nghỉ 30s + buộc gửi lại header.
4. Teardown ATMA sạch: sau 300ms gom dữ liệu, gửi byte `"."` để thoát monitor,
   nghỉ thêm 150ms (đã có trong `BleOBDTransport.captureStream`).
5. Cờ `DATA ERROR` trong dump = adapter nghe hụt CRC (thụ động, không phát ra
   bus) — chấp nhận được; đèn không nháy từ sau bản vá khoá.

---

## 4. YouTube trong app — lộ trình & phương án chốt

Đã thử & thất bại/bị loại trên đầu:
1. WebView m.youtube + chặn ads → video đen (WebView 101), từng có bug:
   Box fillMaxSize chặn hết touch (sửa: AndroidView trực tiếp, nút nổi nhỏ góc),
   skip-JS tua cả nhạc (sửa: chỉ khi `.ad-showing`).
2. Mở app ngoài khi bấm video → người dùng TỪ CHỐI (muốn nhúng hoàn toàn).
3. Ép software rendering → vỡ bố cục. Leanback TV → xấu, vẫn không xem được hình.

**Phương án chốt (đang chạy): player RIÊNG của app**
- File `app/src/main/java/com/fmms/carlogger/ui/carui/YtPane.kt`.
- Tìm kiếm qua **API Piped** (mở, không key, không quảng cáo), fallback 4
  instance: kavin.rocks, adminforge.de, private.coffee, drgns.space
  (`GET /search?q=&filter=videos`, lấy stream qua `/streams/<id>` → field `hls`).
- Phát HLS bằng **ExoPlayer media3 1.3.1** (`media3-exoplayer`,
  `media3-exoplayer-hls`, `media3-ui`) — đường native MediaCodec, không dính
  lỗi compositing của WebView.
- UI: search bar + list kết quả + PlayerView 16:9 có controller đầy đủ.

---

## 5. UI Car UI đã chốt

- Hàng gauge CAR UI: **COOLANT | FUEL | RPM | ENGINE LOAD** — ô VOLTAGE đã thay
  bằng gauge RPM (`RpmGaugeCell`): số tua + thanh tỉ lệ 0–8000, vàng ≥6000, đỏ ≥6500.
  Nhãn VI: "VÒNG TUA".
- Fuel rate: hiển thị LiveDataScreen; fallback `fuelRate ≈ MAF × 0.33` khi ECU
  không trả PID 5E.
- Tab 360: lưới 2×2 có nhãn Trước/Sau/Trái/Phải, bấm phóng to 1 cam + nút back.
- Tab YouTube: overlay nổi như WEB, nút phóng toàn màn (ytFull) — giờ là player
  native, không còn WebView.

---

## 6. Quy trình build / cài / verify

```bash
# Build
cd /Users/uti/Documents/FMMS/android
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug
# APK: $TMPDIR/opencode/fmms-android-build/app/outputs/apk/debug/app-debug.apk

# Cài lên đầu (wifi) — retry tới khi Success
adb disconnect; adb connect <IP>:5555
adb push app-debug.apk /data/local/tmp/fmms.apk && adb shell pm install -r ...
# Nếu EOF lặp lại → adb install -r streamed

# Cài lên A52 (USB, id R58R76VJLEV)
adb -s R58R76VJLEV install -r app-debug.apk
# Bản xuất lưu: ~/Downloads/FMMS-<timestamp>.apk
```

Verify từ xa (KHÔNG nhìn ảnh được): uiautomator dump + python parse text/bounds;
screencap + PIL/numpy (phủ nội dung, motion diff); logcat grep
(GearSniff, chromium, ActivityTaskManager START); dumpsys media.camera (ai giữ
cam), dumpsys window/activity (focus), dumpsys package (lastUpdateTime).

---

## 7. Việc còn treo (next steps)
- [ ] Xác nhận trực quan hướng xoay cam trái/phải (long-press chỉnh tạm, chốt số vào `CAM_ROTATION`).
- [ ] Test YouTube native pane trên đầu (Piped instance nào tới được từ VN).
- [ ] Đồng bộ cloud: SyncWorker policy UPDATE + enqueue fuel_logs (chưa fix).
- [ ] Release build (minify, signing) + git commit.

---

## 8. CẢM BIẾN TPMS ZESTECH — GIAO THỨC ĐÃ REVERSE

### Phần cứng
- Bộ thu TPMS ZESTECH nối qua **USB, chip WCH CH9326**
  (`VID=0x1A86`, `PID ∈ {0xE010, 0x7513, 0x5523}`) — driver tối giản trong
  `core/usb/Ch9326Uart.kt`, cấu hình UART copy từ app gốc (8 data bits…).
- Lộ trình BLE cũ (rev38: quét adv thô để học giao thức) đã BỎ vì OEM không
  publish tài liệu quảng cáo — chuyển hẳn sang đọc bộ thu USB này.

### Frame UART dạng ASCII `$....#` (nguồn: `TmpsProtocalUtils` của app gốc ZESTECH)
```
$<wheel><status><alarm><p><pp><tt>[bb]#
```
| Trường | Ý nghĩa |
|---|---|
| `wheel` | ký tự `0..3`: 0=trước-trái, 1=trước-phải, 2=sau-trái, 3=sau-phải |
| `status` | chữ số, bitmask: **bit0 rò nhanh, bit1 rò chậm, bit2 pin yếu, bit3 mất tín hiệu** |
| `alarm` | bitmask: **bit1 áp suất thấp, bit2 áp suất cao, bit3 nhiệt độ cao** |
| `p`+`pp` | kPa = `chữ số thập phân` + `2 ký tự HEX × 10` |
| `tt` | nhiệt độ HEX − **40 offset** = °C |
| `bb` | TUỲ CHỌN: % pin, nhiều frame/cảm biến KHÔNG gửi (để trống, hợp lệ 1–100) |

### Lệnh gửi xuống bộ thu
| Lệnh | Chức năng |
|---|---|
| `$PS#` | heartbeat — gửi mỗi 5s |
| `$TO#` / `$T1#` | bật / tắt truy vấn tự động |
| `$T4#` | truy vấn toàn bộ ID cảm biến |
| `$W1#` | truy vấn thông tin tất cả bánh (mỗi 15s cùng `$TO#`) |
| `$L<n>#` | học cảm biến cho bánh `<n>` (cửa sổ 60s) |
| `$LX#` | huỷ học |

### Vận hành (`data/tpms/TpmsMonitor.kt`)
- Vòng lặp tự mở lại cổng khi lỗi; **5 lần đọc rỗng liên tiếp → close + reopen**.
- Ring buffer parse theo ký tự `$`…`#`; frame >32 ký tự → bỏ (nhiễu).
- Log debug tag `TpmsMon`.
- Màn học/quét: `ui/tpms/TpmsScanScreen.kt`. Widget CarUi hiện 4 bánh
  (bar + °C + pin) và các cờ cảnh báo (rò nhanh/chậm, áp cao/thấp, nóng, pin yếu).

---

## 9. XE & BỘ THU OBD

- Adapter: **KONNWEI KW906** (ELM327 clone, Bluetooth Classic SPP).
- Mazda2 AT 2026 — VIN `MM7DL2SAAVW949603`.
- Protocol đúng của xe: **ATSP6 = ISO15765-4 CAN (11-bit ID, 500 Kbaud)**;
  chuỗi init `ATZ/ATE0/ATL0/ATS0/ATH0`, fallback ATSP0→7/8/9 nếu cần.
- PID chính: RPM `010C`, SPEED `010D`, COOLANT `0105`, FUEL `012F`,
  ODO live ECU `01A6`; fuel rate PID 5E thường không có → fallback MAF×0.33.
- Chi tiết an toàn bus xem mục 3 (ATMA/mutex/backoff).

---

## 10. APP TRÊN ĐÃ KHẢO SÁT / HỌC HỎI

| App | Package | Học được gì |
|---|---|---|
| AVM cam 360 | `com.ivicar.avm` | Mapping cam + xoay 90° cam bên (assets JSON); GL khử méo fisheye; tự chiếm cam khi chạy |
| Camera core | `com.nwd.camera.core` | Giữ device 1 — cam thứ ba không dùng được |
| ZTTube | `com.lochv.zestech.ZTTube` | NewPipe fork không quảng cáo có sẵn trên máy |
| YouTube | `com.google.android.youtube` | Có bản chính thức; từng dùng làm trình phát ngoài (user loại bỏ) |
| Lily dashboard | `com.sensornotes.xiaozhi` | Nguồn cảm hứng layout tab CAR UI (hero tốc độ + clock + gauge row); học màu qua PIL (#e0e9f3 nền, #1a73e8 số) |

### Phương pháp khảo sát app đầu (không xem được ảnh)
1. `adb pull /system/app/<apk>` → unzip → đọc `assets/*.json` / resources
   (ví dụ `adjust_displayviews.json` của AVM lộ cấu hình xoay view).
2. `uiautomator dump` lấy text + bounds từng node → suy ra bố cục/tọa độ tap.
3. Screencap PNG → PIL/numpy đo vùng sáng/màu/motion (so 2 frame cách nhau).

### Quyết định kiến trúc liên quan
- Android không nhúng app khác được → app ngoài chỉ mở bằng intent fullscreen;
  muốn "nhúng" thật sự phải tự render (WebView yếu, video web chết → player riêng).
- WEB pane chặn `shouldOverrideUrlLoading` mọi scheme khác http/https để trang
  không bị kéo nhảy ra app ngoài.

