import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// حذف خبر — خبرنگار می‌تواند خبر در انتظار بررسی یا ردشدهٔ خود را حذف کند؛
// ادمین کل هر خبری را می‌تواند حذف کند.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsId } = body ?? {}
    if (!newsId) return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })

    const user = await activeUser(req)
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })

    const news = await db.newsItem.findUnique({ where: { id: Number(newsId) } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })

    const isOwner = news.reporterId === user.id
    const isAdmin = user.role === "admin"
    if (!isAdmin && !(isOwner && (news.status === "pending" || news.status === "rejected"))) {
      return NextResponse.json(
        { error: "فقط خبر در انتظار بررسی یا ردشدهٔ خودتان قابل حذف است (خبر منتشرشده را ادمین حذف می‌کند)." },
        { status: 403 },
      )
    }

    await db.newsItem.delete({ where: { id: news.id } })
    return NextResponse.json({ ok: true, message: `خبر ${news.code} حذف شد.` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در حذف خبر" }, { status: 500 })
  }
}
