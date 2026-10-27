import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUsers } from "@/lib/server/upkeep"

// ایجاد چالش جدید (سناریوی ۴ — فقط ادمین کل)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, title, description, deadlineAt, endAt, reward } = body ?? {}
    if (!userId || !title || !deadlineAt || !endAt) {
      return NextResponse.json({ error: "عنوان، مهلت و زمان پایان الزامی است" }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند چالش بسازد" }, { status: 403 })
    }
    const deadline = new Date(deadlineAt)
    const end = new Date(endAt)
    if (isNaN(deadline.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "تاریخ‌ها نامعتبر است" }, { status: 400 })
    }
    if (deadline.getTime() <= Date.now()) {
      return NextResponse.json({ error: "مهلت ارسال باید در آینده باشد" }, { status: 400 })
    }
    if (end.getTime() <= deadline.getTime()) {
      return NextResponse.json({ error: "زمان پایان باید بعد از مهلت ارسال باشد" }, { status: 400 })
    }

    const last = await db.challenge.findFirst({ orderBy: { id: "desc" }, select: { id: true } })
    const code = `CH-${1000 + (last?.id ?? 0) + 1}`
    const ch = await db.challenge.create({
      data: {
        code,
        title: String(title).slice(0, 120),
        description: String(description ?? "").slice(0, 500),
        deadlineAt: deadline,
        endAt: end,
        reward: String(reward ?? "").slice(0, 120),
        status: "active",
        createdBy: user.id,
      },
    })

    // اطلاع‌رسانی چالش جدید به همه کاربران فعال (challenge_announcement)
    const announce = `🏆 ${ch.title}${ch.reward ? `\n🎁 جایزه: ${ch.reward}` : ""}\nمهلت ارسال: تا ${deadline.toLocaleDateString("fa-IR")}`
    const { sent, skipped } = await notifyUsers({
      kind: "challenge_new",
      title: "چالش جدید آغاز شد",
      body: announce,
      ref: `ch:${ch.id}:new`,
    })

    return NextResponse.json({
      ok: true,
      challenge: { id: ch.id, code: ch.code, title: ch.title },
      notified: { sent, skipped },
      message: `چالش ${code} ایجاد و به ${sent} نفر اعلام شد${skipped ? ` (${skipped} نفر به‌دلیل تنظیمات یا ساعت سکوت رد شدند)` : ""}.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ایجاد چالش" }, { status: 500 })
  }
}
