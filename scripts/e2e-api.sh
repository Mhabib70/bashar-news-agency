#!/usr/bin/env bash
# تست E2E کامل تمام endpointهای بک‌اند — زنجیره ثبت‌نام تا انتشار
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0

check() { # $1=desc $2=json $3=expected substr
  if echo "$2" | grep -q "$3"; then
    PASS=$((PASS+1)); echo "PASS ✓ $1"
  else
    FAIL=$((FAIL+1)); echo "FAIL ✗ $1"
    echo "      got: $(echo "$2" | head -c 300)"
  fi
}

echo "=== ۰) آمار سازمانی (بدون ورود) ==="
R=$(curl -s $BASE/api/overview)
check "overview تجمیعی" "$R" '"progressPct"'

echo "=== ۱) bootstrap + state ==="
R=$(curl -s $BASE/api/bootstrap)
check "bootstrap لیست کاربران" "$R" 'u_emon'
R=$(curl -s "$BASE/api/state?userId=u_emon")
check "state خبرنگار (امتیاز/نشان/چالش)" "$R" '"levelTitle"'
check "state شامل آمار" "$R" '"weekSeries"'
R=$(curl -s "$BASE/api/state?userId=ghost_404")
check "state کاربر ناموجود = 404" "$R" 'یافت نشد'

echo "=== ۲) ثبت‌نام خبرنگار جدید ==="
TS=$(date +%s)
PHONE="0912$TS"
PHONE=${PHONE:0:14}
R=$(curl -s -X POST $BASE/api/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"تست کامل E2E\",\"phone\":\"$PHONE\",\"age\":\"۲۷\",\"education\":\"bachelor\",\"district\":\"b1\",\"base\":\"پایگاه امام علی (ع)\"}")
check "ثبت‌نام موفق" "$R" '"ok":true'
NEW_UID=$(echo "$R" | sed -n 's/.*"userId":"\([^"]*\)".*/\1/p')
echo "      new uid: $NEW_UID"
R=$(curl -s -X POST $BASE/api/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"تست تکراری\",\"phone\":\"$PHONE\",\"age\":\"25\",\"education\":\"bachelor\",\"district\":\"b1\",\"base\":\"پایگاه امام علی (ع)\"}")
check "شماره تکراری = 409" "$R" 'قبلاً ثبت‌نام'
R=$(curl -s -X POST $BASE/api/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"ناهمخوان\",\"phone\":\"09350000001\",\"age\":\"25\",\"education\":\"bachelor\",\"district\":\"b1\",\"base\":\"پایگاه اشکان\"}")
check "پایگاه ناهمخوان با حوزه = خطا" "$R" 'همخوانی ندارد'

echo "=== ۳) پیش‌نویس ==="
R=$(curl -s -X POST $BASE/api/drafts -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"category\":\"sport\",\"title\":\"پیش‌نویس تستی\",\"content\":\"متن آزمایشی پیش‌نویس\"}")
check "ذخیره پیش‌نویس" "$R" 'پیش‌نویس ذخیره شد'
DRAFT_ID=$(echo "$R" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
R=$(curl -s -X POST $BASE/api/drafts -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"category\":\"sport\",\"title\":\"پیش‌نویس ویرایشی\",\"content\":\"متن ویرایش شده\",\"draftId\":$DRAFT_ID}")
check "ویرایش پیش‌نویس" "$R" 'به‌روزرسانی شد'
R=$(curl -s -X DELETE "$BASE/api/drafts?id=$DRAFT_ID&userId=$NEW_UID")
check "حذف پیش‌نویس" "$R" 'حذف شد'

echo "=== ۴) ارسال خبر + عضویت چالش ==="
R=$(curl -s "$BASE/api/state?userId=$NEW_UID")
CH_ID=$(echo "$R" | sed -n 's/.*"challenges":\[{"id":\([0-9]*\).*/\1/p')
echo "      active challenge id: $CH_ID"
R=$(curl -s -X POST $BASE/api/challenges/join -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"challengeId\":$CH_ID}")
check "عضویت در چالش فعال" "$R" 'ثبت‌نام شدید'
R=$(curl -s -X POST $BASE/api/challenges/join -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"challengeId\":$CH_ID}")
check "عضویت تکراری چالش" "$R" 'قبلاً در این چالش'
R=$(curl -s -X POST $BASE/api/news -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"category\":\"breaking\",\"title\":\"آزمایش زلزله نیم‌درجه‌ای\",\"content\":\"گزارش خبری تستی برای چرخه کامل بررسی سه‌مرحله‌ای.\",\"mediaType\":\"photo\",\"durationMin\":25,\"challengeId\":$CH_ID}")
check "ارسال خبر با کد پیگیری" "$R" '"code":"N-'
check "امتیاز ارسال" "$R" '"pointsEarned"'
NEWS_ID=$(echo "$R" | sed -n 's/.*"news":{"id":\([0-9]*\).*/\1/p')
NEWS_CODE=$(echo "$R" | sed -n 's/.*"code":"\(N-[0-9]*\)".*/\1/p')
echo "      news: id=$NEWS_ID code=$NEWS_CODE"
R=$(curl -s "$BASE/api/state?userId=$NEW_UID")
check "شمارنده چالش بعد از ارسال = ۱" "$R" '"myCount":1'

echo "=== ۵) چرخه سه‌مرحله‌ای بررسی ==="
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "خبرنگار اجازه بررسی ندارد (403)" "$R" 'مجاز نیست'
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"u_dm\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "مرحله ۱: تایید مدیر حوزه" "$R" 'کارشناس'
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"u_spec\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "مرحله ۲: تایید کارشناس → ادمین" "$R" 'ادمین'
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"u_admin\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "مرحله ۳: انتشار نهایی ادمین" "$R" 'منتشر شد'
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"u_admin\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
check "بررسی مجدد خبر منتشرشده = 409" "$R" 'قبلاً بررسی شده'

echo "=== ۶) چرخه رد و ارسال مجدد ==="
R=$(curl -s -X POST $BASE/api/news -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"category\":\"local\",\"title\":\"خبر برای رد شدن\",\"content\":\"متن خبر دوم\",\"mediaType\":\"none\",\"durationMin\":10}")
NEWS2_ID=$(echo "$R" | sed -n 's/.*"news":{"id":\([0-9]*\).*/\1/p')
echo "      news2: id=$NEWS2_ID"
R=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"u_dm\",\"newsId\":$NEWS2_ID,\"action\":\"reject\",\"reason\":\"insufficient\",\"note\":\"جزئیات کافی نیست\"}")
check "رد با دلیل" "$R" 'بازگشت'
R=$(curl -s -X POST $BASE/api/news/resubmit -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"newsId\":$NEWS2_ID,\"title\":\"خبر اصلاح‌شده\",\"content\":\"متن کامل‌تر با جزئیات\"}")
check "ارسال مجدد خبر ردشده" "$R" 'چرخه بررسی'
R=$(curl -s "$BASE/api/state?userId=$NEW_UID")
check "خبر اصلاح‌شده در صف مدیر حوزه" "$R" 'خبر اصلاح‌شده'

echo "=== ۷) تنظیمات اعلان ==="
R=$(curl -s -X PUT $BASE/api/settings -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$NEW_UID\",\"approvals\":false,\"challenges\":true,\"quietStart\":\"23:30\",\"quietEnd\":\"07:00\"}")
check "ذخیره تنظیمات" "$R" 'ذخیره شد'
R=$(curl -s "$BASE/api/state?userId=$NEW_UID")
check "تنظیمات بازخوانی شد" "$R" '"quietStart":"23:30"'

echo "=== ۸) صف بررسی نقش‌محور ==="
R=$(curl -s "$BASE/api/state?userId=u_dm")
check "صف مدیر حوزه شامل خبر اصلاحی" "$R" 'خبر اصلاح‌شده'
R=$(curl -s "$BASE/api/state?userId=u_emon")
NQ=$(echo "$R" | sed -n 's/.*"reviewQueue":\[\([^]]*\).*/\1/' | wc -c)
check "صف خبرنگار خالی است" "$R" '"reviewQueue":\[\]'

echo ""
echo "======================================"
echo "نتیجه: $PASS موفق / $FAIL ناموفق"
