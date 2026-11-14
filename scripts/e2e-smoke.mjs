// تست انتها‌به‌انتهای جریان‌های اصلی با احراز هویت مبتنی بر نشست (کوکی)
// اجرا: BASE=http://localhost:3100 node scripts/e2e-smoke.mjs
const BASE = process.env.BASE ?? "http://localhost:3100"

let pass = 0, fail = 0
const failures = []
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; failures.push(name); console.log(`  ❌ ${name} ${detail}`) }
}

// ── کارخانهٔ نشست: کوکی‌ها را نگه می‌دارد و می‌فرستد ──
function makeSession() {
  const jar = new Map()
  return {
    jar,
    async call(path, body, method = "GET") {
      const headers = { "Content-Type": "application/json" }
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      for (const c of res.headers.getSetCookie?.() ?? []) {
        const [pair] = c.split(";")
        const idx = pair.indexOf("=")
        const k = pair.slice(0, idx).trim()
        const v = pair.slice(idx + 1).trim()
        if (v === "") jar.delete(k)
        else jar.set(k, v)
      }
      let json = null
      try { json = await res.json() } catch {}
      return { status: res.status, json }
    },
    get(p, b) { return this.call(p, b, "GET") },
    post(p, b) { return this.call(p, b, "POST") },
  }
}

const admin = makeSession()
const rep = makeSession()
const anon = makeSession()

console.log("\n════ ۱) ثبت‌نام ادمین کل ════")
const reg = await admin.post("/api/register", {
  fullName: "مدیر آزمایشی", phone: "09300500977", age: "35", education: "master",
})
ok("ادمین با شماره مدیر ثبت‌نام شد", reg.status === 200 && reg.json?.role === "admin", JSON.stringify(reg.json))
ok("وضعیت ادمین = active", reg.json?.status === "active")
ok("نشست ادمین صادر شد (کوکی)", admin.jar.has("bn_session"), [...admin.jar.keys()].join(","))
const adminId = reg.json?.userId

console.log("\n════ ۲) ثبت‌نام خبرنگار + در انتظار تایید ════")
const repReg = await anon.post("/api/register", {
  fullName: "خبرنگار تست", phone: "09121234567", age: "25", education: "bachelor",
  district: "b1", base: "پایگاه امام علی (ع)",
})
ok("خبرنگار ثبت‌نام شد", repReg.status === 200, JSON.stringify(repReg.json))
ok("نقش = reporter", repReg.json?.role === "reporter")
ok("وضعیت = pending", repReg.json?.status === "pending")
ok("برای خبرنگار در انتظار نشست صادر نشد", !anon.jar.has("bn_session"))
const repId = repReg.json?.userId

console.log("\n════ ۳) کنترل دسترسی بدون نشست ════")
const noSess = await anon.get(`/api/state?userId=${adminId}`)
ok("درخواست بدون نشست رد می‌شود (۴۰۱)", noSess.status === 401, `status=${noSess.status}`)

console.log("\n════ ۴) ورود با شماره ════")
const loginBad = await anon.post("/api/login", { phone: "12345" })
ok("شماره نامعتبر رد شد", loginBad.status === 400)
const loginPend = await anon.post("/api/login", { phone: "09121234567" })
ok("ورود کاربر در انتظار تایید رد شد (۴۰۳)", loginPend.status === 403, `status=${loginPend.status}`)

console.log("\n════ ۵) تایید عضویت توسط ادمین ════")
const decide = await admin.post("/api/users/decide", { targetId: repId, action: "approve" })
ok("تایید عضویت", decide.status === 200, JSON.stringify(decide.json))

console.log("\n════ ۶) ورود خبرنگار ════")
const login = await rep.post("/api/login", { phone: "09121234567" })
ok("ورود موفق", login.status === 200 && login.json?.ok === true, JSON.stringify(login.json))
ok("userId درست", login.json?.userId === repId)
ok("نشست خبرنگار صادر شد", rep.jar.has("bn_session"))
const st = await rep.get(`/api/state`)
ok("خبرنگار اکنون فعال", st.json?.user?.status === "active", JSON.stringify(st.json?.user?.status))

console.log("\n════ ۷) جعل userId نادیده گرفته می‌شود ════")
// نشست خبرنگار معتبر است، پس سرور باید هویت «خبرنگار» را مبنا بگیرد نه شناسهٔ جعلی ادمین
const forged = await rep.post("/api/news/review", { userId: adminId, newsId: 1, action: "approve" })
ok("جعل شناسه ادمین نادیده گرفته شد (۴۰۳ بر پایهٔ نقش واقعی)", forged.status === 403, `status=${forged.status}`)
const forgedState = await rep.get(`/api/state?userId=${adminId}`)
ok("جعل userId در کوئری → هویت ادمین اعمال نمی‌شود", forgedState.json?.user?.id === repId, JSON.stringify(forgedState.json?.user?.id))

console.log("\n════ ۸) ارسال خبر ════")
const preparedAt = new Date(Date.now() - 3600_000).toISOString()
const sub = await rep.post("/api/news", {
  category: "politics", title: "تیتر تست خبرگزاری",
  content: "متن کامل خبر برای بررسی سه‌مرحله‌ای در سامانه خبرگزاری بشر.",
  mediaType: "none", durationMin: 25, preparedAt,
})
ok("ارسال خبر", sub.status === 200, JSON.stringify(sub.json))
const newsId = sub.json?.news?.id
ok("شناسه خبر برگشت", !!newsId, JSON.stringify(sub.json))
ok("کد پیگیری ساخته شد (N-…)", /^N-\d+$/.test(sub.json?.news?.code ?? ""), sub.json?.news?.code)

console.log("\n════ ۹) چرخه تایید سه‌مرحله‌ای ════")
const q1 = await admin.get(`/api/state`)
const queued = (q1.json?.reviewQueue ?? []).find((n) => n.id === newsId)
ok("خبر در صف بررسی ادمین", !!queued, JSON.stringify(q1.json).slice(0, 200))
const rv1 = await admin.post("/api/news/review", { newsId, action: "approve", mode: "advance" })
ok("تایید مرحله اول توسط ادمین", rv1.status === 200, JSON.stringify(rv1.json))
const rv2 = await admin.post("/api/news/review", { newsId, action: "approve", mode: "final" })
ok("تایید نهایی و انتشار", rv2.status === 200, JSON.stringify(rv2.json))
const feed = await rep.get(`/api/news/feed`)
const published = (feed.json?.news ?? []).find((n) => n.id === newsId)
ok("خبر منتشرشده در فید", !!published, JSON.stringify(feed.json).slice(0, 200))
ok("تاریخ تهیه خبر ذخیره شد", !!published?.preparedAt, `preparedAt=${published?.preparedAt}`)

console.log("\n════ ۱۰) امتیاز و نشان ════")
const st2 = await rep.get(`/api/state`)
ok("امتیاز خبرنگار افزایش یافت", (st2.json?.user?.points ?? 0) > 0, `points=${st2.json?.user?.points}`)
ok("سطح تعیین شد", !!st2.json?.user?.levelKey)
ok("پرچم ادمین کل برای خبرنگار false است", st2.json?.user?.isSuperAdmin === false)

console.log("\n════ ۱۱) تالار گفتگو ════")
const t1 = await rep.post("/api/forum", { action: "topic", title: "تاپیک تست", type: "class" })
ok("ایجاد تاپیک", t1.status === 200, JSON.stringify(t1.json))
const topicId = t1.json?.topic?.id ?? t1.json?.id
const m1 = await rep.post("/api/forum", { action: "message", topicId, body: "سلام، این یک پیام تست است." })
ok("ارسال پیام", m1.status === 200, JSON.stringify(m1.json))
const msgId = m1.json?.message?.id ?? m1.json?.id
const react = await admin.post("/api/forum", { action: "react", messageId: msgId, emoji: "👍" })
ok("واکنش به پیام", react.status === 200, JSON.stringify(react.json))

console.log("\n════ ۱۲) بخش آموزش (آکادمی) ════")
const tr = await admin.post("/api/training", { action: "create", title: "دوره تست", body: "محتوای آموزشی", category: "writing", level: "beginner", minutes: 10 })
ok("ایجاد دوره آموزشی", tr.status === 200, JSON.stringify(tr.json))
const trId = tr.json?.training?.id ?? tr.json?.id
const trv = await rep.post("/api/training", { action: "view", id: trId })
ok("ثبت بازدید دوره", trv.status === 200, JSON.stringify(trv.json))
const trc = await rep.post("/api/training", { action: "complete", id: trId })
ok("ثبت «خوانده شد»", trc.status === 200, JSON.stringify(trc.json))

console.log("\n════ ۱۳) اعلان‌ها و چالش ════")
const notif = await rep.post("/api/notifications/read", {})
ok("خواندن اعلان‌ها", notif.status === 200, JSON.stringify(notif.json))
const ch = await admin.post("/api/challenges", { title: "چالش تست", description: "توضیح", reward: "جایزه", deadlineAt: new Date(Date.now() + 86400000).toISOString() })
ok("ساخت چالش", ch.status === 200, JSON.stringify(ch.json))
const chId = ch.json?.challenge?.id ?? ch.json?.id
const join = await rep.post("/api/challenges/join", { challengeId: chId })
ok("عضویت در چالش", join.status === 200, JSON.stringify(join.json))

console.log("\n════ ۱۴) کنترل دسترسی ════")
const forbidden = await rep.post("/api/news/review", { newsId, action: "approve" })
ok("خبرنگار نمی‌تواند خبر تایید کند", forbidden.status === 403, `status=${forbidden.status}`)
const badNews = await admin.post("/api/news/review", { newsId: 999999, action: "approve" })
ok("خبر ناموجود → 404", badNews.status === 404, `status=${badNews.status}`)
const noAdmin = await rep.get("/api/admin/overview")
ok("خبرنگار به پنل مدیریت دسترسی ندارد", noAdmin.status === 403, `status=${noAdmin.status}`)

console.log("\n════ ۱۵) خروج ════")
const out = await rep.post("/api/logout", {})
ok("خروج موفق", out.status === 200, JSON.stringify(out.json))
ok("کوکی نشست پاک شد", !rep.jar.has("bn_session"))
const afterOut = await rep.get("/api/state")
ok("بعد از خروج نشست کار نمی‌کند", afterOut.status === 401, `status=${afterOut.status}`)

console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`)
if (fail) console.log("ناموفق‌ها:", failures.join(" | "))
console.log("")
process.exit(fail === 0 ? 0 : 1)
