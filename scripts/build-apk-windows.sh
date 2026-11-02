#!/usr/bin/env bash
# ============================================================
# ساخت APK خبرگزاری بسیج روی ویندوز (Git Bash)
# ============================================================
# بدون نیاز به اندروید استودیو یا Gradle — مستقیم با build-tools.
# پیش‌نیازها: JDK 17+ (javac)، python، و پوشه‌ی sdk/ کنار این اسکریپت
# (sdk/ شامل build-tools 34 و platform 34 است — یک‌بار از میرور دانلود شده).
# خروجی: apk/BasijNews-v2.2.0.apk (امضاشده با release.keystore)
set -e

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$(pwd)"
cd android

SDK="$ROOT/android/sdk"
BT="$SDK/android-14"              # build-tools 34.0.0 (از zip با این نام درمی‌آید)
PLAT="$SDK/android-34/android.jar"

[ -f "$BT/aapt2.exe" ] || { echo "خطا: build-tools در $BT نیست"; exit 1; }
[ -f "$PLAT" ] || { echo "خطا: android.jar در $PLAT نیست"; exit 1; }

mkdir -p build && rm -rf build/gen build/classes build/dex build/*.apk build/res.zip

echo "[1/6] کامپایل منابع (aapt2 compile)..."
"$BT/aapt2.exe" compile --dir res -o build/res.zip

echo "[2/6] لینک منابع و تولید R.java (aapt2 link)..."
"$BT/aapt2.exe" link -o build/base.apk -I "$PLAT" \
  --manifest AndroidManifest.xml \
  --min-sdk-version 24 \
  --target-sdk-version 34 \
  -R build/res.zip \
  --java build/gen \
  --auto-add-overlay

echo "[3/6] کامپایل جاوا (javac)..."
mkdir -p build/classes
javac --release 8 -encoding UTF-8 -nowarn -proc:none -cp "$PLAT" -d build/classes \
  build/gen/ir/basharnews/app/R.java \
  java/ir/basharnews/app/MainActivity.java

echo "[4/6] تبدیل به dex (d8)..."
mkdir -p build/dex
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 24 \
  --lib "$PLAT" \
  --output build/dex \
  $(find build/classes -name "*.class")

echo "[5/6] بسته‌بندی classes.dex داخل APK..."
python - <<'PY'
import zipfile
with zipfile.ZipFile('build/base.apk', 'a') as z:
    z.write('build/dex/classes.dex', 'classes.dex')
print("classes.dex added")
PY

echo "[6/6] تراز و امضا (zipalign + apksigner)..."
"$BT/zipalign.exe" -f 4 build/base.apk build/aligned.apk
java -jar "$BT/lib/apksigner.jar" sign --ks release.keystore \
  --ks-pass pass:basharnews2026 --key-pass pass:basharnews2026 \
  --out "$ROOT/apk/BasijNews-v2.2.0.apk" build/aligned.apk
java -jar "$BT/lib/apksigner.jar" verify "$ROOT/apk/BasijNews-v2.2.0.apk" && echo "APK_SIGNED_OK"
ls -la "$ROOT/apk/"
