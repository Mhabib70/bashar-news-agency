#!/usr/bin/env bash
# تست E2E نهایی — سناریوی سازمان خالی: اولین ثبت‌نام = ادمین، تایید نهایی ادمین از هر مرحله
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
check() {
  if echo "$2" | grep -q "$3"; then PASS=$((PASS+1)); echo "PASS ✓ $1"
  else FAIL=$((FAIL+1)); echo "FAIL ✗ $1"; echo "      got: $(echo "$2" | head -c 250)"; fi
}

echo "=== راه‌اندازی سازمان خالی ==="
R=$(curl -s $BASE/api/bootstrap)
check "bootstrap خالی است" "$R" '"users":\[\]'
R=$(curl -s -X POST $BASE/api/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"مدیر تست\",\"phone\":\"09350000001\",\"age\":\"۳۵\",\"education\":\"master\",\"district\":\"b1\",\"base\":\"پایگاه امام علی (ع)\"}")
check "اولین ثبت‌نام = ادمین" "$R" '"role":"admin"'
ADMIN_UID=$(echo "$R" | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')
R=$(curl -s -X POST $BASE/api/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"خبرنگار تست\",\"phone\":\"09350000002\",\"age\":\"۲۸\",\"education\":\"bachelor\",\"district\":\"b1\",\"base\":\"پایگاه امام علی (ع)\"}")
check "ثبت‌نام دوم = خبرنگار" "$R" '"role":"reporter"'
REP_UID=$(echo "$R" | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')

echo "=== ارسال و بررسی ==="
R=$(curl -s -X POST $BASE/api/news -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$REP_UID\",\"category\":\"breaking\",\"title\":\"اولین خبر سازمان\",\"content\":\"متن خبر آزمایشی سازمان تازه‌تاسیس.\",\"mediaType\":\"photo\",\"durationMin\":20}")
check "ارسال خبر" "$R" '"code":"N-'
NEWS_ID=$(echo "$R" | sed -n 's/.*"news":{"id":\([0-9]*\).*/\1/p')
R=$(curl -s "$BASE/api/state?userId=$ADMIN_UID")
check "ادمین خبر مرحله اول را در صف می‌بیند" "$R" 'اولین خبر سازمان'
check "ادمین سطح ادمین کل دارد" "$R" '"levelTitle":"تازه‌کار"'
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$REP_UID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "خبرنگار اجازه بررسی ندارد" "$R" 'مجاز نیست'
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$ADMIN_UID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "تایید ادمین از مرحله اول = انتشار نهایی" "$R" 'منتشر شد'
R=$(curl -s "$BASE/api/state?userId=$REP_UID")
check "خبرنگار +۱۵ امتیاز گرفت" "$R" '"totalApproved":1'
R=$(curl -s "$BASE/api/overview")
check "overview سالم" "$R" '"progressPct"'

echo ""
echo "نتیجه: $PASS موفق / $FAIL ناموفق"
