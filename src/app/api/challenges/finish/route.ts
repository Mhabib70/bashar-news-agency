import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { finishChallenge } from "@/lib/server/challenges"

// پایان چالش و اعلام نتایج — فقط ادمین کل (معادل ch.fin ربات)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, challengeId } = body ?? {}
    const admin = await db.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند نتایج را اعلام کند" }, { status: 403 })
    }
    const ch = await db.challenge.findUnique({ where: { id: Number(challengeId) } })
    if (!ch) return NextResponse.json({ error: "چالش یافت نشد" }, { status: 404 })
    if (ch.status !== "active") return NextResponse.json({ error: "این چالش قبلاً پایان یافته است" }, { status: 409 })

    const res = await finishChallenge(ch.id)
    return NextResponse.json({
      ok: true,
      winners: res?.winners ?? [],
      message: res && res.winners.length > 0
        ? `نتایج چالش «${ch.title}» اعلام شد. قهرمان: ${res.winners[0].fullName}`
        : `چالش «${ch.title}» بدون شرکت‌کننده فعال پایان یافت.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در پایان چالش" }, { status: 500 })
  }
}
