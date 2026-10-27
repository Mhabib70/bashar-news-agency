import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addPoints, evaluateBadges } from "@/lib/server/state"
import { notifyUser, notifyStageStaff } from "@/lib/server/notify"
import { POINTS, nextReviewStage, reviewStageLabel, REJECT_REASONS, BADGES, ROLE_LABELS } from "@/lib/domain"

// بررسی خبر (سناریوی ۳: چرخه سه‌مرحله‌ای — مدیر حوزه ← کارشناس ← ادمین کل)
// امنیت: هر نقش فقط خبرِ مرحله خودش را می‌بیند و تصمیم می‌گیرد؛ مدیر حوزه فقط حوزه خودش.
// ادمین کل دو حالت دارد: mode=advance (تایید و ارجاع به مرحله بعد) یا mode=final (تایید نهایی و انتشار فوری)
// هر تصمیم یک رویداد NewsEvent ثبت می‌کند و خبرنگار در هر گذر مرحله اعلان می‌گیرد.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newsId, action, reason, note, mode } = body ?? {}
    if (!userId || !newsId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }
    const reviewer = await db.user.findUnique({ where: { id: userId } })
    if (!reviewer || reviewer.role === "reporter" || reviewer.status !== "active") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const news = await db.newsItem.findUnique({ where: { id: Number(newsId) }, include: { reporter: true } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })
    if (news.status !== "pending") {
      return NextResponse.json({ error: "این خبر قبلاً بررسی شده است" }, { status: 409 })
    }

    const stage = news.reviewStage
    const stageIdx = ["district", "specialist", "admin"].indexOf(stage)

    // کنترل دسترسی مرحله/حوزه (رفع حفره: تایید خبر مرحله بالاتر یا حوزه دیگر)
    if (reviewer.role === "district_manager") {
      if (stage !== "district") return NextResponse.json({ error: "این خبر در مرحله مدیر حوزه نیست" }, { status: 403 })
      if (news.district !== reviewer.district) return NextResponse.json({ error: "این خبر متعلق به حوزه شما نیست" }, { status: 403 })
    } else if (reviewer.role === "specialist") {
      if (stage !== "specialist") return NextResponse.json({ error: "این خبر در مرحله کارشناس نیست" }, { status: 403 })
    }
    // ادمین کل: اختیار تام روی هر مرحله (با انتخاب ارجاع یا انتشار نهایی)

    const actorEvent = {
      actorId: reviewer.id,
      actorName: reviewer.fullName,
      actorRole: reviewer.role,
    }

    if (action === "approve") {
      // تصمیم ادمین کل: mode=final → انتشار فوری؛ mode=advance یا پیش‌فرض → ارجاع به مرحله بعد
      // اگر خبر در مرحله ادمین است، تایید یعنی انتشار نهایی
      const wantFinal = reviewer.role === "admin" && (mode === "final" || stage === "admin")
      const next = wantFinal ? "" : nextReviewStage(stage)

      if (next) {
        // عبور به مرحله بعد + رویداد + اعلان به خبرنگار و ارزیابان مرحله بعد
        await db.newsItem.update({ where: { id: news.id }, data: { reviewStage: next } })
        await db.newsEvent.create({
          data: { newsId: news.id, stage, action: "advanced", note: `تایید شد و به «${reviewStageLabel(next)}» ارجاع شد`, ...actorEvent },
        })
        await notifyStageStaff(next, "🔔 خبر به مرحله شما رسید", `${news.title} — ${news.reporter.fullName}`, `news:${news.id}`)
        await notifyUser(
          news.reporterId,
          "review",
          `✅ تایید ${reviewStageLabel(stage)}`,
          `${reviewer.fullName} (${ROLE_LABELS[reviewer.role]}) خبر «${news.title}» را تایید کرد — خبر شما الان دست ${reviewStageLabel(next)} است.`,
          `news:${news.id}`,
        )
        return NextResponse.json({
          ok: true,
          advancedTo: next,
          message: `خبر ${news.code} تایید شد و به مرحله «${reviewStageLabel(next)}» ارجاع گردید.`,
        })
      }

      // تایید نهایی و انتشار
      await db.newsItem.update({
        where: { id: news.id },
        data: { status: "approved", reviewStage: "", reviewedBy: reviewer.fullName, reviewedAt: new Date() },
      })
      await db.newsEvent.create({
        data: { newsId: news.id, stage: stage || "admin", action: "final_approved", note: `منتشر شد (+${POINTS.APPROVE} امتیاز)`, ...actorEvent },
      })
      await addPoints(news.reporterId, POINTS.APPROVE, "تایید خبر", "approve")
      const awarded = await evaluateBadges(news.reporterId)
      await notifyUser(news.reporterId, "approved", "✅ خبر شما تایید و منتشر شد", `${news.title} (+${POINTS.APPROVE} امتیاز)`, `news:${news.id}`)
      for (const key of awarded) {
        await notifyUser(news.reporterId, "badge", `${BADGES[key].emoji} نشان جدید: ${BADGES[key].title}`, BADGES[key].desc, `badge:${key}`)
      }
      return NextResponse.json({
        ok: true,
        final: true,
        message: `خبر ${news.code} به‌صورت نهایی تایید و منتشر شد. +${POINTS.APPROVE} امتیاز برای خبرنگار`,
        badgesAwarded: awarded,
      })
    }

    // رد با دلیل
    const reasonKey = REJECT_REASONS.find((r) => r.key === reason)?.key ?? "insufficient"
    const reasonLabel = REJECT_REASONS.find((r) => r.key === reasonKey)?.label ?? ""
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
    await db.newsEvent.create({
      data: { newsId: news.id, stage: stage || "", action: "rejected", note: reasonLabel + (note ? ` — ${String(note).slice(0, 200)}` : ""), ...actorEvent },
    })
    await notifyUser(
      news.reporterId,
      "rejected",
      "❌ خبر شما رد شد",
      `${news.title} — دلیل: ${reasonLabel}${note ? ` · ${String(note).slice(0, 120)}` : ""}`,
      `news:${news.id}`,
    )
    return NextResponse.json({
      ok: true,
      message: `خبر ${news.code} با دلیل «${reasonLabel}» به خبرنگار بازگشت.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در بررسی خبر" }, { status: 500 })
  }
}
