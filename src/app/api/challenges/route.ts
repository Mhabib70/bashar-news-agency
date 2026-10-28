import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { nextChallengeCode } from "@/lib/server/challenges-code"
import { notifyActiveUsers } from "@/lib/server/notify"

// ایجاد چالش جدید — فقط ادمین کل (معادل سناریوی ۴ ربات: عنوان/توضیح/مهلت جلالی/جایزه)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, title, description, reward, deadlineAt } = body ?? {}
    const admin = await db.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند چالش بسازد" }, { status: 403 })
    }
    if (!title || String(title).trim().length < 3 || String(title).trim().length > 120) {
      return NextResponse.json({ error: "عنوان چالش باید بین ۳ تا ۱۲۰ کاراکتر باشد" }, { status: 400 })
    }
    if (description && String(description).length > 1000) {
      return NextResponse.json({ error: "توضیحات خیلی بلند است" }, { status: 400 })
    }
    const dl = new Date(deadlineAt)
    if (!deadlineAt || isNaN(dl.getTime()) || dl.getTime() <= Date.now()) {
      return NextResponse.json({ error: "مهلت چالش باید زمانی در آینده باشد" }, { status: 400 })
    }
    const code = await nextChallengeCode()
    const ch = await db.challenge.create({
      data: {
        code,
        title: String(title).trim(),
        description: String(description ?? "").trim(),
        deadlineAt: dl,
        endAt: dl, // پایان خودکار هم‌زمان با مهلت (سرویس‌گردان سررسید را می‌بندد)
        reward: String(reward ?? "").trim(),
        createdBy: admin.fullName,
      },
    })
    await notifyActiveUsers("challenge", `🏆 چالش جدید: ${ch.title}`, `${ch.description || "با ارسال خبر در این چالش شرکت کن."} · جایزه: ${ch.reward || "—"}`, `challenge:${ch.id}`)
    return NextResponse.json({
      ok: true,
      challenge: { id: ch.id, code: ch.code, title: ch.title },
      message: `چالش ${ch.code} ایجاد و به همه اعضا اعلام شد.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ایجاد چالش" }, { status: 500 })
  }
}
