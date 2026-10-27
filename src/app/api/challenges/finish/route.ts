import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { finalizeChallenge } from "@/lib/server/upkeep"

// اعلام نتایج چالش (ch.fin ربات — فقط ادمین کل؛ خودکار هم با پایان endAt اجرا می‌شود)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, challengeId } = body ?? {}
    if (!userId || !challengeId) return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند نتایج را اعلام کند" }, { status: 403 })
    }
    const ch = await db.challenge.findUnique({ where: { id: Number(challengeId) } })
    if (!ch) return NextResponse.json({ error: "چالش یافت نشد" }, { status: 404 })
    if (ch.status !== "active") return NextResponse.json({ error: "این چالش قبلاً تمام شده است" }, { status: 409 })

    const { podium } = await finalizeChallenge(ch.id)
    const podiumText =
      podium.length === 0
        ? "هیچ خبر تاییدشده‌ای ثبت نشده بود."
        : podium
            .slice(0, 3)
            .map((r, i) => `${["اول", "دوم", "سوم"][i]}: ${r.fullName} (${r.n} خبر)`)
            .join(" · ")
    return NextResponse.json({
      ok: true,
      podium,
      message: `نتایج چالش «${ch.title}» اعلام شد. ${podiumText}`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در اعلام نتایج" }, { status: 500 })
  }
}
