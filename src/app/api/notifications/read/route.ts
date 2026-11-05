import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// علامت‌گذاری همهٔ اعلان‌های رسیده به‌عنوان خوانده‌شده — با باز شدن شیت اعلان‌ها صدا زده می‌شود
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId ?? "")
    if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    const res = await db.notification.updateMany({
      where: { userId, readAt: null, deliveredAt: { lte: new Date() } },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ ok: true, marked: res.count })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در به‌روزرسانی اعلان‌ها" }, { status: 500 })
  }
}
