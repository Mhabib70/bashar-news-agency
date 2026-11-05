import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// فید اجتماعی خبرگزاری — آخرین اخبار منتشرشدهٔ همهٔ همکاران (فقط خواندنی)
// همهٔ نقش‌ها اجازهٔ دیدن اخبار تأییدشدهٔ نهایی را دارند (خبر رسمی خبرگزاری است)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

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
      createdAt: n.createdAt,
      reporterName: n.reporter.fullName,
      reporterAvatar: n.reporter.avatar,
      reporterDistrict: n.reporter.district,
      reporterBase: n.reporter.base,
      isMine: n.reporterId === userId,
    })),
  })
}
