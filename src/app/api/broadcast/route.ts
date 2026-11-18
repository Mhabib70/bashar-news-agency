import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUser } from "@/lib/server/notify"
import { activeUser } from "@/lib/server/session"

// پیام همگانی ادمین — با انتخاب مخاطب: همه / نقش‌ها / حوزه‌ها / پایگاه‌ها
// با احترام به فلگ broadcast و ساعت سکوت (سناریوی ۵ ربات)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, text, targets } = body ?? {}
    const admin = await activeUser(req)
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "فقط ادمین کل می‌تواند پیام همگانی بفرستد" }, { status: 403 })
    }
    if (!title || !text) return NextResponse.json({ error: "عنوان و متن پیام الزامی است" }, { status: 400 })

    // انتخاب مخاطبان: بدون targets = همهٔ اعضای فعال (رفتار قبلی)
    const roles: string[] = Array.isArray(targets?.roles) ? targets.roles.filter((r: unknown) => typeof r === "string") : []
    const districts: string[] = Array.isArray(targets?.districts) ? targets.districts.filter((d: unknown) => typeof d === "string") : []
    const bases: string[] = Array.isArray(targets?.bases) ? targets.bases.filter((b: unknown) => typeof b === "string") : []

    const all = await db.user.findMany({ where: { status: "active" }, select: { id: true, role: true, district: true, base: true } })
    const scoped = all.filter((u) => {
      if (roles.length && !roles.includes(u.role)) return false
      if (districts.length && !districts.includes(u.district)) return false
      if (bases.length && !bases.includes(u.base)) return false
      return true
    })
    if (scoped.length === 0) {
      return NextResponse.json({ error: "هیچ عضوی با این انتخاب‌ها یافت نشد — فیلتر مخاطبان را تغییر دهید" }, { status: 400 })
    }

    let sent = 0
    for (const u of scoped) {
      const ok = await notifyUser(u.id, "broadcast", `📣 ${String(title).slice(0, 80)}`, String(text).slice(0, 800), `broadcast:${Date.now()}`)
      if (ok) sent++
    }
    const scopeLabel = roles.length || districts.length || bases.length ? `مخاطبان انتخابی (${scoped.length} عضو)` : "همه اعضا"
    return NextResponse.json({ ok: true, sent, message: `پیام برای ${sent} عضو ارسال شد — ${scopeLabel} (تنظیمات اعلان و ساعت سکوت رعایت شد).` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ارسال پیام همگانی" }, { status: 500 })
  }
}
