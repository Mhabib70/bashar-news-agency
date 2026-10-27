import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { BASE_LISTS } from "@/lib/domain"

// ثبت‌نام خبرنگار جدید (سناریوی ۱: نام ← شماره ← سن ← تحصیلات ← حوزه ← پایگاه)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, phone, age, education, district, base } = body ?? {}
    if (!fullName || !phone || !district || !base) {
      return NextResponse.json({ error: "نام، شماره تماس، حوزه و پایگاه الزامی است" }, { status: 400 })
    }
    const validBases = BASE_LISTS[district] ?? []
    if (!validBases.includes(base)) {
      return NextResponse.json({ error: "پایگاه انتخابی با حوزه همخوانی ندارد" }, { status: 400 })
    }
    const username = `user_${String(phone).replace(/\D/g, "").slice(-8) || Date.now()}`
    const dup = await db.user.findUnique({ where: { username } })
    if (dup) return NextResponse.json({ error: "این شماره قبلاً ثبت‌نام کرده است" }, { status: 409 })

    // راه‌اندازی سازمان: اولین کاربر ثبت‌نام‌شده، ادمین کل سازمان می‌شود
    const totalUsers = await db.user.count()
    const role = totalUsers === 0 ? "admin" : "reporter"

    const user = await db.user.create({
      data: {
        username,
        fullName: String(fullName).slice(0, 80),
        role,
        status: "active",
        district,
        base,
        phone: String(phone),
        age: String(age ?? ""),
        education: String(education ?? ""),
        levelKey: "rookie",
        notifSetting: { create: {} },
      },
    })
    return NextResponse.json({
      ok: true,
      userId: user.id,
      role,
      message:
        role === "admin"
          ? `ثبت‌نام کامل شد. ${fullName} عزیز، شما به‌عنوان ادمین کل خبرگزاری سازمان راه‌اندازی شدید!`
          : `ثبت‌نام کامل شد. ${fullName} عزیز، به خبرگزاری سازمان خوش آمدید!`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 })
  }
}
