import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// شمارش بازدید خبر — با باز شدن جزئیات خبر یک‌بار صدا زده می‌شود
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const newsId = Number(body?.newsId)
    if (!newsId) return NextResponse.json({ error: "پارامتر ناقص" }, { status: 400 })
    const user = await activeUser(req)
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
    const r = await db.newsItem
      .update({ where: { id: newsId }, data: { views: { increment: 1 } }, select: { views: true } })
      .catch(() => null)
    return NextResponse.json({ ok: true, views: r?.views ?? null })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ثبت بازدید" }, { status: 500 })
  }
}
