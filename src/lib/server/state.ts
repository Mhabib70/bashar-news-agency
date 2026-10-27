import { db } from "@/lib/db"
import { LEVELS, levelFor, levelIndex, nextLevel, BADGES, POINTS, ROLE_STAGE } from "@/lib/domain"
import { inQuiet, kindAllowed, type NotifFlags } from "@/lib/server/notif-utils"
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
  status: string
  reviewStage: string
  rejectReason: string
  rejectNote: string
  reviewedBy: string
  challengeId: number | null
  mediaUrl: string
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
  joined: boolean
  myCount: number
  totalParticipants: number
  myRank: number | null
  results: { rank: number; userId: string; fullName: string; n: number }[]
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
  pendingUsersCount: number
  notifSettings: { approvals: boolean; challenges: boolean; broadcast: boolean; rejections: boolean; quietStart: string; quietEnd: string }
}

export type PeriodStat = { points: number; newsCount: number; activeMin: number }

function periodStart(kind: "day" | "week" | "month"): Date {
  const d = new Date()
  if (kind === "day") d.setHours(0, 0, 0, 0)
  else if (kind === "week") d.setTime(Date.now() - 7 * 24 * 3600 * 1000)
  else d.setTime(Date.now() - 30 * 24 * 3600 * 1000)
  return d
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
  mediaType: string; status: string; reviewStage: string; rejectReason: string; rejectNote: string; reviewedBy: string
  challengeId: number | null; mediaUrl: string; durationMin: number; createdAt: Date
  reporter: { fullName: string; district: string }
}): NewsDTO {
  return {
    id: n.id, code: n.code, reporterId: n.reporterId, reporterName: n.reporter.fullName, reporterDistrict: n.reporter.district,
    district: n.district, category: n.category, title: n.title, content: n.content, mediaType: n.mediaType,
    status: n.status, reviewStage: n.reviewStage, rejectReason: n.rejectReason, rejectNote: n.rejectNote,
    reviewedBy: n.reviewedBy, challengeId: n.challengeId, mediaUrl: n.mediaUrl, durationMin: n.durationMin, createdAt: n.createdAt.toISOString(),
  }
}

const newsInclude = { reporter: { select: { fullName: true, district: true } } } satisfies Prisma.NewsItemInclude

export async function getAppState(userId: string): Promise<AppState | null> {
  const u = await db.user.findUnique({ where: { id: userId }, include: { notifSetting: true } })
  if (!u) return null

  const [day, week, month, ownNews, queue, challenges, allBadges, drafts, logs] = await Promise.all([
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
      include: { participations: { include: { user: { select: { id: true } } }, orderBy: { count: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    db.userBadge.findMany({ where: { userId } }),
    db.draft.findMany({ where: { userId }, orderBy: { savedAt: "desc" } }),
    db.pointsLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 }),
  ])

  // رتبه‌بندی
  const reporters = await db.user.findMany({ where: { role: "reporter" }, orderBy: { points: "desc" }, select: { id: true, fullName: true, points: true, levelKey: true, district: true } })
  const rank = reporters.findIndex((r) => r.id === userId)
  const leaderboard: LeaderRow[] = reporters.slice(0, 10).map((r, i) => ({
    id: r.id, fullName: r.fullName, points: r.points, levelKey: r.levelKey, district: r.district, rank: i + 1, isMe: r.id === userId,
  }))

  // سری هفتگی امتیاز (۷ روز)
  const weekSeries: { day: string; points: number }[] = []
  const fromWeek = new Date(Date.now() - 6 * 24 * 3600 * 1000); fromWeek.setHours(0, 0, 0, 0)
  const weekLogs = await db.pointsLog.findMany({ where: { userId, createdAt: { gte: fromWeek } }, select: { amount: true, createdAt: true } })
  for (let i = 0; i < 7; i++) {
    const d = new Date(fromWeek.getTime() + i * 24 * 3600 * 1000)
    const key = d.toISOString().slice(0, 10)
    weekSeries.push({ day: key, points: 0 })
  }
  for (const l of weekLogs) {
    const key = l.createdAt.toISOString().slice(0, 10)
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
    id: u.id, fullName: u.fullName, username: u.username, role: u.role, status: u.status, rejectReason: u.rejectReason,
    district: u.district, base: u.base, phone: u.phone, age: u.age, education: u.education,
    points: u.points, levelKey: u.levelKey, levelTitle: lv.title, levelEmoji: lv.emoji,
    nextLevelTitle: nx?.title ?? null, nextLevelMin: nx?.min ?? null,
    currentStreak: u.currentStreak, bestStreak: u.bestStreak,
  }

  // نتایج چالش‌های تمام‌شده (سکوی قهرمانی از اخبار تاییدشده)
  const finishedIds = challenges.filter((c) => c.status === "finished").map((c) => c.id)
  const finishedNews = finishedIds.length
    ? await db.newsItem.findMany({
        where: { challengeId: { in: finishedIds }, status: "approved" },
        select: { challengeId: true, reporterId: true, createdAt: true, reporter: { select: { fullName: true } } },
      })
    : []
  const resultsByChallenge = new Map<number, { rank: number; userId: string; fullName: string; n: number }[]>()
  for (const cid of finishedIds) {
    const rows = new Map<string, { fullName: string; n: number; first: Date }>()
    for (const r of finishedNews) {
      if (r.challengeId !== cid) continue
      const cur = rows.get(r.reporterId)
      if (cur) {
        cur.n += 1
        if (r.createdAt < cur.first) cur.first = r.createdAt
      } else {
        rows.set(r.reporterId, { fullName: r.reporter.fullName, n: 1, first: r.createdAt })
      }
    }
    resultsByChallenge.set(
      cid,
      [...rows.entries()]
        .sort((a, b) => b[1].n - a[1].n || a[1].first.getTime() - b[1].first.getTime())
        .slice(0, 3)
        .map(([uid, v], i) => ({ rank: i + 1, userId: uid, fullName: v.fullName, n: v.n })),
    )
  }

  const challengeDTOs: ChallengeDTO[] = challenges.map((c) => {
    const parts = [...c.participations].sort((a, b) => b.count - a.count)
    const mine = c.participations.find((p) => p.userId === userId)
    const myRank = mine ? parts.findIndex((p) => p.userId === userId) + 1 : null
    return {
      id: c.id, code: c.code, title: c.title, description: c.description,
      deadlineAt: c.deadlineAt.toISOString(), endAt: c.endAt.toISOString(), reward: c.reward, status: c.status,
      joined: !!mine, myCount: mine?.count ?? 0, totalParticipants: c.participations.length, myRank,
      results: resultsByChallenge.get(c.id) ?? [],
    }
  })

  // اعلان‌ها: اعلان‌های سیستمی دیتابیس + مشتق از لاگ امتیاز و وضعیت اخبار
  // (فیلتر با پرچم‌های تنظیمات و ساعت سکوت — معادل _can_push ربات)
  const flags: NotifFlags = {
    approvals: u.notifSetting?.approvals ?? true, rejections: u.notifSetting?.rejections ?? true,
    challenges: u.notifSetting?.challenges ?? true, broadcast: u.notifSetting?.broadcast ?? true,
    quietStart: u.notifSetting?.quietStart ?? "22:00", quietEnd: u.notifSetting?.quietEnd ?? "08:00",
  }
  const quiet = inQuiet(flags)
  const dbNotifs = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 })
  const notifications: AppState["notifications"] = []
  for (const n of dbNotifs) {
    if (!kindAllowed(n.kind, flags) || (n.kind === "broadcast" && quiet)) continue
    notifications.push({
      id: `db-${n.id}`, kind: n.kind, title: n.title, body: n.body, at: n.createdAt.toISOString(),
    })
  }
  for (const l of logs.slice(0, 8)) {
    if (!kindAllowed("points", flags)) break
    notifications.push({
      id: `p-${l.id}`, kind: "points", title: `+${l.amount} امتیاز`,
      body: l.reason || "امتیاز جدید", at: l.createdAt.toISOString(),
    })
  }
  const recentReviewed = await db.newsItem.findMany({
    where: { reporterId: userId, status: { in: ["approved", "rejected"] }, reviewedAt: { not: null } },
    orderBy: { reviewedAt: "desc" }, take: 6,
  })
  for (const n of recentReviewed) {
    const kind = n.status === "approved" ? "approved" : "rejected"
    if (!kindAllowed(kind, flags)) continue
    notifications.push({
      id: `n-${n.id}`, kind,
      title: n.status === "approved" ? "خبر شما تایید شد" : "خبر شما رد شد",
      body: n.title, at: (n.reviewedAt ?? n.createdAt).toISOString(),
    })
  }
  notifications.sort((a, b) => b.at.localeCompare(a.at))

  // شمار درخواست‌های عضویت در انتظار (برای نشان پنل مدیریت)
  const pendingUsersCount = await db.user.count({
    where: { status: "pending", ...(u.role === "district_manager" ? { district: u.district, role: "reporter" } : {}) },
  })

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
    notifications: notifications.slice(0, 14),
    pendingUsersCount,
    notifSettings: {
      approvals: u.notifSetting?.approvals ?? true, challenges: u.notifSetting?.challenges ?? true,
      broadcast: u.notifSetting?.broadcast ?? true, rejections: u.notifSetting?.rejections ?? true,
      quietStart: u.notifSetting?.quietStart ?? "22:00", quietEnd: u.notifSetting?.quietEnd ?? "08:00",
    },
  }
}

// ---------- منطق امتیاز/استریک/نشان (معادل scoring.py) ----------
export async function addPoints(userId: string, amount: number, reason: string, ref = "") {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return
  await db.pointsLog.create({ data: { userId, amount, reason, ref } })
  const newPoints = user.points + amount
  const intended = levelFor(newPoints)
  const levelKey = levelIndex(intended.key) > levelIndex(user.levelKey) ? intended.key : user.levelKey
  await db.user.update({ where: { id: userId }, data: { points: newPoints, levelKey } })
}

export async function recordActivity(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const last = user.lastActivityAt?.toISOString().slice(0, 10)
  if (last === today) return
  const yday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10)
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

export { LEVELS }
