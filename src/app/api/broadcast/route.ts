import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyActiveUsers } from "@/lib/server/notify"

// پیام همگانی ادمین به همه اعضای فعال — با احترام به فلگ broadcast و ساعت سکوت (سناریوی ۵ ربات)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, title, text } = body ?? {}
    const admin = await db.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند پیام همگانی بفرستد" }, { status: 403 })
    }
    if (!title || !text) return NextResponse.json({ error: "عنوان و متن پیام الزامی است" }, { status: 400 })
    const sent = await notifyActiveUsers(
      "broadcast",
      `📣 ${String(title).slice(0, 80)}`,
      String(text).slice(0, 800),
      `broadcast:${Date.now()}`,
    )
    return NextResponse.json({ ok: true, sent, message: `پیام برای ${sent} عضو ارسال شد (تنظیمات اعلان و ساعت سکوت رعایت شد).` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ارسال پیام همگانی" }, { status: 500 })
  }
}
