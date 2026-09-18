#!/usr/bin/env bash
# ==============================================================================
# FMMS Folder Backup to T9 External Drive
# Đồng bộ trực tiếp code nguồn sang 1 thư mục bình thường trên T9,
# ghi đè mỗi lần chạy (rsync --delete), không dùng zip.
# ==============================================================================

set -e

SOURCE_DIR="/Users/uti/Documents/FMMS"
T9_DIR="/Volumes/T9"
BACKUP_DIR="${T9_DIR}/FMMS_BACKUP"

# 1. Kiểm tra ổ T9
if [ ! -d "${T9_DIR}" ]; then
  echo "❌ Lỗi: Ổ cứng T9 chưa được kết nối tại ${T9_DIR}!"
  exit 1
fi

echo "🚀 Bắt đầu sao lưu FMMS vào thư mục: ${BACKUP_DIR}..."
mkdir -p "${BACKUP_DIR}"

# 2. Đồng bộ trực tiếp từ Mac sang thư mục trên T9 (không qua /tmp, không zip)
rsync -a --delete "${SOURCE_DIR}/" "${BACKUP_DIR}/" \
  --exclude='web/node_modules' \
  --exclude='web/.next' \
  --exclude='web/.turbo' \
  --exclude='android/.gradle' \
  --exclude='android/app/build' \
  --exclude='android/.cxx' \
  --exclude='android/releases' \
  --exclude='*.DS_Store' \
  --exclude='*.log' \
  --exclude='.git' \
  --exclude='._*'

find "${BACKUP_DIR}" -name "._*" -delete 2>/dev/null || true

# 3. Thông báo kết quả
SIZE=$(du -sh "${BACKUP_DIR}" | awk '{print $1}')
echo "========================================================"
echo "✅ SAO LƯU HOÀN TẤT THÀNH CÔNG!"
echo "📁 Thư mục backup duy nhất: ${BACKUP_DIR}"
echo "📊 Dung lượng siêu gọn    : ${SIZE}"
echo "🕒 Cập nhật lúc           : $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"
