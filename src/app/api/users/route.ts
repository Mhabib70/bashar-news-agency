import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { LEVELS } from "@/lib/domain"

// لیست کاربران برای پنل مدیریت (menu.users / mgr.users ربات)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "پارامتر ناقص" }, { status: 400 })
    const actor = await db.user.findUnique({ where: { id: userId } })
    if (!actor || actor.role === "reporter") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    const where =
      actor.role === "admin"
        ? {}
        : actor.role === "district_manager"
          ? { district: actor.district, role: "reporter" }
          : { id: "___" } // کارشناس به لیست کاربران دسترسی ندارد
    const users = await db.user.findMany({
      where,
      select: { id: true, fullName: true, username: true, role: true, status: true, district: true, base: true, phone: true, points: true, levelKey: true, rejectReason: true, createdAt: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    })

    const counts = await db.newsItem.groupBy({
      by: ["reporterId", "status"],
      where: { reporterId: { in: users.map((u) => u.id) } },
      _count: { reporterId: true },
    })
    const countMap = new Map<string, { approved: number; rejected: number; pending: number }>()
    for (const c of counts) {
      const cur = countMap.get(c.reporterId) ?? { approved: 0, rejected: 0, pending: 0 }
      if (c.status === "approved") cur.approved = c._count.reporterId
      else if (c.status === "rejected") cur.rejected = c._count.reporterId
      else cur.pending = c._count.reporterId
      countMap.set(c.reporterId, cur)
    }

    return NextResponse.json({
      actorRole: actor.role,
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        levelTitle: LEVELS.find((l) => l.key === u.levelKey)?.title ?? u.levelKey,
        newsCounts: countMap.get(u.id) ?? { approved: 0, rejected: 0, pending: 0 },
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در دریافت کاربران" }, { status: 500 })
  }
}
