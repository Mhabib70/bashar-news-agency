import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"
import { ROLE_LABELS } from "@/lib/domain"

// تقدیر خبرنگار در کانال ایتا — پیام تشویقی برای خبر منتشرشده
// (مثلاً «خبر هفته») با آمار بازدید اپ و واکنش‌های کانال.
// دسترسی: ادمین کل؛ کارشناس خبر با مجوز canSendEitaa.
const LINE = "━━━━━━━━━━━━━━━━━"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const newsId = Number(body?.newsId)
    if (!newsId) return NextResponse.json({ error: "پارامتر ناقص" }, { status: 400 })

    const sender = await activeUser(req)
    const allowed =
      sender?.role === "admin" ||
      (sender?.role === "specialist" && sender.status === "active" && sender.canSendEitaa)
    if (!sender || !allowed) {
      return NextResponse.json({ error: "اجازه ندارید — تقدیر در کانال برای ادمین کل و کارشناسِ دارای مجوز است." }, { status: 403 })
    }

    const token = process.env.BASHAR_EITAA_TOKEN ?? ""
    const channel = process.env.BASHAR_EITAA_CHANNEL ?? ""
    if (!token || !channel) {
      return NextResponse.json({ error: "ربات ایتا هنوز تنظیم نشده است (BASHAR_EITAA_TOKEN / BASHAR_EITAA_CHANNEL)." }, { status: 400 })
    }

    const news = await db.newsItem.findUnique({ where: { id: newsId }, include: { reporter: { select: { fullName: true } } } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })
    if (news.status !== "approved") {
      return NextResponse.json({ error: "تقدیر فقط برای خبر منتشرشده است" }, { status: 400 })
    }

    const text = [
      `🏅 تقدیر خبرنگار | خبرگزاری بسیج شهر رشت`,
      LINE,
      `«${news.title.trim()}»`,
      ``,
      `✍️ خبرنگار: ${news.reporter?.fullName ?? "همکار"}`,
      `👀 ${news.views.toLocaleString("fa-IR")} بازدید در اپ خبرگزاری`,
      `❤️ ${news.eitaaReactions.toLocaleString("fa-IR")} واکنش در کانال`,
      ``,
      `به این همکار فعالِ خبرگزاری خسته نباشید نمی‌گوییم؛ خوش‌آمد می‌گوییم به صفحه بعدی افتخار!`,
      LINE,
      `#خبرگزاری_بسیج_رشت #تقدیر`,
    ].join("\n")

    const send = () =>
      fetch(`https://eitaayar.ir/api/${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ chat_id: channel, text }),
        signal: AbortSignal.timeout(30000),
      }).catch(() => null)

    let r = await send()
    if (!r || !r.ok) {
      await new Promise((res) => setTimeout(res, 4000))
      r = await send()
    }
    const d = r ? await r.json().catch(() => ({})) : {}
    if (r && r.ok && d.ok !== false) {
      await db.newsEvent.create({
        data: {
          newsId: news.id,
          stage: "",
          action: "praised",
          actorId: sender.id,
          actorName: sender.fullName,
          actorRole: sender.role,
          note: `تقدیر خبرنگار در کانال ایتا توسط ${ROLE_LABELS[sender.role] ?? sender.role}`,
        },
      })
      return NextResponse.json({ ok: true, message: "پیام تقدیر در کانال ایتا ارسال شد." })
    }
    return NextResponse.json({ error: `ارسال تقدیر ناموفق بود: ${d.description || d.error || "خطای شبکه"}` }, { status: 502 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ارسال تقدیر" }, { status: 500 })
  }
}
