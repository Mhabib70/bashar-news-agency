#!/bin/bash
# تست دود v1.2 — پنل مدیریت اختصاصی + آواتار (با ادمین واقعی موجود در دیتابیس)
# در پایان، داده‌های تست به‌طور خودکار پاک می‌شوند (داده واقعی دست نمی‌خورد)
BASE="http://localhost:3000"
PASS=0; FAIL=0
chk() {
  if echo "$3" | grep -q "$2"; then PASS=$((PASS+1)); echo "PASS: $1";
  else FAIL=$((FAIL+1)); echo "FAIL: $1 → $(echo "$3" | head -c 300)"; fi
}

ADMIN=$(node --env-file=.env -e "
const { createClient } = require('@libsql/client');
const c = createClient({ url: 'file:' + process.env.DATABASE_URL.replace('file:','') });
c.execute('SELECT id FROM User WHERE role=\x27admin\x27 LIMIT 1').then(r => { console.log(r.rows[0].id); process.exit(0) });
")

echo "REAL ADMIN: $ADMIN"
PNG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

# ۱) ثبت‌نام کاربر آزمونی دوم → pending (چون ادمین از قبل هست)
R1=$(curl -s -X POST $BASE/api/register -H 'Content-Type: application/json' \
  -d '{"fullName":"خبرنگار آزمون پنل","phone":"09129990001","age":"27","education":"bachelor","district":"b2","base":"پایگاه حضرت زهرا (س)"}')
chk "register-second(pending)" '"status":"pending"' "$R1"
U2=$(echo "$R1" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)

# ۲) آواتار برای کاربر pending مجاز نیست (رفتار درست)
R2=$(curl -s -X POST $BASE/api/user/avatar -H 'Content-Type: application/json' -d "{\"userId\":\"$U2\",\"avatar\":\"$PNG\"}")
chk "avatar-blocked-for-pending" 'دسترسی مجاز نیست' "$R2"

# ۳) آواتار در state نمی‌آید چون هنوز pending است
R4=$(curl -s "$BASE/api/state?userId=$U2")
if echo "$R4" | grep -q 'iVBORw0KGgo'; then chk "avatar-hidden-while-pending" "NO" "$R4"; else chk "avatar-hidden-while-pending" "avatar-hidden-while-pending" "avatar-hidden-while-pending"; fi

# ۵) لیست کاربران برای ادمین واقعی
R5=$(curl -s "$BASE/api/users?userId=$ADMIN")
chk "users-list-includes-testuser" 'خبرنگار آزمون پنل' "$R5"
chk "users-list-has-avatar" '"avatar"' "$R5"

# ۶) پرونده کامل (detail)
R6=$(curl -s "$BASE/api/users?userId=$ADMIN&targetId=$U2")
chk "user-detail-stats" '"approveRate"' "$R6"
chk "user-detail-phone" '09129990001' "$R6"
chk "user-detail-rank" '"rank"' "$R6"

# ۷) تایید عضویت توسط ادمین واقعی
R7=$(curl -s -X POST $BASE/api/users -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$ADMIN\",\"targetId\":\"$U2\",\"action\":\"approve\"}")
chk "approve-member" '"ok":true' "$R7"

# ۸) پس از تایید: آپلود آواتار مجاز + فرمت نامعتبر رد می‌شود
R8A=$(curl -s -X POST $BASE/api/user/avatar -H 'Content-Type: application/json' -d "{\"userId\":\"$U2\",\"avatar\":\"$PNG\"}")
chk "avatar-upload" '"ok":true' "$R8A"
R8B=$(curl -s -X POST $BASE/api/user/avatar -H 'Content-Type: application/json' -d "{\"userId\":\"$U2\",\"avatar\":\"data:text/html;base64,PGI+\"}")
chk "avatar-reject-bad-format" 'فرمت عکس معتبر نیست' "$R8B"
R8C=$(curl -s "$BASE/api/state?userId=$U2")
chk "avatar-in-state" 'iVBORw0KGgo' "$R8C"

# ۹) کاربر تاییدشده خبر می‌فرستد
R8=$(curl -s -X POST $BASE/api/news -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$U2\",\"category\":\"politics\",\"title\":\"خبر آزمون پنل v12\",\"content\":\"متن کامل خبر آزمایشی برای سنجش پنل مدیریت اختصاصی خبرگزاری بشر که بیش از سی کاراکتر است.\",\"mediaType\":\"none\",\"durationMin\":10}")
chk "news-submit" '"ok":true' "$R8"

# ۹) خبر در صف بررسی ادمین
R9=$(curl -s "$BASE/api/state?userId=$ADMIN")
chk "review-queue-visible" 'خبر آزمون پنل v12' "$R9"
NEWS_ID=$(echo "$R9" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.reviewQueue?.[0]?.id ?? '')})")

# ۱۰) داشبورد ادمین
R10=$(curl -s "$BASE/api/admin/overview?userId=$ADMIN")
chk "admin-overview-stats" '"stageDistrict"' "$R10"
chk "admin-overview-recentUsers" 'recentUsers' "$R10"

# ۱۱) پیام همگانی
R11=$(curl -s -X POST $BASE/api/broadcast -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$ADMIN\",\"title\":\"اطلاعیه آزمون v12\",\"text\":\"پیام همگانی آزمایشی نسخه ۱.۲.\"}")
chk "broadcast" '"ok":true' "$R11"

# ۱۲) خروجی CSV
R12=$(curl -s "$BASE/api/export?type=users&userId=$ADMIN" | head -1)
chk "csv-export-header" 'نام و نام خانوادگی' "$R12"

# ۱۳) تایید خبر توسط ادمین
R13=$(curl -s -X POST $BASE/api/news/review -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$ADMIN\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
chk "review-approve" '"ok":true' "$R13"

# ۱۴) علامت‌گذاری اعلان‌ها و حذف آواتار
R14=$(curl -s -X POST $BASE/api/user/avatar -H 'Content-Type: application/json' -d "{\"userId\":\"$U2\",\"avatar\":\"\"}")
chk "avatar-remove" '"ok":true' "$R14"

# ۱۵) قطع دسترسی کاربر عادی به لیست کاربران
R15=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/users?userId=$U2")
chk "users-list-403-for-reporter" "403" "$R15"

echo ""
echo "=== SMOKE RESULT: PASS=$PASS FAIL=$FAIL ==="

# ---------- پاک‌سازی کامل داده‌های آزمون (داده واقعی دست نمی‌خورد) ----------
node --env-file=.env -e "
const { createClient } = require('@libsql/client');
const c = createClient({ url: 'file:' + process.env.DATABASE_URL.replace('file:','') });
(async () => {
  const ids = ['$U2', 'cmvr60fvj000cnf2epa834jnr', 'cmvr60g3f000dnf2e2w8a45kk'].filter(Boolean).map(s => \`'\${s}'\`).join(',');
  if (!ids) { console.log('CLEANUP: nothing'); return }
  await c.execute(\`DELETE FROM NewsItem WHERE reporterId IN (\${ids})\`);
  await c.execute(\`DELETE FROM PointsLog WHERE userId IN (\${ids})\`);
  await c.execute(\`DELETE FROM UserBadge WHERE userId IN (\${ids})\`);
  await c.execute(\`DELETE FROM ChallengeParticipation WHERE userId IN (\${ids})\`);
  await c.execute(\`DELETE FROM Draft WHERE userId IN (\${ids})\`);
  await c.execute(\`DELETE FROM NotifSetting WHERE userId IN (\${ids})\`);
  await c.execute(\`DELETE FROM Notification WHERE userId IN (\${ids}) OR ref IN (\${ids.split(',').map(s => \`'user:\${s.slice(1,-1)}'\`).join(',')}) OR (kind='broadcast' AND title='اطلاعیه آزمون v12')\`);
  await c.execute(\`DELETE FROM User WHERE id IN (\${ids})\`);
  const u = await c.execute('SELECT COUNT(*) n FROM User');
  const n = await c.execute('SELECT COUNT(*) n FROM NewsItem');
  console.log('CLEANUP DONE — users:', u.rows[0].n, 'news:', n.rows[0].n);
  process.exit(0);
})();
"
