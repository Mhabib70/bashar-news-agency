import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addPoints, recordActivity, nextNewsCode, evaluateBadges } from "@/lib/server/state"
import { notifyStageStaff } from "@/lib/server/notify"
import { POINTS, CATEGORY_LABELS } from "@/lib/domain"

// جستجوی اخبار — خبرنگار: اخبار خودش؛ ارزیاب/ادمین: scope=all همه اخبار
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get("userId")
  const q = (sp.get("q") ?? "").trim()
  const scope = sp.get("scope") === "all" ? "all" : "mine"
  if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
  if (q.length < 2) return NextResponse.json({ news: [] })

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

  const canAll = scope === "all" && user.role !== "reporter"
  const where = {
    ...(canAll ? {} : { reporterId: userId }),
    OR: [
      { title: { contains: q } },
      { content: { contains: q } },
      { code: { contains: q } },
    ],
  }
  const rows = await db.newsItem.findMany({
    where,
    include: { reporter: { select: { fullName: true, district: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ news: rows })
}

// ارسال خبر جدید (سناریوی ۲: دسته ← عنوان ← متن ← رسانه ← پیش‌نمایش)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, category, title, content, mediaType, mediaUrl, durationMin, challengeId, draftId } = body ?? {}
    if (!userId || !title || !content) {
      return NextResponse.json({ error: "عنوان و متن خبر الزامی است" }, { status: 400 })
    }
    if (String(title).trim().length < 8) return NextResponse.json({ error: "تیتر باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    if (String(content).trim().length < 30) return NextResponse.json({ error: "متن خبر باید حداقل ۳۰ کاراکتر باشد" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (user.status !== "active") return NextResponse.json({ error: "حساب شما فعال نیست" }, { status: 403 })

    const code = await nextNewsCode()
    const news = await db.newsItem.create({
      data: {
        code,
        reporterId: userId,
        district: user.district,
        category: category || "none",
        title: String(title).slice(0, 200),
        content: String(content),
        mediaType: ["photo", "video"].includes(mediaType) ? mediaType : "none",
        mediaUrl: typeof mediaUrl === "string" && mediaUrl.startsWith("/uploads/") ? mediaUrl : "",
        durationMin: Math.max(1, Math.min(600, Number(durationMin) || 30)),
        status: "pending",
        reviewStage: "district",
        challengeId: challengeId ? Number(challengeId) : null,
      },
    })

    // امتیاز ارسال + استریک
    await addPoints(userId, POINTS.SUBMIT, "ارسال خبر", "submit")
    await recordActivity(userId)

    // ثبت خودکار در چالش فعال (سناریوی ۴)
    let challengeJoined: string | null = null
    if (challengeId) {
      const ch = await db.challenge.findUnique({ where: { id: Number(challengeId) }, include: { participations: true } })
      if (ch && ch.status === "active") {
        const existing = ch.participations.find((p) => p.userId === userId)
        if (existing) {
          await db.challengeParticipation.update({ where: { id: existing.id }, data: { count: { increment: 1 } } })
        } else {
          await db.challengeParticipation.create({ data: { challengeId: ch.id, userId, count: 1 } })
        }
        challengeJoined = ch.title
      }
    }

    // اعلان به مدیر حوزه + ادمین: خبر جدید در صف بررسی
    await notifyStageStaff("district", "📰 خبر جدید در صف بررسی", `${news.title} — ${user.fullName}`, `news:${news.id}`)

    // حذف پیش‌نویس پس از ارسال موفق (رفع ایراد: پیش‌نویس قبلاً فقط خالی می‌شد)
    if (draftId) {
      const d = await db.draft.findUnique({ where: { id: Number(draftId) } })
      if (d && d.userId === userId) await db.draft.delete({ where: { id: d.id } })
    }

    const awarded = await evaluateBadges(userId)
    return NextResponse.json({
      ok: true,
      news: { id: news.id, code: news.code },
      pointsEarned: POINTS.SUBMIT,
      challengeJoined,
      badgesAwarded: awarded.map((k) => k),
      message: `خبر ${code} با دسته «${CATEGORY_LABELS[category] ?? "بدون دسته‌بندی"}» ثبت شد و در انتظار بررسی مدیر حوزه است.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ثبت خبر" }, { status: 500 })
  }
}
