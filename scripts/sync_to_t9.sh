#!/usr/bin/env bash
# ==============================================================================
# FMMS -> Samsung T9 Live Mirror Sync Script
# Đồng bộ trực tiếp toàn bộ dự án + các bản APK đã phân loại + Bộ khôi phục Mac
# (SSH keys, Android debug.keystore, và Lịch sử cuộc trò chuyện AI Antigravity)
# ==============================================================================
set -euo pipefail

SRC_DIR="/Users/uti/Documents/FMMS"
DEST_DIR="/Volumes/T9/FMMS"
RESTORE_KIT_DIR="/Volumes/T9/FMMS_BACKUP/mac_restore_kit"
CONV_ID="8e2a0311-2116-4248-bf08-b99129c55dc4"
BRAIN_SRC="/Users/uti/.gemini/antigravity/brain/${CONV_ID}"

if [ ! -d "/Volumes/T9" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Ổ T9 chưa được gắn tại /Volumes/T9"
  exit 1
fi

mkdir -p "$DEST_DIR"
mkdir -p "$DEST_DIR/releases/App_Android_Xe_OTo_OBD"
mkdir -p "$DEST_DIR/releases/App_Tai_Chinh_Mobile"
mkdir -p "$RESTORE_KIT_DIR/ssh"
mkdir -p "$RESTORE_KIT_DIR/android_keystore"
mkdir -p "$RESTORE_KIT_DIR/antigravity_brain/${CONV_ID}"

# 1. Đồng bộ toàn bộ mã nguồn dự án và các thư mục APK đã phân loại
rsync -a --delete \
  --exclude='web/node_modules' \
  --exclude='web/.next' \
  --exclude='mobile/build' \
  --exclude='mobile/.dart_tool' \
  --exclude='mobile/ios/Pods' \
  --exclude='mobile/ios/.symlinks' \
  --exclude='mobile/android/.gradle' \
  --exclude='mobile/android/app/build' \
  --exclude='android/.gradle' \
  --exclude='android/build' \
  --exclude='android/app/build' \
  --exclude='.DS_Store' \
  "$SRC_DIR/" "$DEST_DIR/"

# 2. Sao lưu khóa ký Android (để sau khi cài lại Mac vẫn cài đè APK không mất dữ liệu)
if [ -f "$HOME/.android/debug.keystore" ]; then
  cp -f "$HOME/.android/debug.keystore" "$RESTORE_KIT_DIR/android_keystore/debug.keystore"
fi

# 3. Sao lưu cấu hình & khóa SSH GitHub (bỏ qua unix socket trên ổ exFAT)
if [ -d "$HOME/.ssh" ]; then
  find "$HOME/.ssh" -maxdepth 1 -type f -exec cp -f {} "$RESTORE_KIT_DIR/ssh/" \; 2>/dev/null || true
fi

# 4. Sao lưu toàn bộ lịch sử trò chuyện & bộ nhớ AI Antigravity
if [ -d "$BRAIN_SRC" ]; then
  rsync -rt --delete \
    --exclude='.system_generated/tasks' \
    --exclude='transcript_full.jsonl' \
    "$BRAIN_SRC/" "$RESTORE_KIT_DIR/antigravity_brain/${CONV_ID}/"
fi

echo "✅ Đã đồng bộ dự án sang ổ T9: $DEST_DIR ($(du -sh "$DEST_DIR" | cut -f1))"
echo "✅ Đã sao lưu Bộ Khôi Phục Mac (SSH + Keystore + Lịch sử AI Brain): $RESTORE_KIT_DIR"
echo "🕒 Cập nhật lúc: $(date '+%Y-%m-%d %H:%M:%S')"
