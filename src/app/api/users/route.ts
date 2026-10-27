import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUser } from "@/lib/server/notify"
import { USER_REJECT_TITLES } from "@/lib/domain"

// مدیریت کاربران — فقط ادمین کل
// GET  بدون targetId: لیست همه اعضا | GET با targetId: پرونده کامل کاربر
// POST: تایید/رد درخواست عضویت (معادل سناریوی ۱ ربات)
export async function GET(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("userId")
  const admin = await db.user.findUnique({ where: { id: adminId ?? "" } })
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }

  const targetId = req.nextUrl.searchParams.get("targetId")
  if (targetId) {
    const u = await db.user.findUnique({
      where: { id: targetId },
      include: {
        badges: { orderBy: { awardedAt: "desc" } },
        pointsLogs: { orderBy: { createdAt: "desc" }, take: 12 },
        news: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, code: true, title: true, status: true, category: true, createdAt: true } },
        participations: { include: { challenge: { select: { id: true, title: true, status: true } } }, orderBy: { joinedAt: "desc" } },
      },
    })
    if (!u) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

    const [approved, rejected, pending, rankRow] = await Promise.all([
      db.newsItem.count({ where: { reporterId: u.id, status: "approved" } }),
      db.newsItem.count({ where: { reporterId: u.id, status: "rejected" } }),
      db.newsItem.count({ where: { reporterId: u.id, status: "pending" } }),
      db.user.count({ where: { role: "reporter", points: { gt: u.points } } }),
    ])
    const decided = approved + rejected
    return NextResponse.json({
      user: {
        id: u.id, fullName: u.fullName, username: u.username, role: u.role, status: u.status,
        rejectReason: u.rejectReason, district: u.district, base: u.base, phone: u.phone,
        age: u.age, education: u.education, points: u.points, levelKey: u.levelKey,
        currentStreak: u.currentStreak, bestStreak: u.bestStreak, avatar: u.avatar,
        lastActivityAt: u.lastActivityAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      },
      stats: {
        newsTotal: approved + rejected + pending, approved, rejected, pending,
        approveRate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
        rank: u.role === "reporter" ? rankRow + 1 : null,
      },
      badges: u.badges.map((b) => ({ key: b.badgeKey, awardedAt: b.awardedAt.toISOString() })),
      pointsLog: u.pointsLogs.map((l) => ({ amount: l.amount, reason: l.reason, createdAt: l.createdAt.toISOString() })),
      news: u.news.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      participations: u.participations.map((p) => ({
        challengeId: p.challengeId, count: p.count, joinedAt: p.joinedAt.toISOString(),
        challengeTitle: p.challenge.title, challengeStatus: p.challenge.status,
      })),
    })
  }

  const users = await db.user.findMany({
    select: {
      id: true, fullName: true, username: true, role: true, status: true, rejectReason: true,
      district: true, base: true, phone: true, age: true, education: true,
      points: true, levelKey: true, currentStreak: true, bestStreak: true, avatar: true,
      lastActivityAt: true, createdAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // pending اول
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action, targetId, reason } = body ?? {}
    const admin = await db.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (target.id === admin.id) return NextResponse.json({ error: "تغییر وضعیت حساب خودتان ممکن نیست" }, { status: 400 })

    if (action === "approve") {
      if (target.status !== "pending") {
        return NextResponse.json({ error: "فقط درخواست‌های در انتظار تایید قابل تایید هستند" }, { status: 409 })
      }
      await db.user.update({ where: { id: target.id }, data: { status: "active", rejectReason: "" } })
      await notifyUser(target.id, "user_status", "✅ عضویت شما تایید شد", `${admin.fullName} درخواست عضویت شما را تایید کرد. از این پس می‌توانید خبر ارسال کنید.`, `user:${target.id}`, { force: true })
      return NextResponse.json({ ok: true, message: `عضویت ${target.fullName} تایید شد.` })
    }

    if (action === "reject") {
      if (target.status !== "pending") {
        return NextResponse.json({ error: "فقط درخواست‌های در انتظار قابل رد هستند" }, { status: 409 })
      }
      const reasonKey = reason && USER_REJECT_TITLES[reason] ? reason : "other"
      await db.user.update({ where: { id: target.id }, data: { status: "rejected", rejectReason: reasonKey } })
      await notifyUser(target.id, "user_status", "❌ درخواست عضویت شما رد شد", `دلیل: ${USER_REJECT_TITLES[reasonKey]} — در صورت نیاز می‌توانید مجدداً ثبت‌نام کنید.`, `user:${target.id}`, { force: true })
      return NextResponse.json({ ok: true, message: `درخواست ${target.fullName} رد شد (${USER_REJECT_TITLES[reasonKey]}).` })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت کاربران" }, { status: 500 })
  }
}
