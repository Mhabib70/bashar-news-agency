import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUser } from "@/lib/server/notify"
import { ROLE_LABELS } from "@/lib/domain"

// ویرایش متن خبر توسط ادمین کل یا کارشناس خبر (اختیار سردبیری)
// - ادمین کل و کارشناس می‌توانند تیتر و متن کامل هر خبری را در هر وضعیتی ویرایش کنند.
// - رویداد «ویرایش» در ردپای چرخه ثبت می‌شود و خبرنگار اعلان دریافت می‌کند.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newsId, title, content } = body ?? {}
    if (!userId || !newsId || !title || !content) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }
    if (String(title).trim().length < 8) {
      return NextResponse.json({ error: "تیتر باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    }
    if (String(content).trim().length < 30) {
      return NextResponse.json({ error: "متن خبر باید حداقل ۳۰ کاراکتر باشد" }, { status: 400 })
    }

    const editor = await db.user.findUnique({ where: { id: userId } })
    if (!editor || !["admin", "specialist"].includes(editor.role) || editor.status !== "active") {
      return NextResponse.json({ error: "فقط ادمین کل و کارشناس خبر می‌توانند متن خبر را ویرایش کنند" }, { status: 403 })
    }

    const news = await db.newsItem.findUnique({ where: { id: Number(newsId)}, include: { reporter: true } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })

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
        note: `ویرایش متن خبر توسط ${ROLE_LABELS[editor.role] ?? editor.role}`,
      },
    })

    if (news.reporterId && news.reporterId !== editor.id) {
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
