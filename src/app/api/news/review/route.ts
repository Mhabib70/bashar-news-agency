import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addPoints, evaluateBadges } from "@/lib/server/state"
import { POINTS, nextReviewStage, reviewStageLabel, REJECT_REASONS } from "@/lib/domain"

// بررسی خبر (سناریوی ۳: چرخه سه‌مرحله‌ای — مدیر حوزه ← کارشناس ← ادمین کل)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newsId, action, reason, note } = body ?? {}
    if (!userId || !newsId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }
    const reviewer = await db.user.findUnique({ where: { id: userId } })
    if (!reviewer || reviewer.role === "reporter") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const news = await db.newsItem.findUnique({ where: { id: Number(newsId) }, include: { reporter: true } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })
    if (news.status !== "pending") {
      return NextResponse.json({ error: "این خبر قبلاً بررسی شده است" }, { status: 409 })
    }

    const stage = news.reviewStage

    if (action === "approve") {
      // ادمین کل اختیار تام دارد: تایید او از هر مرحله‌ای، انتشار نهایی است
      const next = reviewer.role === "admin" ? null : nextReviewStage(stage)
      if (next) {
        // عبور به مرحله بعد
        await db.newsItem.update({
          where: { id: news.id },
          data: { reviewStage: next },
        })
        return NextResponse.json({
          ok: true,
          message: `خبر ${news.code} تایید شد و به مرحله «${reviewStageLabel(next)}» ارجاع گردید.`,
        })
      }
      // تایید نهایی ادمین کل
      await db.newsItem.update({
        where: { id: news.id },
        data: { status: "approved", reviewStage: "", reviewedBy: reviewer.fullName, reviewedAt: new Date() },
      })
      await addPoints(news.reporterId, POINTS.APPROVE, "تایید خبر", "approve")
      const awarded = await evaluateBadges(news.reporterId)
      return NextResponse.json({
        ok: true,
        message: `خبر ${news.code} به‌صورت نهایی تایید و منتشر شد. +${POINTS.APPROVE} امتیاز برای خبرنگار`,
        badgesAwarded: awarded,
      })
    }

    // رد با دلیل
    const reasonKey = REJECT_REASONS.find((r) => r.key === reason)?.key ?? "insufficient"
    await db.newsItem.update({
      where: { id: news.id },
      data: {
        status: "rejected",
        reviewStage: "",
        rejectReason: reasonKey,
        rejectNote: note ? String(note).slice(0, 500) : "",
        reviewedBy: reviewer.fullName,
        reviewedAt: new Date(),
      },
    })
    return NextResponse.json({
      ok: true,
      message: `خبر ${news.code} با دلیل «${REJECT_REASONS.find((r) => r.key === reasonKey)?.label}» به خبرنگار بازگشت.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در بررسی خبر" }, { status: 500 })
  }
}
