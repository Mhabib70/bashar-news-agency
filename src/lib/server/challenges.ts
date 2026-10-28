import { db } from "@/lib/db"
import { addPoints, evaluateBadges } from "./state"
import { notifyUser } from "./notify"
import { LEVELS, levelIndex } from "@/lib/domain"

// معادل config ربات
export const CHALLENGE_PRIZES = [30, 20, 10] // مقام اول تا سوم
export const DEMOTION_AFTER_DAYS = 7 // سقوط سطح پس از ۷ روز غیبت (سناریوی ۷)
export const REMINDER_WINDOW_H = 3 // یادآور ۳ ساعت مانده به مهلت
export const PENDING_EXPIRE_HOURS = 72 // انقضای درخواست‌های بی‌پاسخ (سناریوی ۱)
export const INACTIVITY_DEMOTION_GAP_DAYS = 7 // فاصله حداقل بین دو سقوط

/**
 * پایان چالش: محاسبه برندگان، جایزه تاپ‌۳، نشان قهرمان، اعلان نتایج.
 * قدرت‌گرفته از scheduler.finalize_challenge ربات — idempotent.
 */
export async function finishChallenge(challengeId: number): Promise<{ winners: { userId: string; fullName: string; count: number; prize: number }[] } | null> {
  const ch = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { participations: { include: { user: { select: { id: true, fullName: true, role: true } } } } },
  })
  if (!ch || ch.status !== "active") return null

  const rows = [...ch.participations].filter((p) => p.count > 0).sort((a, b) => b.count - a.count)
  await db.challenge.update({ where: { id: ch.id }, data: { status: "finished", finishedAt: new Date() } })

  const winners: { userId: string; fullName: string; count: number; prize: number }[] = []
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const r = rows[i]
    const prize = CHALLENGE_PRIZES[i] ?? 0
    if (prize > 0) await addPoints(r.userId, prize, `جایزه چالش «${ch.title}» — مقام ${["اول", "دوم", "سوم"][i]}`, `challenge:${ch.code}`)
    if (i === 0) {
      // نشان قهرمان چالش (idempotent با unique)
      try {
        await db.userBadge.create({ data: { userId: r.userId, badgeKey: "champion" } })
      } catch {
        /* قبلاً دارد */
      }
      await notifyUser(r.userId, "rank", "🥇 قهرمان چالش شدید!", `نشان «قهرمان چالش» + ${prize} امتیاز جایزه — چالش «${ch.title}»`, `challenge:${ch.id}`, { force: true })
    } else {
      await notifyUser(r.userId, "rank", `مقام ${["دوم", "سوم"][i - 1]} چالش`, `${prize} امتیاز جایزه — چالش «${ch.title}»`, `challenge:${ch.id}`)
    }
    winners.push({ userId: r.userId, fullName: r.user.fullName, count: r.count, prize })
  }

  // اعلام نتایج به همه اعضای فعال (با فلگ challenges + سکوت) — معادل rank_update
  const podium = winners.map((w, i) => `${["🥇", "🥈", "🥉"][i]} ${w.fullName} (${w.count} خبر)`).join("\n")
  await notifyAllReportersChallenge("challenge", `نتایج چالش «${ch.title}» اعلام شد`, podium || "بدون شرکت‌کننده فعال", `challenge:${ch.id}`)

  for (const p of ch.participations) {
    await evaluateBadges(p.userId)
  }
  return { winners }
}

async function notifyAllReportersChallenge(kind: "challenge", title: string, body: string, ref: string) {
  const users = await db.user.findMany({ where: { status: "active", role: "reporter" }, select: { id: true } })
  for (const u of users) await notifyUser(u.id, kind, title, body, ref)
}

/**
 * نگهداری دوره‌ای چالش‌ها — معادل run_once ربات (lazy: در هر بارگیری state):
 * ۱) پایان خودکار چالش‌های گذشته از endAt
 * ۲) یادآور ۳ ساعته مهلت (یک‌بار برای هر چالش)
 */
export async function challengeHousekeeping(): Promise<void> {
  const now = new Date()
  const overdue = await db.challenge.findMany({ where: { status: "active", endAt: { lte: now } }, select: { id: true } })
  for (const ch of overdue) {
    try {
      await finishChallenge(ch.id)
    } catch (e) {
      console.error("finishChallenge error", ch.id, e)
    }
  }

  const soon = await db.challenge.findMany({
    where: { status: "active", deadlineNotified: false, deadlineAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_H * 3600 * 1000) } },
    include: { participations: { select: { userId: true } } },
  })
  for (const ch of soon) {
    await db.challenge.update({ where: { id: ch.id }, data: { deadlineNotified: true } })
    for (const p of ch.participations) {
      await notifyUser(p.userId, "challenge_reminder", `⏰ مهلت چالش «${ch.title}» نزدیک است`, `کمتر از ${REMINDER_WINDOW_H} ساعت مانده — خبرهایت را ثبت کن!`, `challenge-remind:${ch.id}`)
    }
  }
}

/**
 * سقوط خودکار سطح پس از غیبت طولانی — معادل scoring.maybe_demote ربات (سناریوی ۷):
 * - ۷ روز بی‌فعالیت → یک سطح سقوط (حداقل سطح پیگیر می‌ماند؛ تازه‌کار سقوط نمی‌کند)
 * - حداکثر هر ۷ روز یک‌بار
 */
export async function applyInactivityPolicy(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.status !== "active" || !user.lastActivityAt) return false
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - user.lastActivityAt.getTime()) / (24 * 3600 * 1000))
  if (daysSince < DEMOTION_AFTER_DAYS) return false
  if (user.lastDemotionAt && (now.getTime() - user.lastDemotionAt.getTime()) / (24 * 3600 * 1000) < INACTIVITY_DEMOTION_GAP_DAYS) return false
  const idx = levelIndex(user.levelKey)
  if (idx <= 1) return false // تازه‌کار/پیگیر پایین‌تر نمی‌روند
  const newIdx = idx - 1
  const newKey = LEVELS[newIdx].key
  await db.user.update({ where: { id: userId }, data: { levelKey: newKey, lastDemotionAt: now } })
  await notifyUser(
    userId,
    "demotion",
    "📉 سقوط سطح به‌خاطر غیبت",
    `بیش از ${DEMOTION_AFTER_DAYS} روز فعالیتی نداشتید؛ سطح شما از «${LEVELS[idx].title}» به «${LEVELS[newIdx].title}» کاهش یافت. با فعالیت روزانه دوباره صعود کنید!`,
    `demotion:${now.getTime()}`,
    { force: true },
  )
  return true
}

/**
 * انقضای درخواست‌های عضویت بی‌پاسخ — معادل expire_stale_pending ربات (سناریوی ۱):
 * درخواست pending پس از ۷۲ ساعت → rejected با دلیل expired (کاربر می‌تواند دوباره ثبت‌نام کند)
 */
export async function registrationHousekeeping(): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_EXPIRE_HOURS * 3600 * 1000)
  await db.user.updateMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
    data: { status: "rejected", rejectReason: "expired" },
  })
}

/** چالش‌های سررسید گذشته که هنوز فعال‌اند (برای نمایش برچسب در UI) */
export function fmtWinnersLabel(winners: { fullName: string; count: number; prize: number }[]): string {
  return winners.map((w, i) => `${["🥇", "🥈", "🥉"][i]} ${w.fullName} (${w.count} خبر)`).join(" · ")
}
