import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// عضویت در چالش فعال (سناریوی ۴)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, challengeId } = body ?? {}
    if (!userId || !challengeId) return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    const ch = await db.challenge.findUnique({ where: { id: Number(challengeId) }, include: { participations: true } })
    if (!ch) return NextResponse.json({ error: "چالش یافت نشد" }, { status: 404 })
    if (ch.status !== "active") return NextResponse.json({ error: "این چالش پایان یافته است" }, { status: 409 })
    if (ch.participations.some((p) => p.userId === userId)) {
      return NextResponse.json({ ok: true, message: "قبلاً در این چالش شرکت کرده‌اید." })
    }
    await db.challengeParticipation.create({ data: { challengeId: ch.id, userId, count: 0 } })
    return NextResponse.json({ ok: true, message: `در چالش «${ch.title}» ثبت‌نام شدید. با ارسال خبر و انتخاب این چالش امتیاز بگیرید!` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در عضویت چالش" }, { status: 500 })
  }
}
