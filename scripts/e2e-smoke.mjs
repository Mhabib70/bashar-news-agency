// تست انتها‌به‌انتهای جریان‌های اصلی — اجرا: node scripts/e2e-smoke.mjs
// BASE=http://localhost:3100 node scripts/e2e-smoke.mjs
const BASE = process.env.BASE ?? "http://localhost:3100"

let pass = 0, fail = 0
const failures = []
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; failures.push(name); console.log(`  ❌ ${name} ${detail}`) }
}
async function api(path, body, method = "GET") {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await r.json() } catch {}
  return { status: r.status, json }
}
const post = (path, body) => api(path, body, "POST")

console.log("\n════ ۱) ثبت‌نام ادمین کل ════")
const admin = await post("/api/register", {
  fullName: "مدیر آزمایشی", phone: "09300500977", age: "35", education: "master",
})
ok("ادمین با شماره مدیر ثبت‌نام شد", admin.status === 200 && admin.json?.role === "admin", JSON.stringify(admin.json))
ok("وضعیت ادمین = active", admin.json?.status === "active")
const adminId = admin.json?.userId

console.log("\n════ ۲) ثبت‌نام خبرنگار + در انتظار تایید ════")
const rep = await post("/api/register", {
  fullName: "خبرنگار تست", phone: "09121234567", age: "25", education: "bachelor",
  district: "b1", base: "پایگاه امام علی (ع)",
})
ok("خبرنگار ثبت‌نام شد", rep.status === 200, JSON.stringify(rep.json))
ok("نقش = reporter", rep.json?.role === "reporter")
ok("وضعیت = pending", rep.json?.status === "pending")
const repId = rep.json?.userId

console.log("\n════ ۳) ورود با شماره ════")
const login = await post("/api/login", { phone: "09121234567" })
ok("ورود موفق", login.status === 200 && login.json?.ok === true, JSON.stringify(login.json))
ok("userId درست", login.json?.userId === repId)
const loginBad = await post("/api/login", { phone: "12345" })
ok("شماره نامعتبر رد شد", loginBad.status === 400)

console.log("\n════ ۴) تایید عضویت توسط ادمین ════")
const decide = await post("/api/users/decide", { userId: adminId, targetId: repId, action: "approve" })
ok("تایید عضویت", decide.status === 200, JSON.stringify(decide.json))
const st = await api(`/api/state?userId=${repId}`)
ok("خبرنگار اکنون فعال", st.json?.user?.status === "active", JSON.stringify(st.json?.user?.status))

console.log("\n════ ۵) ارسال خبر ════")
const sub = await post("/api/news", {
  userId: repId, category: "politics", title: "تیتر تست خبرگزاری",
  content: "متن کامل خبر برای بررسی سه‌مرحله‌ای در سامانه خبرگزاری بشر.",
  mediaType: "none", durationMin: 25,
})
ok("ارسال خبر", sub.status === 200, JSON.stringify(sub.json))
const newsId = sub.json?.news?.id ?? sub.json?.id
ok("شناسه خبر برگشت", !!newsId, JSON.stringify(sub.json))
ok("کد پیگیری ساخته شد (N-…)", /^N-\d+$/.test(sub.json?.news?.code ?? ""), sub.json?.news?.code)

console.log("\n════ ۶) چرخه تایید سه‌مرحله‌ای ════")
const q1 = await api(`/api/state?userId=${adminId}`)
const queued = (q1.json?.reviewQueue ?? []).find((n) => n.id === newsId)
ok("خبر در صف بررسی ادمین", !!queued, JSON.stringify(q1.json).slice(0, 200))
const rv1 = await post("/api/news/review", { userId: adminId, newsId, action: "approve", mode: "advance" })
ok("تایید مرحله اول توسط ادمین", rv1.status === 200, JSON.stringify(rv1.json))
const rv2 = await post("/api/news/review", { userId: adminId, newsId, action: "approve", mode: "final" })
ok("تایید نهایی و انتشار", rv2.status === 200, JSON.stringify(rv2.json))
const feed = await api(`/api/news/feed?userId=${repId}`)
const published = (feed.json?.news ?? feed.json?.items ?? []).find((n) => n.id === newsId)
ok("خبر منتشرشده در فید", !!published, JSON.stringify(feed.json).slice(0, 200))

console.log("\n════ ۷) امتیاز و نشان ════")
const st2 = await api(`/api/state?userId=${repId}`)
ok("امتیاز خبرنگار افزایش یافت", (st2.json?.user?.points ?? 0) > 0, `points=${st2.json?.user?.points}`)
ok("سطح تعیین شد", !!st2.json?.user?.levelKey)

console.log("\n════ ۸) تالار گفتگو ════")
const t1 = await post("/api/forum", { userId: repId, action: "topic", title: "تاپیک تست", type: "class" })
ok("ایجاد تاپیک", t1.status === 200, JSON.stringify(t1.json))
const topicId = t1.json?.topic?.id ?? t1.json?.id
const m1 = await post("/api/forum", { userId: repId, action: "message", topicId, body: "سلام، این یک پیام تست است." })
ok("ارسال پیام", m1.status === 200, JSON.stringify(m1.json))
const msgId = m1.json?.message?.id ?? m1.json?.id
const react = await post("/api/forum", { userId: adminId, action: "react", messageId: msgId, emoji: "👍" })
ok("واکنش به پیام", react.status === 200, JSON.stringify(react.json))

console.log("\n════ ۹) بخش آموزش (آکادمی) ════")
const tr = await post("/api/training", { userId: adminId, action: "create", title: "دوره تست", body: "محتوای آموزشی", category: "writing", level: "beginner", minutes: 10 })
ok("ایجاد دوره آموزشی", tr.status === 200, JSON.stringify(tr.json))
const trId = tr.json?.training?.id ?? tr.json?.id
const trv = await post("/api/training", { userId: repId, action: "view", id: trId })
ok("ثبت بازدید دوره", trv.status === 200, JSON.stringify(trv.json))
const trc = await post("/api/training", { userId: repId, action: "complete", id: trId })
ok("ثبت «خوانده شد»", trc.status === 200, JSON.stringify(trc.json))

console.log("\n════ ۱۰) اعلان‌ها و چالش ════")
const notif = await post("/api/notifications/read", { userId: repId })
ok("خواندن اعلان‌ها", notif.status === 200, JSON.stringify(notif.json))
const ch = await post("/api/challenges", { userId: adminId, title: "چالش تست", description: "توضیح", reward: "جایزه", deadlineAt: new Date(Date.now() + 86400000).toISOString() })
ok("ساخت چالش", ch.status === 200, JSON.stringify(ch.json))
const chId = ch.json?.challenge?.id ?? ch.json?.id
const join = await post("/api/challenges/join", { userId: repId, challengeId: chId })
ok("عضویت در چالش", join.status === 200, JSON.stringify(join.json))

console.log("\n════ ۱۱) کنترل دسترسی ════")
const forbidden = await post("/api/news/review", { userId: repId, newsId, action: "approve" })
ok("خبرنگار نمی‌تواند خبر تایید کند", forbidden.status === 403, `status=${forbidden.status}`)
const badNews = await post("/api/news/review", { userId: adminId, newsId: 999999, action: "approve" })
ok("خبر ناموجود → 404", badNews.status === 404, `status=${badNews.status}`)

console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`)
if (fail) console.log("ناموفق‌ها:", failures.join(" | "))
console.log("")
process.exit(fail === 0 ? 0 : 1)
