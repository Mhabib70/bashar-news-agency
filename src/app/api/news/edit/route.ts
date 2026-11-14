import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUser } from "@/lib/server/notify"
import { ROLE_LABELS } from "@/lib/domain"
import { activeUser } from "@/lib/server/session"

// ویرایش متن خبر (اختیار سردبیری)
// - ادمین کل و کارشناس خبر: هر خبری در هر وضعیتی
// - خودِ خبرنگار: فقط خبر «در انتظار بررسی» خودش (قبل از ورود به چرخه تصمیم)
// رویداد «ویرایش» در ردپای چرخه ثبت می‌شود و خبرنگار اعلان دریافت می‌کند.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsId, title, content } = body ?? {}
    if (!newsId || !title || !content) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }
    if (String(title).trim().length < 8) {
      return NextResponse.json({ error: "تیتر باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    }
    if (String(content).trim().length < 30) {
      return NextResponse.json({ error: "متن خبر باید حداقل ۳۰ کاراکتر باشد" }, { status: 400 })
    }

    const editor = await activeUser(req)
    if (!editor) {
      return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
    }

    const news = await db.newsItem.findUnique({ where: { id: Number(newsId)}, include: { reporter: true } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })

    const isReviewer = ["admin", "specialist"].includes(editor.role)
    const isOwnerPending = news.reporterId === editor.id && news.status === "pending"
    if (!isReviewer && !isOwnerPending) {
      return NextResponse.json(
        { error: "ویرایش مجاز نیست: ارزیابان هر خبری را ویرایش می‌کنند؛ خبرنگار فقط خبر در انتظار بررسی خودش را." },
        { status: 403 },
      )
    }

    const newTitle = String(title).trim().slice(0, 200)
    const newContent = String(content).trim()

    await db.newsItem.update({
      where: { id: news.id },
      data: { title: newTitle, content: newContent },
    })

    await db.newsEvent.create({
      data: {
        newsId: news.id,
        stage: "",
        action: "edited",
        actorId: editor.id,
        actorName: editor.fullName,
        actorRole: editor.role,
        note: isReviewer
          ? `ویرایش متن خبر توسط ${ROLE_LABELS[editor.role] ?? editor.role}`
          : "ویرایش توسط خبرنگار (پیش از بررسی)",
      },
    })

    if (isReviewer && news.reporterId && news.reporterId !== editor.id) {
      await notifyUser(
        news.reporterId,
        "review",
        "✏️ متن خبر شما ویرایش شد",
        `«${newTitle}» — متن خبر شما پیش از انتشار توسط ${ROLE_LABELS[editor.role] ?? "ارزیاب"} ویرایش شد.`,
        `news:${news.id}`,
      )
    }

    return NextResponse.json({ ok: true, message: "متن خبر به‌روزرسانی شد." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ویرایش خبر" }, { status: 500 })
  }
}
