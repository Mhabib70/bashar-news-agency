import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { db } from "@/lib/db"
import { CATEGORY_LABELS, DISTRICT_LABELS, ROLE_LABELS } from "@/lib/domain"
import { toJalali, JALALI_MONTHS } from "@/lib/jalali"
import { activeUser } from "@/lib/server/session"

// ارسال خبر به کانال ایتا — با قالب مجله‌ای تمیز + عکس خبر
// دسترسی: ادمین کل همیشه؛ کارشناس خبر فقط با اجازهٔ صریح ادمین کل (canSendEitaa)
// متغیرهای محیطی:
//   BASHAR_EITAA_TOKEN    توکن ربات ایتا (از eitaayar.ir)
//   BASHAR_EITAA_CHANNEL  شناسه کانال مقصد (مثل @channel_name)
// رفتار:
//   - خبر با عکس → عکس + متن کامل به‌عنوان کپشن (فیلد فایل در API ایتا «file» است)
//     اگر متن از سقف کپشن بلندتر باشد → عکس با تیتر، سپس متن کامل در پیام بعدی
//   - خبر بدون عکس → پیام متنی با همان قالب
//   - خطای شبکه → یک تلاش مجدد خودکار
const CAPTION_MAX = 900

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

// ── پاراگراف‌بندی متن خبر: خطوط موجود حفظ می‌شوند و پاراگراف‌های
//    یک‌تکهٔ بلند به جمله‌های خوانا (حدود ۲ جمله) شکسته می‌شوند.
function formatParagraphs(raw: string): string {
  const clean = (t: string) => t.replace(/[ \t]+/g, " ").trim()
  const out: string[] = []
  for (const chunk of raw.split(/\n+/)) {
    const text = clean(chunk)
    if (!text) continue
    if (text.length <= 240) {
      out.push(text)
      continue
    }
    const sentences = text.split(/(?<=[.!?؟…])\s+/).filter(Boolean)
    let buf = ""
    for (const s of sentences) {
      if (buf && (buf + " " + s).length > 240) {
        out.push(buf.trim())
        buf = s
      } else {
        buf = buf ? buf + " " + s : s
      }
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out.join("\n\n")
}

// ── قالب مجله‌ای پیام ──
const LINE = "━━━━━━━━━━━━━━━━━"

function buildMessage(
  news: { title: string; content: string; category: string; district: string; code: string; createdAt: Date },
  reporter: string,
  withBody: boolean,
): string {
  const j = toJalali(news.createdAt.getFullYear(), news.createdAt.getMonth() + 1, news.createdAt.getDate())
  const dateStr = `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`
  const category = CATEGORY_LABELS[news.category] ?? "خبر"
  const district = DISTRICT_LABELS[news.district] ?? news.district

  const head = [`خبرگزاری بسیج شهر رشت`, LINE, `📰 ${category}`, ``, `«${news.title.trim()}»`]
  const body = withBody ? [``, formatParagraphs(news.content)] : []
  const foot = [
    ``,
    LINE,
    `✍️ خبرنگار: ${reporter}${district ? ` · ${district}` : ""}`,
    `🗓 ${dateStr} | کد خبر: ${news.code}`,
    `#خبرگزاری_بسیج_رشت`,
  ]
  return [...head, ...body, ...foot].join("\n")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsId } = body ?? {}
    if (!newsId) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }

    const sender = await activeUser(req)
    const allowed =
      sender?.role === "admin" ||
      (sender?.role === "specialist" && sender.status === "active" && sender.canSendEitaa)
    if (!sender || !allowed) {
      return NextResponse.json(
        { error: "اجازه ندارید. ارسال به ایتا فقط برای ادمین کل و کارشناسی که ادمین به او اجازه داده فعال است." },
        { status: 403 },
      )
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
    if (news.status !== "approved") {
      return NextResponse.json(
        { error: "این خبر هنوز چرخه بررسی را کامل نکرده است. اول «تایید نهایی و انتشار» را بزنید؛ ارسال به ایتا آخرین مرحله است." },
        { status: 400 },
      )
    }

    const reporter = news.reporter?.fullName ?? "خبرنگار"
    const text = buildMessage(news, reporter, true)
    const shortCaption = buildMessage(news, reporter, false)

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
        body: new URLSearchParams({ chat_id: channel, text }),
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
        // متن بلند: عکس با تیتر رفت؛ متن کامل در پیام بعدی
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
