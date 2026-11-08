import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { EDUCATION_LABELS } from "@/lib/domain"
import { getOrgUnits } from "@/lib/server/orgunits"
import { notifyUser } from "@/lib/server/notify"
import { isSuperAdminPhone } from "@/lib/server/superadmin"
import { attachSession } from "@/lib/server/session"

// ثبت‌نام خبرنگار جدید (سناریوی ۱: نام ← شماره ← سن ← تحصیلات ← حوزه ← پایگاه)
// فقط و فقط ثبت‌نام با شماره ادمین کل سامانه → ادمین فعال؛
// همهٔ ثبت‌نام‌های دیگر (حتی اولین نفر) → خبرنگار با وضعیت «در انتظار تایید ادمین»
// استثنا: ثبت‌نام با شماره ادمین کل سامانه → همیشه ادمین فعال، بدون نیاز به حوزه و پایگاه
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, phone, age, education, district, base } = body ?? {}

    const superAdmin = isSuperAdminPhone(phone)
    const boss = superAdmin

    if (!fullName || !phone || (!boss && (!district || !base))) {
      return NextResponse.json({ error: "نام، شماره تماس، حوزه و پایگاه الزامی است" }, { status: 400 })
    }
    if (String(fullName).trim().length < 3) {
      return NextResponse.json({ error: "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد" }, { status: 400 })
    }
    const phoneDigits = String(phone).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "")
    if (phoneDigits.length < 10 || phoneDigits.length > 12) {
      return NextResponse.json({ error: "شماره تماس معتبر وارد کنید" }, { status: 400 })
    }
    // حوزه/پایگاه بر اساس فهرست زنده سازمان (قابل ویرایش از پنل) اعتبارسنجی می‌شود
    const units = await getOrgUnits()
    const validBases = units.find((d) => d.key === district)?.bases ?? []
    if (!boss && (district === "" || !units.some((d) => d.key === district))) {
      return NextResponse.json({ error: "حوزه فعالیت معتبر انتخاب کنید" }, { status: 400 })
    }
    if (!boss && !validBases.includes(base)) {
      return NextResponse.json({ error: "پایگاه انتخابی با حوزه همخوانی ندارد" }, { status: 400 })
    }
    const username = `user_${phoneDigits.slice(-8) || Date.now()}`
    const dup = await db.user.findUnique({ where: { username } })
    if (dup) return NextResponse.json({ error: "این شماره قبلاً ثبت‌نام کرده است" }, { status: 409 })
    if (education && !EDUCATION_LABELS[education]) {
      return NextResponse.json({ error: "مقطع تحصیلی نامعتبر است" }, { status: 400 })
    }

    const role = boss ? "admin" : "reporter"
    const status = boss ? "active" : "pending"

    const user = await db.user.create({
      data: {
        username,
        fullName: String(fullName).trim().slice(0, 80),
        role,
        status,
        district: boss ? "" : district,
        base: boss ? "" : base,
        phone: String(phone),
        age: String(age ?? ""),
        education: String(education ?? ""),
        levelKey: "rookie",
        notifSetting: { create: {} },
      },
    })

    if (boss) {
      // ادمین کل بلافاصله وارد می‌شود — نشست او صادر می‌شود
      const res = NextResponse.json({
        ok: true,
        userId: user.id,
        role,
        status,
        message: `ثبت‌نام کامل شد. ${fullName} عزیز، شما به‌عنوان ادمین کل خبرگزاری بسیج شهر رشت راه‌اندازی شدید!`,
      })
      return attachSession(res, user.id, req)
    }

    // اعلان به ادمین‌ها: درخواست عضویت جدید
    const admins = await db.user.findMany({ where: { role: "admin", status: "active" }, select: { id: true } })
    for (const a of admins) {
      await notifyUser(a.id, "user_status", "👥 درخواست عضویت جدید", `${fullName} — ${base}`, `user-pending:${user.id}`, { force: true })
    }
    return NextResponse.json({
      ok: true,
      userId: user.id,
      role,
      status,
      message: `${fullName} عزیز، درخواست عضویت شما ثبت شد و پس از تایید ادمین کل فعال می‌شود.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 })
  }
}
