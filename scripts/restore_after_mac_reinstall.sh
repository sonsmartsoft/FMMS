#!/usr/bin/env bash
# ==============================================================================
# FMMS — 1-Click Mac Reinstall Restore Script
# Chạy lệnh: bash /Volumes/T9/FMMS/scripts/restore_after_mac_reinstall.sh
# ==============================================================================
set -euo pipefail

T9_PROJECT="/Volumes/T9/FMMS"
RESTORE_KIT="/Volumes/T9/FMMS_BACKUP/mac_restore_kit"
TARGET_PROJECT="$HOME/Documents/FMMS"
CONV_ID="8e2a0311-2116-4248-bf08-b99129c55dc4"
BRAIN_DEST="$HOME/.gemini/antigravity/brain/${CONV_ID}"

if [ ! -d "$T9_PROJECT" ]; then
  echo "❌ Không tìm thấy /Volumes/T9/FMMS. Vui lòng cắm ổ cứng Samsung T9 trước!"
  exit 1
fi

echo "🚀 Bắt đầu khôi phục toàn bộ dự án FMMS & môi trường từ ổ Samsung T9..."

# 1. Khôi phục mã nguồn dự án & các bản APK
mkdir -p "$TARGET_PROJECT"
rsync -a "$T9_PROJECT/" "$TARGET_PROJECT/"
echo "✅ 1/4: Đã khôi phục mã nguồn dự án & APK về: $TARGET_PROJECT"

# 2. Khôi phục SSH Keys & Config
if [ -d "$RESTORE_KIT/ssh" ]; then
  mkdir -p "$HOME/.ssh"
  rsync -a "$RESTORE_KIT/ssh/" "$HOME/.ssh/"
  chmod 700 "$HOME/.ssh"
  chmod 600 "$HOME/.ssh/"* 2>/dev/null || true
  echo "✅ 2/4: Đã khôi phục khóa SSH GitHub (~/.ssh)"
fi

# 3. Khôi phục Android Debug Keystore (để cài đè APK không bị lệch chữ ký)
if [ -f "$RESTORE_KIT/android_keystore/debug.keystore" ]; then
  mkdir -p "$HOME/.android"
  cp -f "$RESTORE_KIT/android_keystore/debug.keystore" "$HOME/.android/debug.keystore"
  echo "✅ 3/4: Đã khôi phục khóa ký Android (~/.android/debug.keystore)"
fi

# 4. Khôi phục lịch sử hội thoại & bộ nhớ AI Antigravity
if [ -d "$RESTORE_KIT/antigravity_brain/${CONV_ID}" ]; then
  mkdir -p "$BRAIN_DEST"
  rsync -a "$RESTORE_KIT/antigravity_brain/${CONV_ID}/" "$BRAIN_DEST/"
  echo "✅ 4/4: Đã khôi phục toàn bộ lịch sử trò chuyện AI Antigravity ($BRAIN_DEST)"
fi

echo "🎉 HOÀN TẤT! Toàn bộ dự án, khóa bảo mật và bộ nhớ cuộc trò chuyện đã được khôi phục 100%."
