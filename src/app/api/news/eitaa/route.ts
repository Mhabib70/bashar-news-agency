import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { db } from "@/lib/db"
import { CATEGORY_LABELS, DISTRICT_LABELS, ROLE_LABELS } from "@/lib/domain"
import { toJalali, JALALI_MONTHS } from "@/lib/jalali"

// ارسال خبر به کانال ایتا — با حفظ الگوی متن + عکس خبر
// پیش‌نیاز (متغیرهای محیطی سرویس bashar در docker-compose):
//   BASHAR_EITAA_TOKEN    توکن ربات ایتا (از eitaayar.ir)
//   BASHAR_EITAA_CHANNEL  شناسه کانال مقصد (مثل @channel_name)
// رفتار:
//   - خبر بدون عکس → پیام متنی با الگوی کامل
//   - خبر با عکس → عکس + متن کامل به‌عنوان کپشن (نکته: API ایتا فایل را با فیلد «file» می‌پذیرد)
//     اگر متن از سقف کپشن بلندتر باشد → عکس با تیتر، سپس متن کامل در پیام بعدی
//   - خطای شبکه → یک تلاش مجدد خودکار
const CAPTION_MAX = 900

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

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
    const header = `📰 ${category} | خبرگزاری بسیج رشت`
    const footer = `👤 خبرنگار: ${reporter}${district ? ` · ${district}` : ""}\n🕐 ${dateStr} · کد ${news.code}\n\n#خبرگزاری_بسیج_رشت`
    const text = [header, ``, `${news.title}`, ``, `${news.content.trim()}`, ``, footer].join("\n")
    const shortCaption = [header, ``, `${news.title}`, ``, footer].join("\n")

    // ── ارسال‌کننده‌ها با یک تلاش مجدد ──
    const withRetry = async (fn: () => Promise<Response | null>): Promise<Response | null> => {
      let r = await fn()
      if (!r || !r.ok) {
        await new Promise((res) => setTimeout(res, 4000))
        r = await fn()
      }
      return r
    }

    const sendTextOnce = () =>
      fetch(`https://eitaayar.ir/api/${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ chat_id: channel, text, title: news.title }),
        signal: AbortSignal.timeout(30000),
      }).catch(() => null)

    const hasPhoto = news.mediaType === "photo" && news.mediaUrl.startsWith("/uploads/")
    const photoPath = hasPhoto ? path.join(process.cwd(), "public", news.mediaUrl) : null
    const ext = photoPath ? path.extname(photoPath).toLowerCase() : ""

    const sendPhotoOnce = async (caption: string): Promise<Response | null> => {
      if (!photoPath) return null
      try {
        const buf = await readFile(photoPath)
        const fd = new FormData()
        fd.set("chat_id", channel)
        fd.set("caption", caption)
        fd.set("file", new Blob([buf], { type: MIME_BY_EXT[ext] ?? "image/jpeg" }), `news${ext || ".jpg"}`)
        return await fetch(`https://eitaayar.ir/api/${token}/sendPhoto`, {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(45000),
        }).catch(() => null)
      } catch {
        return null
      }
    }

    const resultIsOk = (r: Response | null) => {
      if (!r || !r.ok) return false
      return true // پاسخ 2xx از eitaayar؛ خطای منطقی در body با ok:false می‌آید که پایین‌تر چک می‌شود
    }
    const bodyOf = async (r: Response | null) => (r ? await r.json().catch(() => ({})) : {}) as { ok?: boolean; description?: string; error?: string }

    // ── جریان ارسال ──
    if (hasPhoto) {
      const fullFits = text.length <= CAPTION_MAX
      const photoRes = await withRetry(() => sendPhotoOnce(fullFits ? text : shortCaption))
      const pd = await bodyOf(photoRes)

      if (photoRes && photoRes.ok && pd.ok !== false) {
        if (fullFits) {
          await recordEvent(news.id, sender.id, sender.fullName, sender.role)
          return NextResponse.json({ ok: true, message: "خبر با عکس و متن کامل به ایتا ارسال شد ✅" })
        }
        // متن بلند: عکس با تیتر رفت؛ متن کامل را در پیام بعدی بفرست
        const textRes = await withRetry(sendTextOnce)
        const td = await bodyOf(textRes)
        if (textRes && textRes.ok && td.ok !== false) {
          await recordEvent(news.id, sender.id, sender.fullName, sender.role)
          return NextResponse.json({ ok: true, message: "عکس خبر + متن کامل در دو پیام به ایتا ارسال شد ✅" })
        }
        await recordEvent(news.id, sender.id, sender.fullName, sender.role)
        return NextResponse.json({ ok: true, message: "عکس خبر به ایتا رسید اما متن کامل ارسال نشد — دوباره بزنید تا متن برود." })
      }

      // عکس ناموفق → حداقل متن برود
      const textRes = await withRetry(sendTextOnce)
      const td = await bodyOf(textRes)
      if (textRes && textRes.ok && td.ok !== false) {
        await recordEvent(news.id, sender.id, sender.fullName, sender.role)
        return NextResponse.json({ ok: true, message: "خبر به‌صورت متن ارسال شد ✅ (عکسش ارسال نشد)" })
      }
      return NextResponse.json({ error: `ارسال به ایتا ناموفق بود: ${pd.description || td.description || td.error || "خطای شبکه — دوباره تلاش کنید"}` }, { status: 502 })
    }

    // خبر بدون عکس
    const textRes = await withRetry(sendTextOnce)
    const td = await bodyOf(textRes)
    if (textRes && textRes.ok && td.ok !== false) {
      await recordEvent(news.id, sender.id, sender.fullName, sender.role)
      return NextResponse.json({ ok: true, message: "خبر با موفقیت به ایتا ارسال شد ✅" })
    }
    return NextResponse.json({ error: `ارسال به ایتا ناموفق بود: ${td.description || td.error || "خطای شبکه — دوباره تلاش کنید"}` }, { status: 502 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ارسال به ایتا" }, { status: 500 })
  }
}

async function recordEvent(newsId: number, actorId: string, actorName: string, actorRole: string) {
  await db.newsEvent.create({
    data: {
      newsId,
      stage: "",
      action: "sent_eitaa",
      actorId,
      actorName,
      actorRole,
      note: `ارسال به ایتا توسط ${ROLE_LABELS[actorRole] ?? actorRole}`,
    },
  })
}
