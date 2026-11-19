import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// KPI های پنل مدیریت و پایش راهبردی — فقط ادمین کل
// (کارت‌های «نیم‌نگاه سامانه و آنی خبر» در طراحی)
export async function GET(req: NextRequest) {
  const admin = await activeUser(req)
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }

  const now = new Date()
  const hourAgo = new Date(now.getTime() - 3600_000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    newsToday,
    pendingTotal,
    approvedTotal,
    rejectedTotal,
    onlineUsers,
    totalUsers,
    pendingRegs,
    recentApproved,
    hourNews,
  ] = await Promise.all([
    db.newsItem.count({ where: { createdAt: { gte: todayStart } } }),
    db.newsItem.count({ where: { status: "pending" } }),
    db.newsItem.count({ where: { status: "approved" } }),
    db.newsItem.count({ where: { status: "rejected" } }),
    db.user.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - 15 * 60_000) }, active: true } }),
    db.user.count({ where: { status: "active" } }),
    db.user.count({ where: { status: "pending" } }),
    // میانگین انتظار: تفاوت ارسال و تایید ۱۰ خبر آخر
    db.newsItem.findMany({
      where: { status: "approved", reviewedAt: { not: null } },
      orderBy: { reviewedAt: "desc" },
      take: 10,
      select: { createdAt: true, reviewedAt: true },
    }),
    db.newsItem.count({ where: { createdAt: { gte: hourAgo } } }),
  ])

  const waits = recentApproved
    .filter((n) => n.reviewedAt)
    .map((n) => ((n.reviewedAt as Date).getTime() - n.createdAt.getTime()) / 60000)
    .filter((m) => m >= 0)
  const avgWaitMin = waits.length ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10 : 0

  // سلامت چرخه: نسبت رسیدگی‌شده‌های ۲۴ ساعت اخیر
  const since24 = new Date(now.getTime() - 24 * 3600_000)
  const [submitted24, finished24] = await Promise.all([
    db.newsItem.count({ where: { createdAt: { gte: since24 } } }),
    db.newsItem.count({ where: { status: { in: ["approved", "rejected"] }, updatedAt: { gte: since24 } } }),
  ])
  const throughput = submitted24 > 0 ? Math.min(Math.round((finished24 / submitted24) * 1000) / 10, 100) : 100

  return NextResponse.json({
    kpis: {
      newsPerHour: hourNews,
      newsToday,
      pendingTotal,
      approvedTotal,
      rejectedTotal,
      onlineUsers,
      totalUsers,
      pendingRegs,
      avgWaitMin,
      throughputPct: throughput,
    },
    at: now.toISOString(),
  })
}
