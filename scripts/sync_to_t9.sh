#!/usr/bin/env bash
# ==============================================================================
# FMMS Live Mirror Sync to T9 External Drive
# Đồng bộ tức thì (<1s) toàn bộ mã nguồn FMMS từ Mac sang /Volumes/T9/FMMS
# ==============================================================================

set -e

SOURCE_DIR="/Users/uti/Documents/FMMS"
T9_DIR="/Volumes/T9"
DEST_DIR="${T9_DIR}/FMMS"

# 1. Kiểm tra ổ T9 có đang kết nối không
if [ ! -d "${T9_DIR}" ]; then
  if [ -t 1 ]; then
    echo "ℹ️ Ổ cứng T9 chưa được kết nối tại ${T9_DIR}."
  fi
  exit 0
fi

mkdir -p "${DEST_DIR}"

# 2. Đồng bộ siêu tốc (< 1 giây)
# Loại trừ các file cache và build: node_modules, .next, .gradle, build, .DS_Store, .git
rsync -a --delete \
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
  "${SOURCE_DIR}/" "${DEST_DIR}/"

# 3. Dọn file ẩn AppleDouble của macOS trên ổ ngoài
find "${DEST_DIR}" -name "._*" -delete 2>/dev/null || true

# 4. In thông báo nếu chạy trực tiếp trên Terminal
if [ -t 1 ]; then
  SIZE=$(du -sh "${DEST_DIR}" | awk '{print $1}')
  echo "✅ Đã đồng bộ sang ổ T9: ${DEST_DIR} (${SIZE})"
  echo "🕒 Cập nhật lúc: $(date '+%Y-%m-%d %H:%M:%S')"
fi
