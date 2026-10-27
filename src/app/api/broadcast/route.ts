import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUsers } from "@/lib/server/upkeep"

// اطلاع‌رسانی همگانی ادمین به همه کاربران فعال (menu.bcast ربات)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, text } = body ?? {}
    const message = String(text ?? "").trim()
    if (!userId || message.length < 3) {
      return NextResponse.json({ error: "متن اطلاع‌رسانی باید حداقل ۳ کاراکتر باشد" }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند اطلاع‌رسانی کند" }, { status: 403 })
    }

    const { sent, skipped } = await notifyUsers({
      kind: "broadcast",
      title: "اطلاع‌رسانی مدیریت",
      body: message.slice(0, 1000),
    })
    return NextResponse.json({
      ok: true,
      message: `اطلاع‌رسانی برای ${sent} نفر ارسال شد${skipped ? ` (${skipped} نفر به‌دلیل تنظیمات اعلان یا ساعت سکوت دریافت نکردند)` : ""}.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در اطلاع‌رسانی" }, { status: 500 })
  }
}
