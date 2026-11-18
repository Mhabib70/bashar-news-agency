import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizePhone } from "@/lib/domain"
import { activeUser } from "@/lib/server/session"

// دفترچهٔ مخاطبان رسانه‌های بیرونی — فقط ادمین کل
// GET               → فهرست مخاطبان + وضعیت تنظیم پیامک/ایتا
// POST create       → ثبت مخاطب { fullName, mediaName, phone, note }
// POST update       → ویرایش { id, fullName, mediaName, phone, note }
// POST delete       → حذف { id }
// POST sms          → پیام انبوه به انتخاب‌شده‌ها { ids: number[], text }
//                     پیامک با «فراز اس‌ام‌اس / آی‌پنل» (پترن‌محور) ارسال می‌شود:
//                     SMS_API_URL (پیش‌فرض api2.ippanel.com با-code)، SMS_API_KEY، SMS_SENDER
// ارسال خبر منتخب به ایتا از همین بخش با /api/news/eitaa انجام می‌شود (کانال یکطرفه است).

export async function GET(req: NextRequest) {
  const admin = await activeUser(req)
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }
  const contacts = await db.externalContact.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({
    contacts: contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    smsConfigured: !!(process.env.SMS_API_KEY ?? process.env.SMS_IPPANEL_APIKEY),
    eitaaConfigured: !!(process.env.BASHAR_EITAA_TOKEN && process.env.BASHAR_EITAA_CHANNEL),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = String(body?.action ?? "create")
    const admin = await activeUser(req)
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    if (action === "create" || action === "update") {
      const fullName = String(body.fullName ?? "").trim().slice(0, 60)
      const mediaName = String(body.mediaName ?? "").trim().slice(0, 60)
      const note = String(body.note ?? "").trim().slice(0, 200)
      const phoneRaw = String(body.phone ?? "").trim()
      const phone = normalizePhone(phoneRaw)
      if (fullName.length < 2) return NextResponse.json({ error: "نام مخاطب را وارد کنید" }, { status: 400 })
      if (phone.length !== 10) return NextResponse.json({ error: "شماره موبایل معتبر وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹)" }, { status: 400 })
      if (action === "create") {
        const c = await db.externalContact.create({ data: { fullName, mediaName, phone: phoneRaw, note } })
        return NextResponse.json({ ok: true, id: c.id, message: `${fullName} به دفترچهٔ مخاطبان اضافه شد.` })
      }
      const id = Number(body.id)
      const existing = await db.externalContact.findUnique({ where: { id } })
      if (!existing) return NextResponse.json({ error: "مخاطب یافت نشد" }, { status: 404 })
      await db.externalContact.update({ where: { id }, data: { fullName, mediaName, phone: phoneRaw, note } })
      return NextResponse.json({ ok: true, message: `${fullName} به‌روزرسانی شد.` })
    }

    if (action === "delete") {
      const id = Number(body.id)
      const c = await db.externalContact.findUnique({ where: { id } })
      if (!c) return NextResponse.json({ error: "مخاطب یافت نشد" }, { status: 404 })
      await db.externalContact.delete({ where: { id } })
      return NextResponse.json({ ok: true, message: `${c.fullName} حذف شد.` })
    }

    if (action === "sms") {
      const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : []
      const text = String(body.text ?? "").trim().slice(0, 500)
      if (text.length < 5) return NextResponse.json({ error: "متن پیامک را وارد کنید" }, { status: 400 })
      const targets = await db.externalContact.findMany({
        where: ids.length ? { id: { in: ids } } : {},
        orderBy: { createdAt: "desc" },
      })
      if (targets.length === 0) return NextResponse.json({ error: "هیچ مخاطبی انتخاب نشده" }, { status: 400 })

      // ارسال با پترن‌محور آی‌پنل/فراز — پترن باید متغیر {message} داشته باشد؛
      // اگر پترن چندمتغیره است مقادیر را از env دلخواه می‌گذاریم.
      const apiKey = process.env.SMS_API_KEY ?? process.env.SMS_IPPANEL_APIKEY ?? ""
      const apiUrl = process.env.SMS_API_URL ?? "https://api2.ippanel.com/api/v1/sms/pattern/send/with-code"
      const sender = process.env.SMS_SENDER ?? ""
      const patternCode = process.env.SMS_PATTERN_CODE ?? ""
      if (!apiKey || !patternCode) {
        return NextResponse.json({
          error: "پیامک هنوز تنظیم نشده است. در فایل .env سرور سه متغیر را بگذارید و اپ را restart کنید: SMS_API_KEY (کلید API فراز/آی‌پنل)، SMS_PATTERN_CODE (کد پترن دارای متغیر message)، SMS_SENDER (شماره خط).",
        }, { status: 400 })
      }

      let okCount = 0
      const failures: string[] = []
      for (const t of targets) {
        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: apiKey, apikey: apiKey },
            body: JSON.stringify({
              code: patternCode,
              sender,
              recipient: [t.phone],
              values: { message: text, name: t.fullName },
            }),
            signal: AbortSignal.timeout(20000),
          })
          const d = (await res.json().catch(() => ({}))) as { status?: string; code?: number | string }
          if (res.ok && d.status !== "error" && d.code !== 400 && d.code !== "400") okCount++
          else failures.push(`${t.fullName}: ${d.status ?? d.code ?? res.status}`)
        } catch {
          failures.push(`${t.fullName}: خطای شبکه`)
        }
      }
      const msg = failures.length
        ? `پیامک برای ${okCount} نفر از ${targets.length} نفر رسید؛ ناموفق: ${failures.slice(0, 3).join(" | ")}`
        : `پیامک برای ${okCount} مخاطب ارسال شد.`
      return NextResponse.json({ ok: okCount > 0, sent: okCount, failures, message: msg })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت مخاطبان" }, { status: 500 })
  }
}
