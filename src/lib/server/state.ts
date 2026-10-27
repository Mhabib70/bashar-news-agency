import { db } from "@/lib/db"
import { LEVELS, levelFor, levelIndex, nextLevel, BADGES, POINTS, ROLE_STAGE } from "@/lib/domain"
import { tehranDayKey, tehranDayStart } from "./tz"
import { challengeHousekeeping, applyInactivityPolicy, registrationHousekeeping } from "./challenges"
import type { Prisma } from "@prisma/client"

export type AppUser = {
  id: string
  fullName: string
  username: string
  role: string
  status: string
  rejectReason: string
  district: string
  base: string
  phone: string
  age: string
  education: string
  points: number
  levelKey: string
  levelTitle: string
  levelEmoji: string
  nextLevelTitle: string | null
  nextLevelMin: number | null
  currentStreak: number
  bestStreak: number
  createdAt: string
}

export type NewsDTO = {
  id: number
  code: string
  reporterId: string
  reporterName: string
  reporterDistrict: string
  district: string
  category: string
  title: string
  content: string
  mediaType: string
  mediaUrl: string
  status: string
  reviewStage: string
  rejectReason: string
  rejectNote: string
  reviewedBy: string
  challengeId: number | null
  durationMin: number
  createdAt: string
}

export type ChallengeDTO = {
  id: number
  code: string
  title: string
  description: string
  deadlineAt: string
  endAt: string
  reward: string
  status: string
  finishedAt: string | null
  joined: boolean
  myCount: number
  totalParticipants: number
  myRank: number | null
  winners: { fullName: string; count: number; prize: number }[]
}

export type LeaderRow = { id: string; fullName: string; points: number; levelKey: string; district: string; rank: number; isMe: boolean }

export type AppState = {
  user: AppUser
  stats: {
    day: PeriodStat; week: PeriodStat; month: PeriodStat
    totalApproved: number; totalRejected: number; approveRate: number
    weekSeries: { day: string; points: number }[]
    rank: number; totalReporters: number
  }
  news: NewsDTO[]
  reviewQueue: NewsDTO[]
  challenges: ChallengeDTO[]
  leaderboard: LeaderRow[]
  badges: { key: string; emoji: string; title: string; desc: string; unlocked: boolean; awardedAt: string | null }[]
  drafts: { id: number; category: string; title: string; content: string; savedAt: string }[]
  notifications: { id: string; kind: string; title: string; body: string; at: string }[]
  notifSettings: { approvals: boolean; challenges: boolean; broadcast: boolean; rejections: boolean; quietStart: string; quietEnd: string }
  pendingUsersCount: number
}

export type PeriodStat = { points: number; newsCount: number; activeMin: number }

function periodStart(kind: "day" | "week" | "month"): Date {
  const now = new Date()
  if (kind === "day") return tehranDayStart(now) // نیمه‌شب تهران
  if (kind === "week") return new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  return new Date(now.getTime() - 30 * 24 * 3600 * 1000)
}

async function periodStat(userId: string, kind: "day" | "week" | "month"): Promise<PeriodStat> {
  const from = periodStart(kind)
  const [pointsAgg, newsRows] = await Promise.all([
    db.pointsLog.aggregate({ where: { userId, createdAt: { gte: from } }, _sum: { amount: true } }),
    db.newsItem.findMany({ where: { reporterId: userId, createdAt: { gte: from } }, select: { durationMin: true } }),
  ])
  return {
    points: pointsAgg._sum.amount ?? 0,
    newsCount: newsRows.length,
    activeMin: newsRows.reduce((s, n) => s + n.durationMin, 0),
  }
}

function toNewsDTO(n: {
  id: number; code: string; reporterId: string; district: string; category: string; title: string; content: string
  mediaType: string; mediaUrl: string; status: string; reviewStage: string; rejectReason: string; rejectNote: string; reviewedBy: string
  challengeId: number | null; durationMin: number; createdAt: Date
  reporter: { fullName: string; district: string }
}): NewsDTO {
  return {
    id: n.id, code: n.code, reporterId: n.reporterId, reporterName: n.reporter.fullName, reporterDistrict: n.reporter.district,
    district: n.district, category: n.category, title: n.title, content: n.content, mediaType: n.mediaType, mediaUrl: n.mediaUrl,
    status: n.status, reviewStage: n.reviewStage, rejectReason: n.rejectReason, rejectNote: n.rejectNote,
    reviewedBy: n.reviewedBy, challengeId: n.challengeId, durationMin: n.durationMin, createdAt: n.createdAt.toISOString(),
  }
}

const newsInclude = { reporter: { select: { fullName: true, district: true } } } satisfies Prisma.NewsItemInclude

export async function getAppState(userId: string): Promise<AppState | null> {
  // نگهداری دوره‌ای lazy (معادل scheduler ربات): انقضای ثبت‌نام‌ها، پایان چالش‌ها، سقوط غیبت
  await registrationHousekeeping().catch(() => {})
  await challengeHousekeeping().catch(() => {})
  await applyInactivityPolicy(userId).catch(() => {})

  const u = await db.user.findUnique({ where: { id: userId }, include: { notifSetting: true } })
  if (!u) return null

  const [day, week, month, ownNews, queue, challenges, allBadges, drafts] = await Promise.all([
    periodStat(userId, "day"),
    periodStat(userId, "week"),
    periodStat(userId, "month"),
    db.newsItem.findMany({ where: { reporterId: userId }, include: newsInclude, orderBy: { createdAt: "desc" } }),
    u.role === "reporter"
      ? Promise.resolve([])
      : db.newsItem.findMany({
          where:
            u.role === "admin"
              ? // ادمین کل: همه اخبار در انتظار، در هر مرحله‌ای
                { status: "pending" }
              : u.role === "district_manager"
                ? { status: "pending", reviewStage: "district", district: u.district }
                : { status: "pending", reviewStage: ROLE_STAGE[u.role] ?? "___" },
          include: newsInclude,
          orderBy: { createdAt: "asc" },
        }),
    db.challenge.findMany({
      include: { participations: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { count: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    db.userBadge.findMany({ where: { userId } }),
    db.draft.findMany({ where: { userId }, orderBy: { savedAt: "desc" } }),
  ])

  // رتبه‌بندی
  const reporters = await db.user.findMany({ where: { role: "reporter" }, orderBy: { points: "desc" }, select: { id: true, fullName: true, points: true, levelKey: true, district: true } })
  const rank = reporters.findIndex((r) => r.id === userId)
  const leaderboard: LeaderRow[] = reporters.slice(0, 10).map((r, i) => ({
    id: r.id, fullName: r.fullName, points: r.points, levelKey: r.levelKey, district: r.district, rank: i + 1, isMe: r.id === userId,
  }))

  // سری هفتگی امتیاز (۷ روز — کلید روز به وقت تهران)
  const weekSeries: { day: string; points: number }[] = []
  const fromWeek = new Date(Date.now() - 6 * 24 * 3600 * 1000); fromWeek.setHours(0, 0, 0, 0)
  const weekLogs = await db.pointsLog.findMany({ where: { userId, createdAt: { gte: fromWeek } }, select: { amount: true, createdAt: true } })
  for (let i = 0; i < 7; i++) {
    const d = new Date(fromWeek.getTime() + i * 24 * 3600 * 1000)
    const key = tehranDayKey(d)
    weekSeries.push({ day: key, points: 0 })
  }
  for (const l of weekLogs) {
    const key = tehranDayKey(l.createdAt)
    const row = weekSeries.find((w) => w.day === key)
    if (row) row.points += l.amount
  }

  const approved = ownNews.filter((n) => n.status === "approved").length
  const rejected = ownNews.filter((n) => n.status === "rejected").length
  const approveRate = approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0

  const lv = levelFor(u.points)
  const nx = nextLevel(u.levelKey)
  const badgeKeys = new Set(allBadges.map((b) => b.badgeKey))

  const appUser: AppUser = {
    id: u.id, fullName: u.fullName, username: u.username, role: u.role, status: u.status,
    rejectReason: u.rejectReason,
    district: u.district, base: u.base, phone: u.phone, age: u.age, education: u.education,
    points: u.points, levelKey: u.levelKey, levelTitle: lv.title, levelEmoji: lv.emoji,
    nextLevelTitle: nx?.title ?? null, nextLevelMin: nx?.min ?? null,
    currentStreak: u.currentStreak, bestStreak: u.bestStreak, createdAt: u.createdAt.toISOString(),
  }

  const challengeDTOs: ChallengeDTO[] = challenges.map((c) => {
    const parts = [...c.participations].sort((a, b) => b.count - a.count)
    const mine = c.participations.find((p) => p.userId === userId)
    const myRank = mine ? parts.findIndex((p) => p.userId === userId) + 1 : null
    const winners = c.status === "finished"
      ? parts.filter((p) => p.count > 0).slice(0, 3).map((p, i) => ({
          fullName: p.user.fullName, count: p.count, prize: [30, 20, 10][i] ?? 0,
        }))
      : []
    return {
      id: c.id, code: c.code, title: c.title, description: c.description,
      deadlineAt: c.deadlineAt.toISOString(), endAt: c.endAt.toISOString(), reward: c.reward, status: c.status,
      finishedAt: c.finishedAt?.toISOString() ?? null,
      joined: !!mine, myCount: mine?.count ?? 0, totalParticipants: c.participations.length, myRank, winners,
    }
  })

  // اعلان‌های واقعی (جدول Notification — با احترام به تنظیمات و ساعت سکوت هنگام ایجاد)
  const notifRows = await db.notification.findMany({
    where: { userId, deliveredAt: { lte: new Date() } },
    orderBy: { deliveredAt: "desc" },
    take: 15,
  })
  const notifications: AppState["notifications"] = notifRows.map((n) => ({
    id: `notif-${n.id}`, kind: n.kind, title: n.title, body: n.body, at: n.deliveredAt.toISOString(),
  }))

  let pendingUsersCount = 0
  if (u.role === "admin") {
    pendingUsersCount = await db.user.count({ where: { status: "pending" } })
  }

  return {
    user: appUser,
    stats: { day, week, month, totalApproved: approved, totalRejected: rejected, approveRate, weekSeries, rank: rank >= 0 ? rank + 1 : 0, totalReporters: reporters.length },
    news: ownNews.map(toNewsDTO),
    reviewQueue: queue.map(toNewsDTO),
    challenges: challengeDTOs,
    leaderboard,
    badges: Object.entries(BADGES).map(([key, b]) => ({
      key, emoji: b.emoji, title: b.title, desc: b.desc, unlocked: badgeKeys.has(key),
      awardedAt: allBadges.find((x) => x.badgeKey === key)?.awardedAt.toISOString() ?? null,
    })),
    drafts: drafts.map((d) => ({ id: d.id, category: d.category, title: d.title, content: d.content, savedAt: d.savedAt.toISOString() })),
    notifications: notifications.slice(0, 15),
    notifSettings: {
      approvals: u.notifSetting?.approvals ?? true, challenges: u.notifSetting?.challenges ?? true,
      broadcast: u.notifSetting?.broadcast ?? true, rejections: u.notifSetting?.rejections ?? true,
      quietStart: u.notifSetting?.quietStart ?? "22:00", quietEnd: u.notifSetting?.quietEnd ?? "08:00",
    },
    pendingUsersCount,
  }
}

// ---------- منطق امتیاز/استریک/نشان (معادل scoring.py) ----------
export async function addPoints(userId: string, amount: number, reason: string, ref = "") {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return
  await db.pointsLog.create({ data: { userId, amount, reason, ref } })
  const newPoints = user.points + amount
  // ارتقا فقط وقتی که آستانه سطحِ «بعدی» عبور شود — پس از سقوط غیبتی، ارتقای فوری رخ نمی‌دهد
  const nx = nextLevel(user.levelKey)
  const levelKey = nx && newPoints >= nx.min ? nx.key : user.levelKey
  await db.user.update({ where: { id: userId }, data: { points: newPoints, levelKey } })
}

export async function recordActivity(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return
  const now = new Date()
  const today = tehranDayKey(now)
  const last = user.lastActivityAt ? tehranDayKey(user.lastActivityAt) : undefined
  if (last === today) return
  const yday = tehranDayKey(new Date(now.getTime() - 24 * 3600 * 1000))
  const streak = last === yday ? user.currentStreak + 1 : 1
  await db.user.update({
    where: { id: userId },
    data: { currentStreak: streak, bestStreak: Math.max(user.bestStreak, streak), lastActivityAt: now },
  })
}

export async function evaluateBadges(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return []
  const [approved, rejected, existing] = await Promise.all([
    db.newsItem.count({ where: { reporterId: userId, status: "approved" } }),
    db.newsItem.count({ where: { reporterId: userId, status: "rejected" } }),
    db.userBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
  ])
  const total = approved + rejected
  const rate = total ? (approved / total) * 100 : 0
  const conditions: Record<string, boolean> = {
    first_news: approved >= 1,
    prolific: approved >= 50,
    quality: approved >= 10 && rate >= 85,
    streak7: user.currentStreak >= 7,
    professional: levelIndex(user.levelKey) >= levelIndex("pro"),
    champion: false,
  }
  const bonus: Record<string, number> = {
    first_news: POINTS.FIRST_NEWS, streak7: POINTS.STREAK7, quality: POINTS.QUALITY,
    prolific: POINTS.PROLIFIC, professional: POINTS.PROFESSIONAL,
  }
  const have = new Set(existing.map((b) => b.badgeKey))
  const awarded: string[] = []
  for (const [key, ok] of Object.entries(conditions)) {
    if (ok && !have.has(key)) {
      await db.userBadge.create({ data: { userId, badgeKey: key } })
      if (bonus[key]) await addPoints(userId, bonus[key], `نشان ${BADGES[key].title}`, `badge:${key}`)
      awarded.push(key)
    }
  }
  return awarded
}

export async function nextNewsCode(): Promise<string> {
  const last = await db.newsItem.findFirst({ orderBy: { id: "desc" }, select: { id: true } })
  return `N-${1000 + (last?.id ?? 0) + 1}`
}

export { LEVELS, levelFor, levelIndex }
