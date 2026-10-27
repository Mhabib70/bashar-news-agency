#!/bin/bash
# === E2E v1.1 — تست جامع همه امکانات جدید ===
B=http://localhost:3000
P="curl -s"
pass=0; fail=0
chk() { # chk "name" "condition"
  if [ "$2" = "1" ]; then pass=$((pass+1)); echo "✅ $1"
  else fail=$((fail+1)); echo "❌ $1 — $3"; fi
}

echo "=== 0) پاک‌سازی دیتابیس محلی برای سناریوی تمیز ==="
cd /home/z/my-project
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.notification.deleteMany();
  await db.pointsLog.deleteMany();
  await db.userBadge.deleteMany();
  await db.challengeParticipation.deleteMany();
  await db.newsItem.deleteMany();
  await db.draft.deleteMany();
  await db.challenge.deleteMany();
  await db.notifSetting.deleteMany();
  await db.user.deleteMany();
  console.log('CLEAN_OK');
  await db.\$disconnect();
})();
" || { echo "CLEAN_FAIL"; exit 1; }

echo "=== 1) ثبت‌نام اولین کاربر = ادمین فعال ==="
R1=$($P -X POST $B/api/register -H 'Content-Type: application/json' -d '{"fullName":"ادمین کل تست","phone":"09120000001","age":"35","education":"master","district":"b1","base":"پایگاه امام علی (ع)"}')
ADMIN_ID=$(echo "$R1" | node -pe "JSON.parse(require('fs').readFileSync(0)).userId" 2>/dev/null)
ROLE1=$(echo "$R1" | node -pe "JSON.parse(require('fs').readFileSync(0)).role")
STATUS1=$(echo "$R1" | node -pe "JSON.parse(require('fs').readFileSync(0)).status")
chk "first-user-admin" "$([ "$ROLE1" = "admin" ] && [ "$STATUS1" = "active" ] && echo 1)" "$R1"

echo "=== 2) ثبت‌نام دومین کاربر = pending ==="
R2=$($P -X POST $B/api/register -H 'Content-Type: application/json' -d '{"fullName":"خبرنگار تست","phone":"09120000002","age":"25","education":"bachelor","district":"b1","base":"پایگاه حضرت زهرا (س)"}')
REP_ID=$(echo "$R2" | node -pe "JSON.parse(require('fs').readFileSync(0)).userId")
STATUS2=$(echo "$R2" | node -pe "JSON.parse(require('fs').readFileSync(0)).status")
chk "second-user-pending" "$([ "$STATUS2" = "pending" ] && echo 1)" "$R2"

echo "=== 3) کاربر pending state می‌گیرد (برای صفحه انتظار) ==="
ST=$(curl -s "$B/api/state?userId=$REP_ID")
PST=$(echo "$ST" | node -pe "JSON.parse(require('fs').readFileSync(0)).user.status")
chk "pending-user-state" "$([ "$PST" = "pending" ] && echo 1)" "$ST"

echo "=== 4) ثبت‌نام سوم = مدیر حوزه b1 (فعال دستی توسط API) ==="
R3=$($P -X POST $B/api/register -H 'Content-Type: application/json' -d '{"fullName":"مدیر حوزه یک","phone":"09120000003","age":"40","education":"master","district":"b1","base":"پایگاه شهید بهشتی"}')
DM_ID=$(echo "$R3" | node -pe "JSON.parse(require('fs').readFileSync(0)).userId")
$P -X POST $B/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"targetId\":\"$DM_ID\",\"action\":\"approve\"}" >/dev/null
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
db.user.update({where:{id:'$DM_ID'},data:{role:'district_manager'}}).then(()=>{console.log('DM_SET');return db.\$disconnect()});
" >/dev/null
DM_ST=$($P "$B/api/state?userId=$DM_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).user.role")
chk "district-manager-setup" "$([ "$DM_ST" = "district_manager" ] && echo 1)" "$DM_ST"

echo "=== 5) تایید عضویت خبرنگار توسط ادمین ==="
AP=$($P -X POST $B/api/users -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"targetId\":\"$REP_ID\",\"action\":\"approve\"}")
chk "approve-user" "$(echo "$AP" | grep -q '"ok":true' && echo 1)" "$AP"
REP_ST=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).user.status")
chk "reporter-now-active" "$([ "$REP_ST" = "active" ] && echo 1)" "$REP_ST"

echo "=== 6) اعلان تایید برای خبرنگار ==="
NOTIF=$($P "$B/api/state?userId=$REP_ID" | node -pe "const n=JSON.parse(require('fs').readFileSync(0)).notifications; n.some(x=>x.kind==='user_status')?'1':'0'")
chk "approve-notification" "$NOTIF" "no user_status notif"

echo "=== 7) ایجاد چالش توسط ادمین (مهلت جلالی → ISO) ==="
DEADLINE=$(node -e "
const {toGregorian, jalaliToday} = require('./src/lib/jalali.ts') ?? {};
" 2>/dev/null)
DEADLINE=$(node --experimental-strip-types -e "
const {toGregorian, jalaliToday} = await import('/home/z/my-project/src/lib/jalali.ts');
const t = jalaliToday();
const g = toGregorian(t.jy, t.jm, Math.min(t.jd+3, 29));
console.log(new Date(Date.UTC(g.gy, g.gm-1, g.gd, 20, 29)).toISOString());
" 2>/dev/null)
[ -z "$DEADLINE" ] && DEADLINE=$(node -e "console.log(new Date(Date.now()+3*24*3600*1000).toISOString())")
CH=$($P -X POST $B/api/challenges -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"title\":\"چالش پوشش آزمایشی\",\"description\":\"تست یکپارچگی چرخه چالش در اپ\",\"reward\":\"۳۰ امتیاز + تقدیر\",\"deadlineAt\":\"$DEADLINE\"}")
CH_ID=$(echo "$CH" | node -pe "(JSON.parse(require('fs').readFileSync(0)).challenge||{}).id")
chk "create-challenge" "$(echo "$CH" | grep -q '"ok":true' && echo 1)" "$CH"

echo "=== 8) رد ایجاد چالش توسط غیرادمین ==="
CH2=$($P -X POST $B/api/challenges -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"title\":\"چالش غیرمجاز\",\"description\":\"نباید ساخته شود\",\"deadlineAt\":\"$DEADLINE\"}")
chk "create-challenge-forbidden" "$(echo "$CH2" | grep -q '"error"' && echo 1)" "$CH2"

echo "=== 9) عضویت خبرنگار در چالش ==="
JN=$($P -X POST $B/api/challenges/join -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"challengeId\":$CH_ID}")
chk "join-challenge" "$(echo "$JN" | grep -q '"ok":true' && echo 1)" "$JN"

echo "=== 10) آپلود واقعی عکس ==="
node -e "
const fs = require('fs');
// PNG 1x1
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
fs.writeFileSync('/tmp/test.png', png);
console.log('PNG_OK');
"
UP=$(curl -s -X POST $B/api/upload -F "userId=$REP_ID" -F "file=@/tmp/test.png;type=image/png")
MEDIA_URL=$(echo "$UP" | node -pe "JSON.parse(require('fs').readFileSync(0)).url" 2>/dev/null)
chk "upload-photo" "$(echo "$UP" | grep -q '"ok":true' && echo 1)" "$UP"
MEDIA_HTTP=$($P -o /dev/null -w "%{http_code}" "$B$MEDIA_URL")
chk "media-served" "$([ "$MEDIA_HTTP" = "200" ] && echo 1)" "url=$MEDIA_URL http=$MEDIA_HTTP"

echo "=== 11) ارسال خبر با رسانه + چالش ==="
NW=$($P -X POST $B/api/news -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"category\":\"local\",\"title\":\"آزمون خبر با رسانه و چالش\",\"content\":\"این متن آزمایشی خبر است که باید حداقل سی کاراکتر باشد تا تایید شود.\",\"mediaType\":\"photo\",\"mediaUrl\":\"$MEDIA_URL\",\"durationMin\":25,\"challengeId\":$CH_ID}")
NEWS_ID=$(echo "$NW" | node -pe "(JSON.parse(require('fs').readFileSync(0)).news||{}).id")
chk "submit-news-with-media" "$(echo "$NW" | grep -q '"ok":true' && echo 1)" "$NW"
MYCNT=$($P "$B/api/state?userId=$REP_ID" | node -pe "const s=JSON.parse(require('fs').readFileSync(0)); (s.challenges.find(c=>c.id===$CH_ID)||{}).myCount")
chk "challenge-count-incremented" "$([ "$MYCNT" = "1" ] && echo 1)" "myCount=$MYCNT"

echo "=== 12) خبر جدید برای مدیر حوزه اعلان دارد ==="
DMN=$($P "$B/api/state?userId=$DM_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).notifications.some(x=>x.kind==='review')?'1':'0'")
chk "review-staff-notification" "$DMN" "no review notif"

echo "=== 13) امنیت: مدیر حوزه b2 نمی‌تواند خبر حوزه b1 را رد کند ==="
R4=$($P -X POST $B/api/register -H 'Content-Type: application/json' -d '{"fullName":"مدیر حوزه دو","phone":"09120000004","age":"38","education":"bachelor","district":"b2","base":"پایگاه حضرت زهرا (س)"}')
DM2_ID=$(echo "$R4" | node -pe "JSON.parse(require('fs').readFileSync(0)).userId")
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
db.user.update({where:{id:'$DM2_ID'},data:{role:'district_manager',status:'active'}}).then(()=>db.\$disconnect());
" >/dev/null
SEC=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$DM2_ID\",\"newsId\":$NEWS_ID,\"action\":\"reject\",\"reason\":\"insufficient\"}")
chk "cross-district-blocked" "$(echo "$SEC" | grep -q 'error' && echo 1)" "$SEC"

echo "=== 14) امنیت: خبرنگار نمی‌تواند بررسی کند ==="
SEC2=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
chk "reporter-review-blocked" "$(echo "$SEC2" | grep -q 'error' && echo 1)" "$SEC2"

echo "=== 15) چرخه سه‌مرحله‌ای: حوزه → کارشناس → ادمین ==="
V1=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$DM_ID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
chk "stage1-district-approve" "$(echo "$V1" | grep -q 'کارشناس' && echo 1)" "$V1"
# کارشناس
R5=$($P -X POST $B/api/register -H 'Content-Type: application/json' -d '{"fullName":"کارشناس خبر","phone":"09120000005","age":"45","education":"phd","district":"b1","base":"پایگاه امام علی (ع)"}')
SP_ID=$(echo "$R5" | node -pe "JSON.parse(require('fs').readFileSync(0)).userId")
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
db.user.update({where:{id:'$SP_ID'},data:{role:'specialist',status:'active'}}).then(()=>db.\$disconnect());
" >/dev/null
V2=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$SP_ID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
chk "stage2-specialist-approve" "$(echo "$V2" | grep -q 'ادمین کل' && echo 1)" "$V2"
# امنیت: کارشناس نمی‌تواند خبر مرحله district را بگیرد
NW2=$($P -X POST $B/api/news -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"category\":\"sport\",\"title\":\"خبر دوم برای تست مرحله\",\"content\":\"متن آزمایشی دومین خبر که طولش کافی است برای پاس شدن اعتبارسنجی.\",\"durationMin\":15}")
NEWS2_ID=$(echo "$NW2" | node -pe "(JSON.parse(require('fs').readFileSync(0)).news||{}).id")
SEC3=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$SP_ID\",\"newsId\":$NEWS2_ID,\"action\":\"approve\"}")
chk "wrong-stage-blocked" "$(echo "$SEC3" | grep -q 'error' && echo 1)" "$SEC3"
V3=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"newsId\":$NEWS_ID,\"action\":\"approve\"}")
chk "stage3-final-admin" "$(echo "$V3" | grep -q '"ok":true' && echo 1)" "$V3"
APPNOTIF=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).notifications.some(x=>x.kind==='approved')?'1':'0'")
chk "approved-notification" "$APPNOTIF" "no approved notif"

echo "=== 16) رد با دلیل + اعلان ==="
RJ=$($P -X POST $B/api/news/review -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"newsId\":$NEWS2_ID,\"action\":\"reject\",\"reason\":\"style\",\"note\":\"بازنویسی شود\"}")
chk "reject-with-reason" "$(echo "$RJ" | grep -q '"ok":true' && echo 1)" "$RJ"
RJNOTIF=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).notifications.some(x=>x.kind==='rejected')?'1':'0'")
chk "rejected-notification" "$RJNOTIF" "no rejected notif"

echo "=== 17) ارسال مجدد خبر ردشده ==="
RS=$($P -X POST $B/api/news/resubmit -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"newsId\":$NEWS2_ID,\"content\":\"متن بازنویسی‌شده خبر دوم که حالا طول کافی و اصلاحات لازم را دارد.\"}")
chk "resubmit" "$(echo "$RS" | grep -q '"ok":true' && echo 1)" "$RS"

echo "=== 18) پیش‌نویس: ذخیره، حذف پس از ارسال ==="
DR=$($P -X POST $B/api/drafts -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"category\":\"economy\",\"title\":\"پیش‌نویس آزمایشی\",\"content\":\"متن پیش‌نویس برای تست چرخه حذف\"}")
DR_ID=$(echo "$DR" | node -pe "JSON.parse(require('fs').readFileSync(0)).id")
NW3=$($P -X POST $B/api/news -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"category\":\"economy\",\"title\":\"خبر از پیش‌نویس تست\",\"content\":\"متن خبر ساخته‌شده از پیش‌نویس که باید حداقل سی کاراکتر باشد.\",\"durationMin\":10,\"draftId\":$DR_ID}")
DRAFTS_AFTER=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).drafts.length")
chk "draft-deleted-after-submit" "$([ "$DRAFTS_AFTER" = "0" ] && echo 1)" "drafts=$DRAFTS_AFTER"

echo "=== 19) پیام همگانی ادمین ==="
BC=$($P -X POST $B/api/broadcast -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"title\":\"اطلاعیه مهم\",\"text\":\"جلسه هفتگی خبرنگاران شنبه برگزار می‌شود.\"}")
SENT=$(echo "$BC" | node -pe "JSON.parse(require('fs').readFileSync(0)).sent")
chk "broadcast-sent" "$(echo "$BC" | grep -q '"ok":true' && echo 1)" "$BC"
BCNOTIF=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).notifications.some(x=>x.kind==='broadcast')?'1':'0'")
chk "broadcast-notification" "$BCNOTIF" "no broadcast notif"
BC2=$($P -X POST $B/api/broadcast -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"title\":\"غیرمجاز\",\"text\":\"خبرنگار نباید بتواند\"}")
chk "broadcast-forbidden" "$(echo "$BC2" | grep -q '"error"' && echo 1)" "$BC2"

echo "=== 20) اعلام نتایج چالش توسط ادمین ==="
FIN=$($P -X POST $B/api/challenges/finish -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"challengeId\":$CH_ID}")
WIN=$(echo "$FIN" | node -pe "(JSON.parse(require('fs').readFileSync(0)).winners||[]).length")
chk "finish-challenge" "$(echo "$FIN" | grep -q '"ok":true' && echo 1)" "$FIN"
chk "winner-listed" "$([ "$WIN" -ge 1 ] && echo 1)" "winners=$WIN"
# جایزه ۳۰ امتیازی + نشان قهرمان
PTS=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).user.points")
BADGE=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).badges.find(b=>b.key==='champion').unlocked?'1':'0'")
chk "challenge-prize-points" "$(node -e "console.log($PTS >= 60 ? 1 : 0)" 2>/dev/null)" "points=$PTS"
chk "champion-badge" "$BADGE" "champion not unlocked"
FIN2=$($P -X POST $B/api/challenges/finish -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"challengeId\":$CH_ID}")
chk "finish-twice-blocked" "$(echo "$FIN2" | grep -q 'error' && echo 1)" "$FIN2"

echo "=== 21) خروجی CSV ==="
for T in users news districts presscard; do
  CSV=$($P "$B/api/export?type=$T&userId=$ADMIN_ID")
  HDR=$(echo "$CSV" | head -1 | cut -c1-20)
  chk "csv-$T" "$(echo "$CSV" | head -c3 | grep -q $'\xef\xbb\xbf' && echo 1)" "no BOM: $HDR"
done
CSV_FORBID=$($P "$B/api/export?type=users&userId=$REP_ID")
chk "csv-forbidden-for-reporter" "$(echo "$CSV_FORBID" | grep -q 'error\|ادمین' && echo 1)" "$CSV_FORBID"

echo "=== 22) جستجوی اخبار ==="
Q1=$(python3 -c "import urllib.parse; print(urllib.parse.quote('پیش‌نویس'))")
Q2=$(python3 -c "import urllib.parse; print(urllib.parse.quote('خبر'))")
SR_COUNT=$($P "$B/api/news?userId=$REP_ID&q=$Q1" | node -pe "JSON.parse(require('fs').readFileSync(0)).news.length")
chk "search-own" "$([ "$SR_COUNT" -ge 1 ] && echo 1)" "count=$SR_COUNT"
SR_ALL=$($P "$B/api/news?userId=$ADMIN_ID&q=$Q2&scope=all" | node -pe "JSON.parse(require('fs').readFileSync(0)).news.length")
chk "search-all-for-admin" "$(node -e "console.log($SR_ALL>=3?1:0)")" "count=$SR_ALL"

echo "=== 23) تنظیمات اعلان + فلگ ==="
$P -X PUT $B/api/settings -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"broadcast\":false}" >/dev/null
BC3=$($P -X POST $B/api/broadcast -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"title\":\"تست فلگ\",\"text\":\"این پیام نباید برای خبرنگار برود چون فلگ خاموش است.\"}")
BC3_COUNT=$(echo "$BC3" | node -pe "JSON.parse(require('fs').readFileSync(0)).sent")
$P -X PUT $B/api/settings -H 'Content-Type: application/json' -d "{\"userId\":\"$REP_ID\",\"broadcast\":true}" >/dev/null
ACTIVE_N=$(node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
db.user.count({where:{status:'active'}}).then(c=>{console.log(c); return db.\$disconnect();});
")
chk "broadcast-flag-respected" "$(node -e "console.log($BC3_COUNT == $ACTIVE_N - 1 ? 1 : 0)")" "sent=$BC3_COUNT از $ACTIVE_N فعال (فلگ رعایت نشد)"

echo "=== 24) ساعات سکوت: اعلان موکول می‌شود ==="
SC=$($P -X PUT $B/api/settings -H 'Content-Type: application/json' -d "{\"userId\":\"$SP_ID\",\"quietStart\":\"00:00\",\"quietEnd\":\"23:59\",\"broadcast\":true}" 2>/dev/null)
# کل روز در سکوت → broadcast جدید باید deliveredAt در آینده داشته باشد
$P -X POST $B/api/broadcast -H 'Content-Type: application/json' -d "{\"userId\":\"$ADMIN_ID\",\"title\":\"تست سکوت\",\"text=\"پیام موکول\"}" >/dev/null
QUIET=$($P "$B/api/state?userId=$SP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).notifications.some(x=>x.title.includes('تست سکوت'))?'1':'0'")
# اعلان موکول نباید الان دیده شود
chk "quiet-hours-deferred" "$([ "$QUIET" = "0" ] && echo 1)" "quiet پیام در سکوت فوری دیده شد"
$P -X PUT $B/api/settings -H 'Content-Type: application/json' -d "{\"userId\":\"$SP_ID\",\"quietStart\":\"22:00\",\"quietEnd\":\"08:00\"}" >/dev/null

echo "=== 25) انقضای ثبت‌نام ۷۲ ساعته ==="
$P -X POST $B/api/register -H 'Content-Type: application/json' -d '{"fullName":"متقاضی قدیمی","phone":"09120000006","age":"30","education":"diploma","district":"s1","base":"پایگاه کوثر"}' >/dev/null
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const u = await db.user.findUnique({where:{username:'user_20000006'}});
  if (!u) { console.log('REGISTER_FAIL'); process.exit(0); }
  await db.user.update({where:{id:u.id}, data:{createdAt:new Date(Date.now()-80*3600*1000)}});
  console.log('AGED');
  await db.\$disconnect();
})();
" >/dev/null
$P "$B/api/state?userId=$ADMIN_ID" >/dev/null
EXP2=$(node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
db.user.findUnique({where:{username:'user_20000006'}}).then(u=>{console.log(u.status === 'rejected' && u.rejectReason === 'expired' ? 1 : 0); return db.\$disconnect();});
" 2>/dev/null)
chk "pending-expiry-72h" "$EXP2" "not expired"

echo "=== 26) سقوط خودکار ۷ روزه (سناریوی ۷) ==="
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  // خبرنگار: امتیاز بالا + سطح دوم + ۸ روز بی‌فعالیت
  await db.user.update({where:{id:'$REP_ID'}, data:{points:200, levelKey:'active', lastActivityAt:new Date(Date.now()-9*24*3600*1000)}});
  console.log('AGED2');
  await db.\$disconnect();
})();
" >/dev/null
$P "$B/api/state?userId=$REP_ID" >/dev/null
DEM=$(node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
db.user.findUnique({where:{id:'$REP_ID'}}).then(u=>{console.log(u.levelKey === 'follower' ? 1 : 0); return db.\$disconnect();});
" 2>/dev/null)
chk "auto-demotion-7d" "$DEM" "level did not demote"
DEMNOTIF=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).notifications.some(x=>x.kind==='demotion')?'1':'0'")
chk "demotion-notification" "$DEMNOTIF" "no demotion notif"

echo "=== 27) کارت خبرنگاری داده‌ها ==="
PC=$($P "$B/api/state?userId=$REP_ID")
PCC=$(echo "$PC" | node -pe "const u=JSON.parse(require('fs').readFileSync(0)).user; (u.username && u.createdAt && u.levelTitle)?1:0")
chk "presscard-data" "$PCC" "missing fields"

echo "=== 28) آمار روزانه (تهران) ==="
DAYPTS=$($P "$B/api/state?userId=$REP_ID" | node -pe "JSON.parse(require('fs').readFileSync(0)).stats.day.points")
chk "day-stats-working" "$(node -e "console.log($DAYPTS>0?1:0)")" "dayPoints=$DAYPTS"

echo ""
echo "=================================="
echo "PASS: $pass / $((pass+fail))"
echo "=================================="
[ $fail -eq 0 ] && echo "ALL_TESTS_PASSED" || echo "SOME_TESTS_FAILED"
