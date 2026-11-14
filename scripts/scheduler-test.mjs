// تست زمان‌بند نگهداری (housekeeping) — انقضای درخواست‌ها، پایان خودکار چالش،
// سقوط سطح پس از غیبت و یادآوری درخواست‌های معطل.
// اجرا: DATABASE_URL="file:./db/custom.db" BASE=http://localhost:3100 node scripts/scheduler-test.mjs
import { PrismaClient } from "@prisma/client"

const BASE = process.env.BASE ?? "http://localhost:3100"
const db = new PrismaClient()

let pass = 0, fail = 0
const failures = []
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; failures.push(name); console.log(`  ❌ ${name} ${detail}`) }
}

const jar = new Map()
async function api(path, body, method = "GET") {
  const headers = { "Content-Type": "application/json" }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ")
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";")
    const idx = pair.indexOf("=")
    const k = pair.slice(0, idx).trim()
    const v = pair.slice(idx + 1).trim()
    if (v === "") jar.delete(k); else jar.set(k, v)
  }
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

// ── ریست دیتابیس (ترتیب رعایت کلیدهای خارجی) ──
async function resetDb() {
  const tables = [
    "ForumReaction", "ForumPoll", "ForumMessage", "ForumTopic", "ForumWeeklyQuestion",
    "TrainingProgress", "Training", "Notification", "NotifSetting", "PointsLog",
    "UserBadge", "Draft", "ChallengeParticipation", "Challenge", "NewsEvent", "NewsItem",
    "User",
  ]
  for (const t of tables) {
    await db.$executeRawUnsafe(`DELETE FROM "${t}"`).catch(() => {})
  }
}

// ── آماده‌سازی: ادمین ──
console.log("\n════ ۱) آماده‌سازی ════")
await resetDb()
const reg = await api("/api/register", { fullName: "مدیر زمان‌بند", phone: "09300500977", age: "35", education: "master" }, "POST")
ok("ادمین ساخته شد", reg.status === 200, JSON.stringify(reg.json))
const adminId = reg.json?.userId

// ══════════════ سناریو ۱: انقضای درخواست عضویت ══════════════
console.log("\n════ ۲) انقضای درخواست عضویت بی‌پاسخ (۷۲ ساعت) ════")
const stale = await db.user.create({
  data: {
    username: "stale_pending_user", fullName: "درخواست قدیمی", phone: "09121110000",
    role: "reporter", status: "pending", district: "b1", base: "پایگاه امام علی (ع)",
    createdAt: new Date(Date.now() - 100 * 3600 * 1000), // ۱۰۰ ساعت پیش (> ۷۲)
  },
})
ok("کاربر pending قدیمی ساخته شد", !!stale.id)
await api("/api/state") // فراخوانی state = اجرای زمان‌بند
const staleAfter = await db.user.findUnique({ where: { id: stale.id } })
ok("درخواست قدیمی خودکار منقضی شد", staleAfter?.status === "rejected", `status=${staleAfter?.status}`)
ok("دلیل انقضا = expired", staleAfter?.rejectReason === "expired", `reason=${staleAfter?.rejectReason}`)

// ══════════════ سناریو ۲: پایان خودکار چ═════
console.log("\n════ ۳) پایان خودکار چالش گذشته ════")
const challenge = await db.challenge.create({
  data: {
    code: "T-SCHED", title: "چالش تست زمان‌بند", description: "تست",
    deadlineAt: new Date(Date.now() - 10 * 3600 * 1000),
    endAt: new Date(Date.now() - 2 * 3600 * 1000), // ۲ ساعت پیش تمام شده
    reward: "۳۰ امتیاز", status: "active", createdBy: adminId,
  },
})
ok("چالش منقضی ساخته شد", !!challenge.id)
await api("/api/state")
const chAfter = await db.challenge.findUnique({ where: { id: challenge.id } })
ok("چالش خودکار تمام شد", chAfter?.status === "finished", `status=${chAfter?.status}`)
ok("زمان پایان ثبت شد", !!chAfter?.finishedAt)

// ══════════════ سناریو ۳: سقوط سطح پس از ۷ روز غیبت ══════════════
console.log("\n════ ۴) سقوط سطح پس از ۷ روز غیبت ════")
const idle = await db.user.create({
  data: {
    username: "idle_reporter", fullName: "خبرنگار غایب", phone: "09122220000",
    role: "reporter", status: "active", district: "b1", base: "پایگاه امام علی (ع)",
    levelKey: "pro", points: 500,
    lastActivityAt: new Date(Date.now() - 9 * 24 * 3600 * 1000), // ۹ روز پیش
    lastDemotionAt: null,
  },
})
ok("خبرنگار سطح‌بالا با ۹ روز غیبت ساخته شد", idle.levelKey === "pro")
// نشست او را می‌سازیم تا state بگیرد و زمان‌بند روی او اجرا شود
const idleJar = new Map()
const idleLogin = await (async () => {
  const headers = { "Content-Type": "application/json" }
  const r = await fetch(`${BASE}/api/login`, { method: "POST", headers, body: JSON.stringify({ phone: "09122220000" }) })
  for (const c of r.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";")
    const idx = pair.indexOf("=")
    idleJar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
  return r.status
})()
ok("ورود خبرنگار غایب", idleLogin === 200)
await fetch(`${BASE}/api/state`, { headers: { Cookie: [...idleJar].map(([k, v]) => `${k}=${v}`).join("; ") } })
const idleAfter = await db.user.findUnique({ where: { id: idle.id } })
ok("سطح یک پله سقوط کرد", idleAfter?.levelKey === "active", `levelKey=${idleAfter?.levelKey}`)

// ══════════════ سناریو ۴: یادآوری درخواست‌های معطل ══════════════
console.log("\n════ ۵) یادآوری به ادمین دربارهٔ درخواست‌های معطل (۲۴ ساعت) ════")
await db.user.create({
  data: {
    username: "fresh_pending_user", fullName: "درخواست تازه", phone: "09123330000",
    role: "reporter", status: "pending", district: "b1", base: "پایگاه امام علی (ع)",
    createdAt: new Date(Date.now() - 30 * 3600 * 1000), // ۳۰ ساعت پیش (> ۲۴)
  },
})
await api("/api/state")
const nudge = await db.notification.findFirst({
  where: { userId: adminId, kind: "pending_user" },
  orderBy: { createdAt: "desc" },
})
ok("یادآوری برای ادمین ساخته شد", !!nudge, `ref=${nudge?.ref}`)
ok("متن یادآوری درست است", (nudge?.body ?? "").includes("درخواست عضویت معطل مانده"), nudge?.body)
ok("عنوان یادآوری درست است", (nudge?.title ?? "").includes("در انتظار بررسی"), nudge?.title)

// ══════════════ سناریو ۵: یادآوری مهلت چ═════
console.log("\n════ ۶) یادآوری مهلت چالش (۳ ساعت مانده) ════")
const soon = await db.challenge.create({
  data: {
    code: "T-SOON", title: "چالش نزدیک به پایان", description: "تست",
    deadlineAt: new Date(Date.now() + 2 * 3600 * 1000), // ۲ ساعت دیگر
    endAt: new Date(Date.now() + 24 * 3600 * 1000),
    reward: "۳۰ امتیاز", status: "active", createdBy: adminId,
  },
})
await api("/api/state")
const reminded = await db.challenge.findUnique({ where: { id: soon.id } })
ok("پرچم یادآوری مهلت ثبت شد", reminded?.deadlineNotified === true, `notified=${reminded?.deadlineNotified}`)

// ══════════════ پاکسازی ══════════════
await resetDb()

console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`)
if (fail) console.log("ناموفق‌ها:", failures.join(" | "))
console.log("")
await db.$disconnect()
process.exit(fail === 0 ? 0 : 1)
