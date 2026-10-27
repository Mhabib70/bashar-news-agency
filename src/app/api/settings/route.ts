import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// تنظیمات اعلان + ساعت سکوت (سناریوی ۹)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, approvals, challenges, broadcast, rejections, quietStart, quietEnd } = body ?? {}
    if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
    const existing = await db.notifSetting.findUnique({ where: { userId } })
    const data = {
      ...(typeof approvals === "boolean" ? { approvals } : {}),
      ...(typeof challenges === "boolean" ? { challenges } : {}),
      ...(typeof broadcast === "boolean" ? { broadcast } : {}),
      ...(typeof rejections === "boolean" ? { rejections } : {}),
      ...(quietStart ? { quietStart: String(quietStart) } : {}),
      ...(quietEnd ? { quietEnd: String(quietEnd) } : {}),
      updatedAt: new Date(),
    }
    if (existing) {
      await db.notifSetting.update({ where: { userId }, data })
    } else {
      await db.notifSetting.create({ data: { userId, ...data } })
    }
    return NextResponse.json({ ok: true, message: "تنظیمات اعلان ذخیره شد." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ذخیره تنظیمات" }, { status: 500 })
  }
}
