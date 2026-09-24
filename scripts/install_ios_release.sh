#!/bin/bash
set -e

DEVICE_ID="00008120-0010543410A14032"
APP_PATH="/Users/uti/Library/Developer/Xcode/DerivedData/Runner-hgpolrvsgfcdmhhfhxkgmoksoypd/Build/Products/Release-iphoneos/Runner.app"

echo "=== ĐANG KIỂM TRA KẾT NỐI IPHONE ==="
xcrun devicectl list devices | grep "$DEVICE_ID" || true

echo "=== ĐANG CÀI ĐẶT BẢN RELEASE LÊN IPHONE ==="
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

echo "=== ĐANG KHỞI CHẠY APP COM.SONSMARTSOFT.FMMS TRÊN IPHONE ==="
xcrun devicectl device process launch --device "$DEVICE_ID" com.sonsmartsoft.fmms

echo "=== HOÀN TẤT THÀNH CÔNG ==="
