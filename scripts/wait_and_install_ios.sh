#!/bin/bash

DEVICE_ID="00008120-0010543410A14032"
APP_PATH="/Users/uti/Documents/FMMS/build_ios/Runner.app"

echo "Chờ iPhone kết nối và mở khóa màn hình..."
for i in {1..1000}; do
  DEVICE_LINE=$(xcrun devicectl list devices | grep "$DEVICE_ID")
  
  if ! echo "$DEVICE_LINE" | grep -q "unavailable" && (echo "$DEVICE_LINE" | grep -E -q "connected|available"); then
    echo "Phát hiện iPhone đã sẵn sàng:"
    echo "$DEVICE_LINE"
    echo "Bắt đầu cài đặt bản Release..."
    if xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"; then
      echo "Khởi chạy ứng dụng..."
      xcrun devicectl device process launch --device "$DEVICE_ID" com.sonsmartsoft.fmms
      echo "✓ HOÀN TẤT CÀI ĐẶT BẢN RELEASE TRÊN IPHONE!"
      exit 0
    fi
  fi
  sleep 2
done

echo "Chưa phát hiện iPhone sẵn sàng (vui lòng mở khóa màn hình hoặc cắm cáp USB)."
exit 1
