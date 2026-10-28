import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tehranDayStart } from "@/lib/server/tz"

// آمار جامع پنل مدیریت — فقط ادمین کل
export async function GET(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("userId")
  const admin = await db.user.findUnique({ where: { id: adminId ?? "" } })
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }

  try {
    const now = new Date()
    const todayStart = tehranDayStart(now)
    const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000)

    const [
      usersActive, usersPending, usersRejected, reporters,
      stageDistrict, stageSpecialist, stageAdmin,
      newsApproved, newsRejected, newsToday, newsWeek, pointsToday,
      activeChallenges,
      recentUsers, recentNews, broadcastRows,
    ] = await Promise.all([
      db.user.count({ where: { status: "active" } }),
      db.user.count({ where: { status: "pending" } }),
      db.user.count({ where: { status: "rejected" } }),
      db.user.count({ where: { role: "reporter", status: "active" } }),
      db.newsItem.count({ where: { status: "pending", reviewStage: "district" } }),
      db.newsItem.count({ where: { status: "pending", reviewStage: "specialist" } }),
      db.newsItem.count({ where: { status: "pending", reviewStage: "admin" } }),
      db.newsItem.count({ where: { status: "approved" } }),
      db.newsItem.count({ where: { status: "rejected" } }),
      db.newsItem.count({ where: { createdAt: { gte: todayStart } } }),
      db.newsItem.count({ where: { createdAt: { gte: weekStart } } }),
      db.pointsLog.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { amount: true } }),
      db.challenge.count({ where: { status: "active" } }),
      db.user.findMany({
        orderBy: { createdAt: "desc" }, take: 6,
        select: { id: true, fullName: true, avatar: true, district: true, base: true, role: true, status: true, createdAt: true },
      }),
      db.newsItem.findMany({
        orderBy: { createdAt: "desc" }, take: 6,
        select: { id: true, code: true, title: true, status: true, reviewStage: true, createdAt: true, reporter: { select: { fullName: true } } },
      }),
      db.notification.findMany({ where: { kind: "broadcast" }, orderBy: { deliveredAt: "desc" }, take: 40 }),
    ])

    // تاریخچه پیام‌های همگانی: هر ارسال یک ref یکتا دارد — اولین نسخه هر ref نگه داشته می‌شود
    const seen = new Set<string>()
    const recentBroadcasts = [] as { title: string; body: string; at: string; recipients: number }[]
    for (const n of broadcastRows) {
      if (seen.has(n.ref)) continue
      seen.add(n.ref)
      recentBroadcasts.push({ title: n.title, body: n.body, at: n.deliveredAt.toISOString(), recipients: broadcastRows.filter((x) => x.ref === n.ref).length })
      if (recentBroadcasts.length >= 5) break
    }

    return NextResponse.json({
      users: { active: usersActive, pending: usersPending, rejected: usersRejected, reporters },
      news: {
        pendingTotal: stageDistrict + stageSpecialist + stageAdmin,
        stageDistrict, stageSpecialist, stageAdmin,
        approved: newsApproved, rejected: newsRejected, today: newsToday, week: newsWeek,
        pointsToday: pointsToday._sum.amount ?? 0,
      },
      challenges: { active: activeChallenges },
      recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      recentNews: recentNews.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      recentBroadcasts,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در دریافت آمار مدیریت" }, { status: 500 })
  }
}
