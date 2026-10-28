// سید داده نمایشی — خبرگزاری بسیج شهر رشت (فقط دیتابیس محلی db/custom.db)
// اجرا: bun run scripts/seed-demo.mjs   |   پاک‌سازی اولیه: bun run scripts/wipe-local-data.mjs
import { PrismaClient } from "@prisma/client"
import { NEWS, CHALLENGES, PARTICIPATIONS, BROADCASTS } from "./demo-news.mjs"

const db = new PrismaClient()
const now = Date.now()
const H = 3600 * 1000
const D = 24 * H
const ago = (h) => new Date(now - h * H)
const ahead = (d) => new Date(now + d * D)

// PRNG قطعی برای تکرارپذیری
let seed = 4242
function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1))

const B_BASES = ["پایگاه امام علی (ع)", "پایگاه حضرت زهرا (س)", "پایگاه شهید بهشتی", "پایگاه شهید چمران", "پایگاه امام حسین (ع)", "پایگاه شهید رجایی", "پایگاه ولی‌عصر (عج)", "پایگاه شهدای گمنام"]
const S_BASES = ["پایگاه کوثر", "پایگاه حضرت معصومه (س)", "پایگاه شهیده بنت‌الهدی", "پایگاه فاطمیه", "پایگاه الزهرا (س)", "پایگاه شهدای زن", "پایگاه رقیه (س)", "پایگاه حضرت خدیجه (س)"]

function levelFor(p) { return p >= 500 ? "expert" : p >= 300 ? "pro" : p >= 150 ? "active" : p >= 60 ? "follower" : "rookie" }

// ---------- کاربران ----------
const DISTRICTS = ["b1", "b2", "b3", "b4", "b5", "b6", "s1", "s2", "s3", "s4", "s5", "s6"]
const nextPhone = () => "0911" + String(1000000 + Math.floor(rnd() * 1000000))
const USERS = [
  { id: "u_admin", fullName: "حسین رحیمی", role: "admin", district: "", base: "", phone: "09113010001", age: "42", education: "master" },
]
let dmSeq = 0
for (const d of DISTRICTS) {
  dmSeq++
  USERS.push({
    id: `u_dm_${d}`,
    fullName: d.startsWith("b")
      ? ["مهدی فرهادی", "امیر عبدی", "رضا نعمتی", "سعید کمالی", "بهرام صادق‌نیا", "وحید تابش"][Number(d.slice(1)) - 1]
      : ["شهناز اکبری", "پروین رحمانی", "سمیرا غفاری", "ناهید نوروزی", "مهری سلطان‌زاده", "فریده بنی‌هاشمی"][Number(d.slice(1)) - 1],
    role: "district_manager", district: d, base: "", phone: `0911302${String(1000 + dmSeq)}`,
    age: "38", education: d.startsWith("b") ? "bachelor" : "master",
  })
}
const SPECS = [
  { id: "u_spec1", fullName: "محمود کیانی", role: "specialist", district: "", base: "", phone: "09113031001", age: "36", education: "master" },
  { id: "u_spec2", fullName: "لیلا رفیعی", role: "specialist", district: "", base: "", phone: "09113031002", age: "31", education: "master" },
  { id: "u_spec3", fullName: "امید دهقان", role: "specialist", district: "", base: "", phone: "09113031003", age: "29", education: "bachelor" },
]
USERS.push(...SPECS)

const REPS = [
  ["rep01", "امیرحسین میرمعزی", "b1", 0, "26", "bachelor"],
  ["rep02", "زهرا حسینی", "s1", 0, "27", "master"],
  ["rep03", "سجاد صمدی", "b2", 0, "31", "bachelor"],
  ["rep04", "محمد پورستاد", "b3", 0, "24", "bachelor"],
  ["rep05", "مریم صادقی", "s3", 0, "33", "phd"],
  ["rep06", "کاوه طاهری", "b1", 2, "29", "diploma"],
  ["rep07", "بهرام عبدلی", "b4", 0, "35", "associate"],
  ["rep08", "الهام برزگر", "s1", 3, "25", "bachelor"],
  ["rep09", "میلاد کاظمی", "b2", 2, "22", "diploma"],
  ["rep10", "سعید شریفی", "b5", 0, "30", "bachelor"],
  ["rep11", "نرگس فیضی", "s3", 2, "28", "bachelor"],
  ["rep12", "حمید نکویی", "b1", 4, "34", "associate"],
  ["rep13", "آرش قاسمی", "b6", 0, "23", "diploma"],
  ["rep14", "پریسا محمدپور", "s4", 0, "26", "bachelor"],
  ["rep15", "فؤاد شمس", "b3", 2, "27", "bachelor"],
  ["rep16", "شکوفه رستمی", "s2", 0, "32", "master"],
  ["rep17", "هانیه قدیری", "s3", 3, "24", "bachelor"],
  ["rep18", "پویا ناصری", "b4", 3, "28", "bachelor"],
  ["rep19", "لیلا احمدی", "s5", 0, "30", "associate"],
  ["rep20", "جمال رضوانی", "b5", 2, "37", "diploma"],
  ["rep21", "مینا سلطانی", "s4", 2, "29", "bachelor"],
  ["rep22", "فرهاد جلیلوند", "b6", 2, "41", "associate"],
  ["rep23", "سپیده معینی", "s6", 0, "21", "bachelor"],
  ["rep24", "رقیه دلیری", "s5", 2, "34", "master"],
]
for (const [id, fullName, d, bi, age, education] of REPS) {
  const n = Number(id.slice(3))
  USERS.push({ id: `u_${id}`, fullName, role: "reporter", district: d, base: (d.startsWith("b") ? B_BASES : S_BASES)[bi % 8], phone: `${pick(["0911", "0912", "0913", "0933"])}${String(1000000 + n * 911 + bi * 37)}`, age, education })
}
const PENDINGS = [
  { id: "u_pend1", fullName: "یاسر محمدنژاد", role: "reporter", district: "b6", base: B_BASES[3], phone: "09113041001", age: "25", education: "bachelor", hours: 9 },
  { id: "u_pend2", fullName: "زینب چراغی", role: "reporter", district: "s2", base: S_BASES[1], phone: "09113041002", age: "23", education: "bachelor", hours: 28 },
  { id: "u_pend3", fullName: "ابوالفضل کاویانی", role: "reporter", district: "b5", base: B_BASES[6], phone: "09113041003", age: "30", education: "associate", hours: 47 },
]
const REJECTED = [
  { id: "u_rej1", fullName: "کارمند تستی ردشده", role: "reporter", district: "b1", base: "پایگاه نامربوط", phone: "09113041004", age: "27", education: "", hours: 90, reason: "wrong_base" },
]

// ---------- نشان‌ها ----------
const BADGES_SEED = {
  rep01: [["first_news", 30], ["quality", 20], ["streak7", 12], ["professional", 8]],
  rep02: [["first_news", 28], ["quality", 15], ["streak7", 9], ["professional", 5]],
  rep03: [["first_news", 26], ["streak7", 10], ["champion", 1]],
  rep04: [["first_news", 25], ["champion", 2]],
  rep05: [["first_news", 24], ["quality", 6]],
  rep06: [["first_news", 9]], rep07: [["first_news", 3]], rep08: [["first_news", 2]],
  rep09: [], rep10: [["first_news", 5]], rep11: [["first_news", 1]], rep12: [["first_news", 2]],
  rep13: [["first_news", 4]], rep14: [["first_news", 3]], rep15: [], rep16: [["first_news", 5]],
  rep17: [["first_news", 4]], rep18: [["first_news", 4]], rep19: [["first_news", 5]],
  rep20: [["first_news", 8]], rep21: [["first_news", 6]], rep22: [["first_news", 7]],
  rep23: [], rep24: [["first_news", 8]],
}
const BADGE_TITLES = { first_news: "نشان اولین خبر", quality: "نشان باکیفیت", streak7: "نشان شکست‌ناپذیر", professional: "نشان حرفه‌ای", champion: "نشان قهرمان چالش" }

// ---------- اجرا ----------
async function main() {
  console.log("— پاک‌سازی جدول‌ها —")
  for (const t of ["pointsLog", "userBadge", "challengeParticipation", "challenge", "newsEvent", "newsItem", "draft", "notification", "notifSetting", "user"]) {
    await db[t].deleteMany()
  }

  console.log("— ساخت کاربران —")
  for (const u of USERS) {
    await db.user.create({
      data: {
        id: u.id, username: `user_${u.phone.slice(-8)}`, fullName: u.fullName, role: u.role, status: "active",
        district: u.district, base: u.base, phone: u.phone, age: u.age, education: u.education,
        currentStreak: u.role === "reporter" ? int(1, 5) : 0, bestStreak: u.role === "reporter" ? int(5, 14) : 0,
        lastActivityAt: ago(u.role === "admin" ? 1 : rnd() * 96),
        createdAt: ago(24 * int(35, 85) + int(0, 20)), points: 0, levelKey: "rookie",
        notifSetting: { create: {} },
      },
    })
  }
  for (const p of PENDINGS) {
    await db.user.create({
      data: {
        id: p.id, username: `user_${p.phone.slice(-8)}`, fullName: p.fullName, role: "reporter", status: "pending",
        district: p.district, base: p.base, phone: p.phone, age: p.age, education: p.education,
        createdAt: ago(p.hours), notifSetting: { create: {} },
      },
    })
  }
  for (const r of REJECTED) {
    await db.user.create({
      data: {
        id: r.id, username: `user_${r.phone.slice(-8)}`, fullName: r.fullName, role: "reporter", status: "rejected",
        district: r.district, base: r.base, phone: r.phone, age: r.age, education: r.education,
        rejectReason: r.reason, createdAt: ago(r.hours), notifSetting: { create: {} },
      },
    })
  }

  const repMap = Object.fromEntries(USERS.filter((u) => u.role === "reporter").map((u) => [u.id.replace("u_", ""), u]))
  const dmOf = (d) => ({ id: `u_dm_${d}`, role: "district_manager", fullName: USERS.find((u) => u.id === `u_dm_${d}`).fullName })
  const ADMIN = { id: "u_admin", role: "admin", fullName: "حسین رحیمی" }

  console.log("— ساخت چالش‌ها —")
  const chMap = {}
  for (const c of CHALLENGES) {
    const row = await db.challenge.create({
      data: {
        code: c.code, title: c.title, description: c.description, reward: c.reward, status: c.status,
        createdBy: c.createdBy, deadlineNotified: true,
        deadlineAt: ahead(c.deadlineIn), endAt: ahead(c.endIn),
        createdAt: ago(24 * c.daysAgo + int(0, 8)), finishedAt: c.status === "finished" ? ahead(c.endIn) : null,
      },
    })
    chMap[c.code] = row.id
  }
  for (const p of PARTICIPATIONS) {
    for (const [rid, count] of p.rows) {
      await db.challengeParticipation.create({
        data: { challengeId: chMap[p.code], userId: `u_${rid}`, count, joinedAt: ago(24 * int(1, 3) + int(0, 20)) },
      })
    }
  }

  console.log("— ساخت اخبار و رویدادها —")
  const pointsLogs = []
  const notifications = []
  const notify = (userId, kind, title, body, ref, at) => {
    const readAt = now - at.getTime() > 48 * H ? new Date(at.getTime() + int(2, 30) * H) : null
    notifications.push({ userId, kind, title, body, ref, deliveredAt: at, readAt, createdAt: at })
  }

  const sorted = [...NEWS].sort((a, b) => b.h - a.h) // قدیمی‌ها اول → کد پیگیری همخوان با زمان
  for (const n of sorted) {
    const reporterId = `u_${n.r}`
    const rep = repMap[n.r]
    const t0 = ago(n.h)
    const span = n.h * H
    const events = [{ newsId: 0, stage: "", action: "submitted", actorId: reporterId, actorName: rep.fullName, actorRole: "reporter", note: "", createdAt: t0 }]
    let reviewedBy = ""
    let reviewedAt = null

    const done = n.st === "approved" || n.st === "rejected"
    const needDistrict = done || n.sg === "specialist" || n.sg === "admin"
    const needSpecialist = done || n.sg === "admin"
    const spec = SPECS[Math.abs(n.r.charCodeAt(4) + n.h) % 3]

    if (needDistrict && !(n.st === "rejected" && n.r === "rep02")) {
      const dm = dmOf(n.d)
      events.push({ newsId: 0, stage: "district", action: "advanced", actorId: dm.id, actorName: dm.fullName, actorRole: "district_manager", note: "تایید شد و به «کارشناس» ارجاع شد", createdAt: new Date(t0.getTime() + span * 0.16) })
    }
    if (needSpecialist && n.st !== "rejected") {
      events.push({ newsId: 0, stage: "specialist", action: "advanced", actorId: spec.id, actorName: spec.fullName, actorRole: "specialist", note: "تایید شد و به «ادمین کل» ارجاع شد", createdAt: new Date(t0.getTime() + span * 0.42) })
    }
    if (n.st === "approved") {
      events.push({ newsId: 0, stage: "admin", action: "final_approved", actorId: ADMIN.id, actorName: ADMIN.fullName, actorRole: "admin", note: "منتشر شد (+۱۵ امتیاز)", createdAt: new Date(t0.getTime() + span * 0.72) })
      reviewedBy = ADMIN.fullName
      reviewedAt = events[events.length - 1].createdAt
    }
    if (n.st === "rejected") {
      const reasonLabels = { insufficient: "اطلاعات ناکافی", style: "عدم رعایت اصول خبرنویسی", duplicate: "تداخل خبری با خبر دیگر", irrelevant: "موضوع نامرتبط" }
      const atStage = n.r === "rep02" ? dmOf(n.d) : spec
      const stageKey = n.r === "rep02" ? "district" : "specialist"
      events.push({ newsId: 0, stage: stageKey, action: "rejected", actorId: atStage.id, actorName: atStage.fullName, actorRole: atStage.role, note: `${reasonLabels[n.rr]} — ${n.rn}`, createdAt: new Date(t0.getTime() + span * 0.5) })
      reviewedBy = atStage.fullName
      reviewedAt = events[events.length - 1].createdAt
    }
    if (n.rs) {
      events.push({ newsId: 0, stage: "", action: "resubmitted", actorId: reporterId, actorName: rep.fullName, actorRole: "reporter", note: "", createdAt: new Date(t0.getTime() + span * 0.8) })
      reviewedBy = ""
      reviewedAt = null
    }

    const last = events[events.length - 1]
    const news = await db.newsItem.create({
      data: {
        code: "tmp", reporterId, district: n.d, category: n.c, title: n.t, content: n.x,
        mediaType: n.m ? "photo" : "none", mediaUrl: n.m ? `/img/news/${n.m}.jpg` : "",
        status: n.st, reviewStage: n.st === "pending" ? n.sg : "",
        rejectReason: n.st === "rejected" ? n.rr : "", rejectNote: n.st === "rejected" ? n.rn : "",
        reviewedBy, reviewedAt, challengeId: n.ch ? chMap[n.ch] : null,
        durationMin: 20 + (n.h * 7) % 45, createdAt: t0, updatedAt: last.createdAt,
      },
    })
    for (const e of events) {
      await db.newsEvent.create({ data: { ...e, newsId: news.id } })
    }
    await db.newsItem.update({ where: { id: news.id }, data: { code: `N-${1000 + news.id}` } })

    // امتیازها
    pointsLogs.push({ userId: reporterId, amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: t0 })
    if (n.st === "approved") pointsLogs.push({ userId: reporterId, amount: 15, reason: "تایید خبر", ref: "approve", createdAt: reviewedAt })
    if (n.st === "rejected") notify(reporterId, "rejected", "❌ خبر شما رد شد", `${n.t} — ${n.rn}`, `news:${news.id}`, reviewedAt)
    if (n.st === "approved") notify(reporterId, "approved", "✅ خبر شما تایید و منتشر شد", `${n.t} (+۱۵ امتیاز)`, `news:${news.id}`, reviewedAt)

    // اعلان مراحل به ارزیاب‌ها
    if (n.st === "pending") {
      const body = `${n.t} — ${rep.fullName}`
      if (n.sg === "district") notify(`u_dm_${n.d}`, "review", "🔔 خبر به مرحله شما رسید", body, `news:${news.id}`, t0)
      if (n.sg === "specialist") for (const s of SPECS) notify(s.id, "review", "🔔 خبر به مرحله شما رسید", body, `news:${news.id}`, t0)
      if (n.sg === "admin") notify(ADMIN.id, "review", "🔔 خبر در انتظار تایید نهایی", body, `news:${news.id}`, t0)
    }
  }

  console.log("— نشان‌ها و امتیازهای نهایی —")
  for (const [rid, badges] of Object.entries(BADGES_SEED)) {
    const uid = `u_${rid}`
    const titles = { first_news: ["اولین خبر", 20], quality: ["باکیفیت", 25], streak7: ["شکست‌ناپذیر", 30], professional: ["حرفه‌ای", 40], champion: ["قهرمان چالش", 60] }
    for (const [key, days] of badges) {
      const at = ago(24 * days + int(1, 10))
      await db.userBadge.create({ data: { userId: uid, badgeKey: key, awardedAt: at } })
      pointsLogs.push({ userId: uid, amount: titles[key][1], reason: titles[key][0].startsWith("قهرمان") ? "قهرمانی در چالش" : `نشان ${titles[key][0]}`, ref: `badge:${key}`, createdAt: at })
      notify(uid, "badge", `🏅 نشان جدید: ${titles[key][0]}`, `آفرین! نشان «${titles[key][0]}» به پرونده شما اضافه شد.`, `badge:${key}`, at)
    }
  }
  // قهرمانان چالش‌های تمام‌شده — اعلان ویژه
  for (const p of PARTICIPATIONS) {
    const ch = CHALLENGES.find((c) => c.code === p.code)
    if (ch?.status !== "finished") continue
    const [winner] = p.rows[0]
    notify(`u_${winner}`, "challenge", `🥇 قهرمان چالش «${ch.title}»`, "تبریک! شما قهرمان این چالش شدید و ۶۰ امتیاز جایزه گرفتید.", `challenge:${p.code}`, ago(24 * 1 + int(1, 12)))
  }
  // یادآوری مهلت چالش‌های فعال
  for (const p of PARTICIPATIONS) {
    const ch = CHALLENGES.find((c) => c.code === p.code)
    if (ch?.status !== "active") continue
    for (const [rid] of p.rows) {
      notify(`u_${rid}`, "challenge_reminder", `⏰ یادآوری مهلت چالش`, `تا مهلت چالش «${ch.title}» فرصت کمی مانده است.`, `challenge:${p.code}`, ago(24 + int(0, 8)))
    }
  }
  // اطلاع‌رسانی همگانی
  const actives = [...USERS, ...[]].map((u) => u.id)
  for (const b of BROADCASTS) {
    const at = ago(b.hoursAgo)
    for (const uid of actives) notify(uid, "broadcast", b.title, b.body, "broadcast", at)
  }
  // اعلان درخواست عضویت به ادمین
  for (const p of PENDINGS) notify(ADMIN.id, "user_status", "👥 درخواست عضویت جدید", `${p.fullName} — ${p.base}`, `user-pending:${p.id}`, ago(p.hours))

  await db.pointsLog.createMany({ data: pointsLogs })
  await db.notification.createMany({ data: notifications })

  // مجموع امتیاز و سطح هر کاربر از روی لاگ‌ها
  for (const u of USERS) {
    const total = pointsLogs.filter((l) => l.userId === u.id).reduce((s, l) => s + l.amount, 0)
    await db.user.update({ where: { id: u.id }, data: { points: total, levelKey: levelFor(total) } })
  }

  console.log("— پیش‌نویس‌ها —")
  await db.draft.create({ data: { userId: "u_rep01", category: "local", title: "گزارش از طرح توسعه شبکه جمع‌آوری آب باران محله", content: "مهندسان شهرداری از اجرای فاز دوم شبکه جمع‌آوری آب‌های سطحی در محله خبر دادند؛ پروژه‌ای که قرار است مشکل دیرین آبگرفتگی کوچه‌های شرقی را حل کند. در بازدید میدانی...", savedAt: ago(5) } })
  await db.draft.create({ data: { userId: "u_rep01", category: "economy", title: "گفت‌وگو با غرفه‌داران بازارچه محصولات روستایی", content: "بازارچه هفتگی محصولات روستایی این هفته با استقبال گسترده... (گفت‌وگو با سه غرفه‌دار انجام شد؛ آمار قیمت‌ها در حال جمع‌آوری است)", savedAt: ago(30) } })
  await db.draft.create({ data: { userId: "u_rep05", category: "social", title: "روایت بانوان کارآفرین محله از مسیر اشتغال خانگی", content: "سه بانو از تجربه راه‌اندازی کارگاه خانگی خیاطی گفتند... مصاحبه‌ها آماده تحریر است.", savedAt: ago(52) } })
  await db.draft.create({ data: { userId: "u_rep04", category: "sport", title: "پرداخت‌های تازه هیات ورزشی به قهرمانان محله", content: "طبق اعلام هیات، مشوق‌های مالی قهرمانان استانی... در انتظار تایید اعداد.", savedAt: ago(70) } })

  const [nu, nn, ne, nc, np] = await Promise.all([
    db.user.count(), db.newsItem.count(), db.newsEvent.count(), db.challenge.count(), db.notification.count(),
  ])
  console.log(`✅ Seed: ${nu} users | ${nn} news | ${ne} events | ${nc} challenges | ${np} notifications | ${pointsLogs.length} point-logs`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
