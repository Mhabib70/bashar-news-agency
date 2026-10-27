import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tehranDayStart } from "@/lib/server/tz"

// آمار تجمیعی سازمان برای صفحه خوش‌آمد (پیشرفت امروز) — بدون نیاز به ورود
export async function GET() {
  try {
    const now = new Date()
    const todayStart = tehranDayStart(now) // نیمه‌شب تهران
    const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000)

    const [reporters, todayNews, weekNews, todayPoints, activeTodayUsers, topReporter] = await Promise.all([
      db.user.count({ where: { role: "reporter" } }),
      db.newsItem.count({ where: { createdAt: { gte: todayStart } } }),
      db.newsItem.count({ where: { createdAt: { gte: weekStart } } }),
      db.pointsLog.aggregate({ where: { createdAt: { gte: todayStart } }, _sum: { amount: true } }),
      db.newsItem.findMany({ where: { createdAt: { gte: todayStart } }, select: { reporterId: true }, distinct: ["reporterId"] }),
      db.user.findFirst({ where: { role: "reporter" }, orderBy: { points: "desc" }, select: { fullName: true, points: true } }),
    ])

    // درصد پیشرفت امروز: سهم خبرنگاران فعالِ امروز از کل خبرنگاران
    const progressPct = reporters > 0 ? Math.min(100, Math.round((activeTodayUsers.length / reporters) * 100)) : 0

    return NextResponse.json({
      progressPct,
      pointsToday: todayPoints._sum.amount ?? 0,
      newsThisWeek: weekNews,
      newsToday: todayNews,
      activeToday: activeTodayUsers.length,
      totalReporters: reporters,
      top: topReporter ? { fullName: topReporter.fullName, points: topReporter.points } : null,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در دریافت آمار" }, { status: 500 })
  }
}
