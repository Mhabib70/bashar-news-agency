import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// ثبت آمار واکنش کانال ایتا برای یک خبر منتشرشده.
// ایتا آمار برنامه‌نویسی‌شده ارائه نمی‌دهد؛ ادمین/کارشناسِ دارای مجوز عدد واکنش‌ها
// را از کانال می‌خواند و اینجا ثبت می‌کند تا زیر خبر نمایش داده شود.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const newsId = Number(body?.newsId)
    const reactions = Math.max(0, Math.min(100000, Math.round(Number(body?.reactions))))
    if (!newsId || Number.isNaN(reactions)) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }
    const user = await activeUser(req)
    const allowed =
      user?.role === "admin" ||
      (user?.role === "specialist" && user.status === "active" && user.canSendEitaa)
    if (!user || !allowed) {
      return NextResponse.json({ error: "اجازه ندارید — ثبت آمار ایتا برای ادمین کل و کارشناسِ دارای مجوز است." }, { status: 403 })
    }

    const news = await db.newsItem.findUnique({ where: { id: newsId }, select: { id: true, status: true } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })
    if (news.status !== "approved") {
      return NextResponse.json({ error: "آمار فقط برای خبر منتشرشده ثبت می‌شود" }, { status: 400 })
    }

    await db.newsItem.update({ where: { id: newsId }, data: { eitaaReactions: reactions } })
    return NextResponse.json({ ok: true, message: `واکنش‌های ایتا روی ${reactions} تنظیم شد.` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ثبت آمار ایتا" }, { status: 500 })
  }
}
