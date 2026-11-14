import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"
import { getWeekFeatured } from "@/lib/server/state"

// همه اخبار سازمان در هر وضعیت — برای اشراف همه بر چرخه انتشار
// (اخبار من در state اصلی می‌آید؛ این مسیر نمای کل سازمان را می‌دهد)
// فیلترهای سروری: q (تیتر/متن/کد)، دسته، وضعیت، بازه زمانی (week|month)
export async function GET(req: NextRequest) {
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const q = (sp.get("q") ?? "").trim()
  const category = (sp.get("category") ?? "").trim()
  const status = (sp.get("status") ?? "").trim()
  const period = (sp.get("period") ?? "").trim()

  const where: Record<string, unknown> = {}
  if (q.length >= 2) {
    where.OR = [{ title: { contains: q } }, { content: { contains: q } }, { code: { contains: q } }]
  }
  if (category && category !== "all") where.category = category
  if (["pending", "approved", "rejected"].includes(status)) where.status = status
  if (period === "week") where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
  if (period === "month") where.createdAt = { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }

  const rows = await db.newsItem.findMany({
    where,
    include: {
      reporter: { select: { id: true, fullName: true, avatar: true } },
      events: { orderBy: { createdAt: "asc" }, take: 12 },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  })

  // خبر هفته برای نشان ویژه روی کارت‌ها
  const featured = await getWeekFeatured().catch(() => null)

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
      preparedAt: n.preparedAt ? n.preparedAt.toISOString() : null,
      views: n.views,
      eitaaReactions: n.eitaaReactions,
      isWeekFeatured: featured?.id === n.id,
      createdAt: n.createdAt.toISOString(),
      events: n.events.map((e) => ({
        id: e.id, stage: e.stage, action: e.action, actorName: e.actorName,
        actorRole: e.actorRole, note: e.note, createdAt: e.createdAt.toISOString(),
      })),
    })),
  })
}
