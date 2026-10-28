// تست E2E چرخه سه‌مرحله‌ای خبر — خبرنگار → مدیر حوزه → کارشناس → ادمین کل
const BASE = "http://localhost:3000"
let pass = 0, fail = 0
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ""}`) }
  else { fail++; console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ""}`) }
}
async function api(path, body, method = "POST") {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}
async function state(userId) {
  const { data } = await api(`/api/state?userId=${encodeURIComponent(userId)}`, null, "GET")
  return data
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

console.log("\n═══ مرحله ۰: راه‌اندازی سازمان با کاربران تست ═══")
const ts = Date.now()
const phoneOf = (i) => `0912${i}${String(ts).slice(-7)}` // ۸ رقم آخر برای هر کاربر یکتاست
// ادمین (اولین کاربر فعلی موجود است) — ثبت ۳ کاربر جدید
const reg1 = await api("/api/register", { fullName: `تست مدیر حوزه ${ts}`, phone: phoneOf(1), age: "35", education: "bachelor", district: "b1", base: BASE_OF("b1") })
const reg2 = await api("/api/register", { fullName: `تست کارشناس ${ts}`, phone: phoneOf(2), age: "30", education: "bachelor", district: "b1", base: BASE_OF("b1") })
const reg3 = await api("/api/register", { fullName: `تست خبرنگار ${ts}`, phone: phoneOf(3), age: "26", education: "diploma", district: "b1", base: BASE_OF("b1") })
ok("ثبت‌نام ۳ کاربر جدید", reg1.data.ok && reg2.data.ok && reg3.data.ok, (reg1.data.error || reg2.data.error || reg3.data.error) ?? "")
const dmId = reg1.data.userId, spId = reg2.data.userId, repId = reg3.data.userId

// ادمین فعلی
const boot = await api("/api/bootstrap", null, "GET")
const admin = boot.data.users.find((u) => u.role === "admin")
ok("ادمین کل موجود است", !!admin, admin?.fullName)

// غیرفعال‌کردن ساعت سکوت برای همه کاربران تست (سیستم درست کار می‌کند؛ تست نباید ۴۲۹ دقیقه صبر کند!)
for (const id of [admin.id, dmId, spId, repId]) {
  await api("/api/settings", { userId: id, quietStart: "00:00", quietEnd: "00:00" }, "PUT")
}

// تایید عضویت هر ۳ کاربر توسط ادمین
for (const id of [dmId, spId, repId]) {
  const r = await api("/api/users", { userId: admin.id, targetId: id, action: "approve" })
  ok(`تایید عضویت ${id.slice(-4)}`, r.data.ok, r.data.message)
}

// انتصاب نقش‌ها (API جدید)
const p1 = await api("/api/users", { userId: admin.id, targetId: dmId, action: "set_role", newRole: "district_manager", newDistrict: "b1" })
ok("انتصاب مدیر حوزه (set_role)", p1.data.ok, p1.data.message)
const p2 = await api("/api/users", { userId: admin.id, targetId: spId, action: "set_role", newRole: "specialist" })
ok("انتصاب کارشناس (set_role)", p2.data.ok, p2.data.message)
const st0 = await state(admin.id)
ok("شمارش نیروها به‌روز شد", st0.staffCounts.district >= 1 && st0.staffCounts.specialist >= 1, JSON.stringify(st0.staffCounts))
// نقش نامعتبر باید رد شود
const p3 = await api("/api/users", { userId: admin.id, targetId: spId, action: "set_role", newRole: "hacker" })
ok("نقش نامعتبر رد شد", p3.status === 400)

console.log("\n═══ مرحله ۱: خبرنگار خبر را ارسال می‌کند ═══")
const sub = await api("/api/news", {
  userId: repId, category: "local", challengeId: null, durationMin: 25,
  title: "تست چرخه سه‌مرحله‌ای خبرگزاری بشر",
  content: "این خبر برای تست کامل چرخه بررسی سه‌مرحله‌ای ارسال شده است و باید از مدیر حوزه به کارشناس و سپس ادمین کل برسد.",
})
ok("ارسال خبر", sub.data.ok, sub.data.code)
const newsId = sub.data.news.id

let sRep = await state(repId)
let myNews = sRep.news.find((n) => n.id === newsId)
ok("وضعیت: pending در مرحله district", myNews?.status === "pending" && myNews?.reviewStage === "district")
ok("رویداد submitted ثبت شد", myNews?.events?.some((e) => e.action === "submitted") === true, `تعداد رویداد: ${myNews?.events?.length}`)
ok("خبر در صف مدیر حوزه ظاهر شد", (await state(dmId)).reviewQueue.some((n) => n.id === newsId))
ok("اعلان به خبرنگار: ورود به چرخه بعد از ارسال (رویداد ثبت شد)", myNews?.events?.length >= 1)

console.log("\n═══ مرحله ۲: مدیر حوزه تایید می‌کند → کارشناس ═══")
const r1 = await api("/api/news/review", { userId: dmId, newsId, action: "approve" })
ok("تایید مدیر حوزه و ارجاع", r1.data.ok && r1.data.advancedTo === "specialist", r1.data.message)
sRep = await state(repId)
myNews = sRep.news.find((n) => n.id === newsId)
ok("مرحله جدید: specialist", myNews?.reviewStage === "specialist" && myNews?.status === "pending")
ok("رویداد advanced ثبت شد", myNews?.events?.some((e) => e.action === "advanced" && e.stage === "district" && e.actorName.includes("مدیر حوزه")) === true)
const repNotifs1 = sRep.notifications
ok("🔔 اعلان به خبرنگار از تایید مدیر حوزه", repNotifs1.some((n) => n.title.includes("تایید مدیر حوزه")), repNotifs1[0]?.title)
ok("🔔 اعلان به کارشناس: خبر به مرحله‌اش رسید", (await state(spId)).notifications.some((n) => n.title.includes("مرحله شما رسید")))

console.log("\n═══ مرحله ۳: کارشناس تایید می‌کند → ادمین کل ═══")
const r2 = await api("/api/news/review", { userId: spId, newsId, action: "approve" })
ok("تایید کارشناس و ارجاع", r2.data.ok && r2.data.advancedTo === "admin", r2.data.message)
sRep = await state(repId)
myNews = sRep.news.find((n) => n.id === newsId)
ok("مرحله جدید: admin", myNews?.reviewStage === "admin" && myNews?.status === "pending")
ok("🔔 اعلان به خبرنگار از تایید کارشناس", sRep.notifications.some((n) => n.title.includes("تایید کارشناس")))
// امنیت: مدیر حوزه نباید خبر مرحله کارشناس را تایید کند
const sec = await api("/api/news/review", { userId: dmId, newsId, action: "approve" })
ok("قفل امنیتی: مدیر حوزه نمی‌تواند مرحله کارشناس را تایید کند", sec.status === 403)

console.log("\n═══ مرحله ۴: ادمین کل — انتشار نهایی ═══")
const r3 = await api("/api/news/review", { userId: admin.id, newsId, action: "approve", mode: "final" })
ok("انتشار نهایی توسط ادمین", r3.data.ok && r3.data.final === true, r3.data.message)
sRep = await state(repId)
myNews = sRep.news.find((n) => n.id === newsId)
ok("وضعیت نهایی: approved", myNews?.status === "approved")
ok("رویداد final_approved ثبت شد", myNews?.events?.some((e) => e.action === "final_approved") === true)
ok("🔔 اعلان تایید نهایی به خبرنگار", sRep.notifications.some((n) => n.kind === "approved" && n.title.includes("تایید و منتشر")))
const repAfter = sRep.user.points
ok("امتیاز تایید به خبرنگار رسید", repAfter >= 15, `${repAfter} امتیاز`)
// تایم‌لاین کامل
const evActions = myNews?.events?.map((e) => e.action).join(" → ")
ok("ردپای کامل چرخه", evActions === "submitted → advanced → advanced → final_approved", evActions)

console.log("\n═══ مرحله ۵: ادمین — ارجاع به‌جای پرش (mode=advance) ═══")
const sub2 = await api("/api/news", { userId: repId, category: "local", title: "تست ارجاع ادمین به مرحله بعد", content: "این خبر دوم است تا رفتار ارجاع ادمین کل بدون پرش مرحله تست شود و به کارشناس برسد." })
const newsId2 = sub2.data.news.id
const ra = await api("/api/news/review", { userId: admin.id, newsId: newsId2, action: "approve", mode: "advance" })
ok("ادمین به‌جای انتشار، ارجاع داد", ra.data.ok && ra.data.advancedTo === "specialist", ra.data.message)
const s2 = await state(repId)
ok("خبر دوم الان دست کارشناس است", s2.news.find((n) => n.id === newsId2)?.reviewStage === "specialist")

console.log("\n═══ مرحله ۶: رد خبر + ارسال مجدد + چرخه از نو ═══")
const rb = await api("/api/news/review", { userId: spId, newsId: newsId2, action: "reject", reason: "style", note: "بازنویسی شود" })
ok("رد توسط کارشناس با دلیل", rb.data.ok, rb.data.message)
const s3 = await state(repId)
const n2 = s3.news.find((x) => x.id === newsId2)
ok("وضعیت: rejected", n2?.status === "rejected")
ok("رویداد rejected ثبت شد با دلیل", n2?.events?.some((e) => e.action === "rejected" && e.note.includes("اصول خبرنویسی")) === true)
ok("🔔 اعلان رد به خبرنگار", s3.notifications.some((n) => n.kind === "rejected" && n.title.includes("رد شد")))
const rs = await api("/api/news/resubmit", { userId: repId, newsId: newsId2, title: "تست ارجاع ادمین — نسخه بازنویسی‌شده خبر" })
ok("ارسال مجدد", rs.data.ok, rs.data.message)
const s4 = await state(repId)
const n2b = s4.news.find((x) => x.id === newsId2)
ok("برگشت به مرحله ۱ (district)", n2b?.status === "pending" && n2b?.reviewStage === "district")
ok("رویداد resubmitted ثبت شد", n2b?.events?.some((e) => e.action === "resubmitted") === true)
ok("🔔 اعلان به مدیر حوزه: خبر برگشت", (await state(dmId)).notifications.some((n) => n.title.includes("برگشت")))

console.log("\n═══ مرحله ۷: محدودیت حوزه مدیر حوزه ═══")
// خبرنگار حوزه b2 خبر بدهد؛ مدیر حوزه b1 نباید ببیند
const reg4 = await api("/api/register", { fullName: `تست خبرنگار b2 ${ts}`, phone: phoneOf(4), age: "28", education: "bachelor", district: "b2", base: BASE_OF("b2") })
const rep2Id = reg4.data.userId
await api("/api/users", { userId: admin.id, targetId: rep2Id, action: "approve" })
const sub3 = await api("/api/news", { userId: rep2Id, category: "local", title: "خبر حوزه دیگر برای تست مرزها", content: "این خبر از حوزه b2 است و نباید در صف مدیر حوزه b1 ظاهر شود چون خارج از حوزه اوست." })
const newsId3 = sub3.data.news.id
const dmQueue = await state(dmId)
ok("مدیر حوزه b1 خبر b2 را نمی‌بیند", !dmQueue.reviewQueue.some((n) => n.id === newsId3))
const cross = await api("/api/news/review", { userId: dmId, newsId: newsId3, action: "approve" })
ok("قفل امنیتی: تایید خبر حوزه دیگر رد شد", cross.status === 403)

console.log(`\n═══ نتیجه: ${pass} موفق / ${fail} ناموفق ═══`)
if (fail === 0) console.log("🎉 چرخه سه‌مرحله‌ای کامل و سالم است")

function BASE_OF(d) {
  return "پایگاه امام علی (ع)"
}
