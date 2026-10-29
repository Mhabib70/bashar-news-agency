#!/usr/bin/env bash
# نصب مجدد SDK اندروید (build-tools 34 + platform 34 + ecj) — بدون Android Studio
set -e
SDK=/home/z/my-project/android-sdk
mkdir -p "$SDK"

echo "[1/4] دانلود build-tools r34..."
cd "$SDK"
[ -f bt34.zip ] || curl -sS -o bt34.zip https://dl.google.com/android/repository/build-tools_r34-linux.zip
unzip -q -o bt34.zip
BT_DIR=$(ls -d android-* | head -1)
mkdir -p build-tools/34.0.0
mv "$BT_DIR"/* build-tools/34.0.0/
rm -rf "$BT_DIR" bt34.zip

echo "[2/4] دانلود platform android-34..."
[ -f plat34.zip ] || curl -sS -o plat34.zip https://dl.google.com/android/repository/platform-34-ext7_r03.zip
unzip -q -o plat34.zip
PLAT_DIR=$(ls -d android-34* 2>/dev/null | head -1 || true)
if [ -z "$PLAT_DIR" ]; then
  PLAT_DIR=$(ls -dt */ | grep -iv build-tools | head -1)
fi
mkdir -p platforms/android-34
mv "$PLAT_DIR"/* platforms/android-34/ 2>/dev/null || mv android-*/ platforms/android-34/
rm -rf plat34.zip android-1[0-9]* 2>/dev/null || true

echo "[3/4] دانلود ecj (کامپایلر جاوا)..."
[ -f ecj.jar ] || curl -sS -o ecj.jar https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.36.0/ecj-3.36.0.jar

echo "[4/4] بررسی..."
ls build-tools/34.0.0/aapt2 platforms/android-34/android.jar ecj.jar
echo "SDK_READY"
