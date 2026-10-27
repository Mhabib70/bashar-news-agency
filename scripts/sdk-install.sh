#!/usr/bin/env bash
# نصب Android SDK (commandline-tools + platform 34 + build-tools 34)
set -e
SDK=/home/z/my-project/android-sdk
mkdir -p "$SDK/cmdline-tools"
cd "$SDK"
echo "[1/4] دانلود commandline-tools..."
curl -sSL -o tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
echo "[2/4] استخراج..."
unzip -q tools.zip -d cmdline-tools
mkdir -p cmdline-tools/latest
mv cmdline-tools/cmdline-tools/* cmdline-tools/latest/
rm tools.zip
echo "[3/4] پذیرش لایسنس‌ها..."
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true
echo "[4/4] نصب platform-34 و build-tools..."
"$SDK/cmdline-tools/latest/bin/sdkmanager" "platforms;android-34" "build-tools;34.0.0" "platform-tools" > "$SDK/install.log" 2>&1
echo "SDK_INSTALL_DONE"
