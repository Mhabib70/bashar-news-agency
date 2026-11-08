import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// فید اجتماعی خبرگزاری — آخرین اخبار منتشرشدهٔ همهٔ همکاران (فقط خواندنی)
// همهٔ نقش‌ها اجازهٔ دیدن اخبار تأییدشدهٔ نهایی را دارند (خبر رسمی خبرگزاری است)
export async function GET(req: NextRequest) {
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })

  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 12) || 12, 30)

  const rows = await db.newsItem.findMany({
    where: { status: "approved" },
    include: { reporter: { select: { fullName: true, district: true, avatar: true, base: true } } },
    orderBy: { reviewedAt: "desc" },
    take,
  })

  return NextResponse.json({
    news: rows.map((n) => ({
      id: n.id,
      code: n.code,
      title: n.title,
      content: n.content,
      category: n.category,
      mediaType: n.mediaType,
      mediaUrl: n.mediaUrl,
      durationMin: n.durationMin,
      preparedAt: n.preparedAt ? n.preparedAt.toISOString() : null,
      createdAt: n.createdAt,
      reporterName: n.reporter.fullName,
      reporterAvatar: n.reporter.avatar,
      reporterDistrict: n.reporter.district,
      reporterBase: n.reporter.base,
      isMine: n.reporterId === user.id,
    })),
  })
}
