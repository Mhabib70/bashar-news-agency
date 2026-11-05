import { db } from "@/lib/db"
import { addPoints } from "@/lib/server/state"
import { LEVELS, levelIndex, POINTS, PENDING_EXPIRE_HOURS, PENDING_NUDGE_HOURS, REMINDER_WINDOW_HOURS, DEMOTE_INACTIVITY_DAYS } from "@/lib/domain"

// ---------- معادل scheduler.py ربات: پایان چالش، یادآوری، افت سطح، انقضای ثبت‌نام ----------

export type NotifFlags = { approvals: boolean; challenges: boolean; broadcast: boolean; rejections: boolean; quietStart: string; quietEnd: string }

/** ساعت سکوت (معادل _in_quiet ربات) */
export function inQuiet(s: Pick<NotifFlags, "quietStart" | "quietEnd">, now = new Date()): boolean {
  const mins = (t: string) => {
    const [hh, mm] = t.split(":").map((x) => Number(x) || 0)
    return hh * 60 + mm
  }
  const start = mins(s.quietStart || "22:00")
  const end = mins(s.quietEnd || "08:00")
  const cur = now.getHours() * 60 + now.getMinutes()
  if (start === end) return false
  if (start > end) return cur >= start || cur < end
  return start <= cur && cur < end
}

async function activeUsersWithFlags() {
  const users = await db.user.findMany({
    where: { status: "active" },
    select: { id: true, role: true, district: true, notifSetting: true },
  })
  return users.map((u) => ({
    id: u.id,
    role: u.role,
    district: u.district,
    flags: {
      approvals: u.notifSetting?.approvals ?? true,
      rejections: u.notifSetting?.rejections ?? true,
      challenges: u.notifSetting?.challenges ?? true,
      broadcast: u.notifSetting?.broadcast ?? true,
      quietStart: u.notifSetting?.quietStart ?? "22:00",
      quietEnd: u.notifSetting?.quietEnd ?? "08:00",
    },
  }))
}

function kindAllowed(kind: string, f: NotifFlags): boolean {
  if (kind === "broadcast") return f.broadcast
  if (kind === "challenge_new" || kind === "rank_update" || kind === "reminder") return f.challenges
  if (kind === "rejected") return f.rejections
  return true // pending_user / system / approved / points
}

/** ارسال اعلان به گروهی از کاربران فعال — برمی‌گرداند تعداد رسیده/ردشده */
export async function notifyUsers(opts: {
  kind: string
  title: string
  body: string
  ref?: string
  /** نقش‌های هدف؛ پیش‌فرض همه؛ برای اعلان‌های غیرکارمندی ["reporter", "district_manager"] */
  roles?: string[]
  /** فاکتور پرچم تنظیمات و ساعت سکوت در شمارش skipped */
  respectFlags?: boolean
}): Promise<{ sent: number; skipped: number }> {
  const users = await activeUsersWithFlags()
  const roles = opts.roles
  let sent = 0
  let skipped = 0
  const rows: { userId: string; kind: string; title: string; body: string; ref: string }[] = []
  for (const u of users) {
    if (roles && !roles.includes(u.role)) continue
    if (opts.respectFlags !== false && !kindAllowed(opts.kind, u.flags)) {
      skipped++
      continue
    }
    if (opts.respectFlags !== false && inQuiet(u.flags)) {
      skipped++
      continue
    }
    rows.push({ userId: u.id, kind: opts.kind, title: opts.title, body: opts.body, ref: opts.ref ?? "" })
    sent++
  }
  if (rows.length) await db.notification.createMany({ data: rows })
  return { sent, skipped }
}

/** اعلان هدفمند به کارمندان (ادمین‌ها + کارشناس‌ها + مدیر حوزه همان حوزه) */
export async function notifyStaff(opts: { kind: string; title: string; body: string; ref?: string; district?: string }) {
  const staff = await db.user.findMany({
    where: { status: "active", role: { in: ["admin", "specialist", "district_manager"] } },
    select: { id: true, role: true, district: true },
  })
  const targets = staff.filter((s) => s.role !== "district_manager" || (opts.district && s.district === opts.district))
  const seen = new Set<string>()
  const rows = targets
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .map((t) => ({ userId: t.id, kind: opts.kind, title: opts.title, body: opts.body, ref: opts.ref ?? "" }))
  if (rows.length) await db.notification.createMany({ data: rows })
  return rows.length
}

// ---------- جدول قهرمانی چالش (reports.challenge_leaderboard) ----------
export type LeaderRow = { userId: string; fullName: string; n: number }

export async function challengeLeaderboard(challengeId: number): Promise<LeaderRow[]> {
  const rows = await db.newsItem.groupBy({
    by: ["reporterId"],
    where: { challengeId, status: "approved" },
    _count: { reporterId: true },
    _min: { createdAt: true },
    orderBy: [{ _count: { reporterId: "desc" } }, { _min: { createdAt: "asc" } }],
  })
  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.reporterId) } },
    select: { id: true, fullName: true },
  })
  const name = new Map(users.map((u) => [u.id, u.fullName]))
  return rows.map((r) => ({ userId: r.reporterId, fullName: name.get(r.reporterId) ?? r.reporterId, n: r._count.reporterId }))
}

/** پایان چالش: محاسبه برندگان، جایزه، نشان قهرمانی، اطلاع‌رسانی (finalize_challenge) */
export async function finalizeChallenge(challengeId: number): Promise<{ podium: LeaderRow[]; title: string }> {
  const ch = await db.challenge.findUnique({ where: { id: challengeId } })
  if (!ch || ch.status !== "active") return { podium: [], title: ch?.title ?? "" }
  const podium = await challengeLeaderboard(challengeId)
  await db.challenge.update({ where: { id: challengeId }, data: { status: "finished", finishedAt: new Date() } })

  const prizes = POINTS.CHALLENGE_PRIZES
  for (let i = 0; i < Math.min(3, podium.length); i++) {
    const prize = prizes[i] ?? 0
    if (prize) await addPoints(podium[i].userId, prize, `جایزه رتبه ${["اول", "دوم", "سوم"][i]} چالش «${ch.title}»`, `challenge:${ch.id}`)
    if (i === 0 && !(await db.userBadge.findFirst({ where: { userId: podium[i].userId, badgeKey: "champion" } }))) {
      await db.userBadge.create({ data: { userId: podium[i].userId, badgeKey: "champion" } })
    }
  }

  const podiumText =
    podium.slice(0, 3).length === 0
      ? "هیچ خبر تاییدشده‌ای در این چالش ثبت نشد."
      : podium
          .slice(0, 3)
          .map((r, i) => `${["🥇", "🥈", "🥉"][i]} ${r.fullName} — ${r.n} خبر`)
          .join("\n")
  await notifyUsers({
    kind: "rank_update",
    title: `نتایج چالش «${ch.title}»`,
    body: podiumText,
    ref: `ch:${ch.id}:results`,
    roles: ["reporter", "district_manager"],
  })
  return { podium, title: ch.title }
}

// ---------- نگهداری دوره‌ای (run_once) ----------
let lastRun = 0
let running: Promise<void> | null = null

export async function runUpkeep(): Promise<void> {
  const now = Date.now()
  if (now - lastRun < 20_000) return
  if (running) return running
  lastRun = now
  running = upkeepOnce().finally(() => {
    running = null
  })
  return running
}

async function upkeepOnce(): Promise<void> {
  const now = new Date()
  await Promise.all([finishExpiredChallenges(now), remindDeadlines(now), demoteInactive(now), expirePending(now), nudgePending(now)])
}

/** چالش‌های مهلت‌گذشته را خودکار تمام کن */
async function finishExpiredChallenges(now: Date) {
  const expired = await db.challenge.findMany({ where: { status: "active", endAt: { lte: now } }, select: { id: true } })
  for (const ch of expired) {
    try {
      await finalizeChallenge(ch.id)
    } catch (e) {
      console.error("finalize error", ch.id, e)
    }
  }
}

/** یادآوری ۳ ساعت مانده به مهلت ارسال (یک‌بار برای هر چالش) */
async function remindDeadlines(now: Date) {
  const active = await db.challenge.findMany({ where: { status: "active", deadlineAt: { gt: now } }, select: { id: true, title: true, deadlineAt: true } })
  for (const ch of active) {
    const hoursLeft = (ch.deadlineAt.getTime() - now.getTime()) / 3_600_000
    if (hoursLeft > REMINDER_WINDOW_HOURS) continue
    const ref = `ch:${ch.id}:remind`
    const exists = await db.notification.findFirst({ where: { ref }, select: { id: true } })
    if (exists) continue
    await notifyUsers({
      kind: "reminder",
      title: `مهلت چالش «${ch.title}» نزدیک است`,
      body: `فقط حدود ${Math.max(1, Math.round(hoursLeft))} ساعت تا پایان مهلت ارسال خبر باقی مانده. فرصت را از دست نده!`,
      ref,
      roles: ["reporter", "district_manager"],
    })
  }
}

/** افت سطح بعد از ۷ روز غیبت (maybe_demote) — حداکثر هفته‌ای یک سطح */
async function demoteInactive(now: Date) {
  const users = await db.user.findMany({
    where: { status: "active", role: "reporter", lastActivityAt: { not: null } },
    select: { id: true, fullName: true, levelKey: true, lastActivityAt: true, lastDemotionAt: true },
  })
  for (const u of users) {
    const inactiveDays = (now.getTime() - (u.lastActivityAt?.getTime() ?? now.getTime())) / 86_400_000
    if (inactiveDays < DEMOTE_INACTIVITY_DAYS) continue
    if (u.lastDemotionAt && (now.getTime() - u.lastDemotionAt.getTime()) / 86_400_000 < DEMOTE_INACTIVITY_DAYS) continue
    const idx = levelIndex(u.levelKey)
    if (idx <= 1) continue
    const newKey = LEVELS[idx - 1].key
    await db.user.update({ where: { id: u.id }, data: { levelKey: newKey, lastDemotionAt: now } })
    const old = LEVELS[idx]
    const neu = LEVELS[idx - 1]
    await db.notification.create({
      data: {
        userId: u.id,
        kind: "system",
        title: "افت سطح به‌دلیل غیبت",
        body: `${old.emoji} سطح تو از «${old.title}» به «${neu.title}» کاهش یافت؛ ${DEMOTE_INACTIVITY_DAYS} روز خبری ارسال نکرده بودی. با یک خبر جدید دوباره اوج بگیر!`,
        ref: `demote:${u.id}:${now.toISOString().slice(0, 10)}`,
      },
    })
  }
}

/** انقضای خودکار درخواست‌های عضویت بی‌پاسخ (expire_stale_pending) */
async function expirePending(now: Date) {
  const cutoff = new Date(now.getTime() - PENDING_EXPIRE_HOURS * 3_600_000)
  const stale = await db.user.findMany({ where: { status: "pending", createdAt: { lt: cutoff } }, select: { id: true } })
  for (const u of stale) {
    await db.user.update({ where: { id: u.id }, data: { status: "rejected", rejectReason: "expired" } })
  }
}

/** یادآوری روزانه به ادمین‌ها درباره درخواست‌های معطل (بیش از ۲۴ ساعت) */
async function nudgePending(now: Date) {
  const pending = await db.user.findMany({ where: { status: "pending" }, select: { id: true, createdAt: true } })
  if (!pending.length) return
  const oldest = Math.min(...pending.map((u) => u.createdAt.getTime()))
  const hours = (now.getTime() - oldest) / 3_600_000
  if (hours < PENDING_NUDGE_HOURS) return
  const ref = `pending_nudge:${now.toISOString().slice(0, 10)}`
  const exists = await db.notification.findFirst({ where: { ref }, select: { id: true } })
  if (exists) return
  const days = Math.floor(hours / 24)
  await notifyStaff({
    kind: "pending_user",
    title: "درخواست‌های عضویت در انتظار بررسی",
    body: `${pending.length} درخواست عضویت معطل مانده (قدیمی‌ترین: ${days} روز). لطفاً از بخش «کاربران» بررسی کن.`,
    ref,
  })
}
