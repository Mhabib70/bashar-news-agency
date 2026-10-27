import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyStageStaff } from "@/lib/server/notify"

// ویرایش و ارسال مجدد خبر رد‌شده — چرخه از مرحله ۱ شروع می‌شود
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newsId, title, content, category } = body ?? {}
    if (!userId || !newsId) return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    const news = await db.newsItem.findUnique({ where: { id: Number(newsId) } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })
    if (news.reporterId !== userId) return NextResponse.json({ error: "فقط خبرنگار خودش می‌تواند ویرایش کند" }, { status: 403 })
    if (news.status !== "rejected") return NextResponse.json({ error: "فقط خبر رد‌شده قابل ارسال مجدد است" }, { status: 409 })
    if (title && String(title).trim().length < 8) return NextResponse.json({ error: "تیتر باید حداقل ۸ کاراکتر باشد" }, { status: 400 })
    if (content && String(content).trim().length < 30) return NextResponse.json({ error: "متن خبر باید حداقل ۳۰ کاراکتر باشد" }, { status: 400 })

    await db.newsItem.update({
      where: { id: news.id },
      data: {
        status: "pending",
        reviewStage: "district",
        rejectReason: "",
        rejectNote: "",
        reviewedBy: "",
        reviewedAt: null,
        ...(title ? { title: String(title).slice(0, 200) } : {}),
        ...(content ? { content: String(content) } : {}),
        ...(category ? { category } : {}),
        updatedAt: new Date(),
      },
    })

    // ردپای چرخه: رویداد ارسال مجدد + اطلاع به ارزیابان مرحله اول (رفع ایراد: بازگشت بی‌صدا)
    await db.newsEvent.create({
      data: { newsId: news.id, stage: "", action: "resubmitted", actorId: user.id, actorName: user.fullName, actorRole: user.role },
    })
    await notifyStageStaff("district", "🔄 خبر ویرایش‌شده به چرخه برگشت", `${news.title} — ${user.fullName}`, `news:${news.id}`)

    return NextResponse.json({ ok: true, message: `خبر ${news.code} ویرایش و مجدداً در چرخه بررسی قرار گرفت.` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ارسال مجدد" }, { status: 500 })
  }
}
