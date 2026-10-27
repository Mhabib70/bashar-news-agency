#!/usr/bin/env bash
# ساخت APK اندروید خبرگزاری بشر — بدون Gradle، مستقیم با build-tools
set -e
export JAVA_HOME=/home/z/my-project/jdk
export PATH=$JAVA_HOME/bin:$PATH
cd /home/z/my-project/android
SDK=/home/z/my-project/android-sdk
BT=$SDK/build-tools/35.0.0
PLAT=$SDK/platforms/android-34/android.jar
BT_JAR=$BT/lib/d8.jar

echo "[1/6] کامپایل منابع (aapt2 compile)..."
"$BT/aapt2" compile --dir res -o res.zip

echo "[2/6] لینک منابع و تولید R.java (aapt2 link)..."
"$BT/aapt2" link -o base.apk -I "$PLAT" \
  --manifest AndroidManifest.xml \
  --min-sdk-version 24 \
  --target-sdk-version 34 \
  -R res.zip \
  --java gen \
  --auto-add-overlay

echo "[3/6] کامپایل جاوا..."
rm -rf classes && mkdir -p classes
javac -classpath "$PLAT" -source 1.8 -target 1.8 -nowarn \
  -d classes \
  gen/ir/basharnews/app/R.java \
  java/ir/basharnews/app/MainActivity.java

echo "[4/6] تبدیل به dex (d8)..."
rm -rf dex && mkdir -p dex
java -cp "$BT_JAR" com.android.tools.r8.D8 --release --min-api 24 \
  --lib "$PLAT" \
  --output dex \
  $(find classes -name "*.class")

echo "[5/6] بسته‌بندی classes.dex..."
zip -q -j base.apk dex/classes.dex

echo "[6/6] تراز و امضا..."
"$BT/zipalign" -f 4 base.apk aligned.apk
if [ ! -f release.keystore ]; then
  keytool -genkeypair -keystore release.keystore -alias bashar \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass basharnews2026 -keypass basharnews2026 \
    -dname "CN=Bashar News Agency, O=BasharNews, C=IR" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks release.keystore \
  --ks-pass pass:basharnews2026 --key-pass pass:basharnews2026 \
  --out /home/z/my-project/apk/BasharNews-v1.2.0.apk aligned.apk

"$BT/apksigner" verify /home/z/my-project/apk/BasharNews-v1.2.0.apk && echo "APK_SIGNED_OK"
ls -la /home/z/my-project/apk/
