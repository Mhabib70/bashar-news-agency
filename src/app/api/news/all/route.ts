import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// همه اخبار سازمان در هر وضعیت — برای اشراف همه بر چرخه انتشار
// (اخبار من در state اصلی می‌آید؛ این مسیر نمای کل سازمان را می‌دهد)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }

  const rows = await db.newsItem.findMany({
    include: {
      reporter: { select: { id: true, fullName: true, avatar: true } },
      events: { orderBy: { createdAt: "asc" }, take: 12 },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  })

  return NextResponse.json({
    news: rows.map((n) => ({
      id: n.id,
      code: n.code,
      reporterId: n.reporterId,
      reporterName: n.reporter?.fullName ?? "—",
      reporterAvatar: n.reporter?.avatar ?? "",
      reporterDistrict: n.district,
      district: n.district,
      category: n.category,
      title: n.title,
      content: n.content,
      mediaType: n.mediaType,
      mediaUrl: n.mediaUrl,
      status: n.status,
      reviewStage: n.reviewStage,
      rejectReason: n.rejectReason,
      rejectNote: n.rejectNote,
      reviewedBy: n.reviewedBy,
      challengeId: n.challengeId,
      durationMin: n.durationMin,
      createdAt: n.createdAt.toISOString(),
      events: n.events.map((e) => ({
        id: e.id, stage: e.stage, action: e.action, actorName: e.actorName,
        actorRole: e.actorRole, note: e.note, createdAt: e.createdAt.toISOString(),
      })),
    })),
  })
}
