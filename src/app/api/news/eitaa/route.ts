import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { CATEGORY_LABELS, DISTRICT_LABELS, ROLE_LABELS } from "@/lib/domain"
import { toJalali, JALALI_MONTHS } from "@/lib/jalali"

// ارسال خبر به کانال ایتا — با حفظ الگوی متن خبر
// پیش‌نیاز (متغیرهای محیطی سرویس bashar در docker-compose):
//   BASHAR_EITAA_TOKEN    توکن ربات ایتا (از @eitaa_bot)
//   BASHAR_EITAA_CHANNEL  شناسه کانال مقصد (مثل channel_name@ یا شناسه عددی)
// ارسال از طریق API رسمی eitaayar انجام می‌شود؛ متن plain ارسال می‌گردد تا
// خط‌به‌خط و ساختار الگوی خبر دقیقاً همان‌طور که هست حفظ شود.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, newsId } = body ?? {}
    if (!userId || !newsId) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }

    const sender = await db.user.findUnique({ where: { id: userId } })
    if (!sender || !["admin", "specialist"].includes(sender.role) || sender.status !== "active") {
      return NextResponse.json({ error: "فقط ادمین کل و کارشناس خبر می‌توانند به ایتا ارسال کنند" }, { status: 403 })
    }

    const token = process.env.BASHAR_EITAA_TOKEN ?? ""
    const channel = process.env.BASHAR_EITAA_CHANNEL ?? ""
    if (!token || !channel) {
      return NextResponse.json(
        { error: "ربات ایتا هنوز تنظیم نشده است. توکن ربات (BASHAR_EITAA_TOKEN) و شناسه کانال (BASHAR_EITAA_CHANNEL) را در فایل .env.production سرور وارد و دوباره deploy کنید." },
        { status: 400 },
      )
    }

    const news = await db.newsItem.findUnique({ where: { id: Number(newsId) }, include: { reporter: true } })
    if (!news) return NextResponse.json({ error: "خبر یافت نشد" }, { status: 404 })

    // ── الگوی متن خبر برای ایتا ──
    const j = toJalali(news.createdAt.getFullYear(), news.createdAt.getMonth() + 1, news.createdAt.getDate())
    const dateStr = `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`
    const category = CATEGORY_LABELS[news.category] ?? "خبر"
    const district = DISTRICT_LABELS[news.district] ?? news.district
    const reporter = news.reporter?.fullName ?? "خبرنگار"

    const text = [
      `📰 ${category} | خبرگزاری بسیج رشت`,
      ``,
      `${news.title}`,
      ``,
      `${news.content.trim()}`,
      ``,
      `👤 خبرنگار: ${reporter}${district ? ` · ${district}` : ""}`,
      `🕐 ${dateStr} · کد ${news.code}`,
      ``,
      `#خبرگزاری_بسیج_رشت`,
    ].join("\n")

    const apiRes = await fetch(`https://eitaayar.ir/api/${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ chat_id: channel, text, title: news.title }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null)

    if (!apiRes || !apiRes.ok) {
      const detail = apiRes ? await apiRes.text().catch(() => "") : "عدم دسترسی به سرور ایتا"
      return NextResponse.json({ error: `ارسال به ایتا ناموفق بود: ${detail.slice(0, 160) || "خطای شبکه"}` }, { status: 502 })
    }
    const data = (await apiRes.json().catch(() => ({}))) as { ok?: boolean; error?: string; description?: string }
    if (data.ok === false) {
      return NextResponse.json({ error: `ایتا خطا داد: ${data.description ?? data.error ?? "نامشخص"}` }, { status: 502 })
    }

    await db.newsEvent.create({
      data: {
        newsId: news.id,
        stage: "",
        action: "sent_eitaa",
        actorId: sender.id,
        actorName: sender.fullName,
        actorRole: sender.role,
        note: `ارسال به ایتا توسط ${ROLE_LABELS[sender.role] ?? sender.role}`,
      },
    })

    return NextResponse.json({ ok: true, message: "خبر با موفقیت به ایتا ارسال شد ✅" })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ارسال به ایتا" }, { status: 500 })
  }
}
