import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { BASE_LISTS } from "@/lib/domain"
import { notifyStaff } from "@/lib/server/upkeep"

// ثبت‌نام خبرنگار (سناریوی ۱: نام ← شماره ← سن ← تحصیلات ← حوزه ← پایگاه)
// مطابق ربات: اولین نفر ادمین کل می‌شود؛ بقیه «در انتظار تایید» تا تصمیم مدیر
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
    const existing = await db.user.findUnique({ where: { username } })
    if (existing?.status === "pending") {
      return NextResponse.json({ error: "ثبت‌نام شما قبلاً ثبت شده و در انتظار تایید مدیر است" }, { status: 409 })
    }
    if (existing?.status === "active") {
      return NextResponse.json({ error: "این شماره قبلاً ثبت‌نام کرده است" }, { status: 409 })
    }

    // راه‌اندازی سازمان: اولین کاربر ثبت‌نام‌شده، ادمین کل سازمان می‌شود
    const totalUsers = await db.user.count()
    const isFirst = totalUsers === 0
    const role = isFirst ? "admin" : "reporter"
    const status = isFirst ? "active" : "pending"

    const data = {
      username,
      fullName: String(fullName).slice(0, 80),
      role,
      status,
      district,
      base,
      phone: String(phone),
      age: String(age ?? ""),
      education: String(education ?? ""),
      levelKey: "rookie",
      rejectReason: "",
    }
    const user = existing
      ? await db.user.update({ where: { id: existing.id }, data, include: { notifSetting: true } })
      : await db.user.create({ data: { ...data, notifSetting: { create: {} } }, include: { notifSetting: true } })

    // اطلاع به کارمندان برای بررسی درخواست عضویت (_notify_new_signup ربات)
    if (status === "pending") {
      await notifyStaff({
        kind: "pending_user",
        title: "درخواست عضویت جدید",
        body: `${user.fullName} از ${base} (${district}) درخواست عضویت داده است. از بخش «کاربران» تصمیم بگیرید.`,
        ref: `user:${user.id}:signup`,
        district,
      })
    }

    return NextResponse.json({
      ok: true,
      userId: user.id,
      role,
      status,
      message:
        status === "active"
          ? `ثبت‌نام کامل شد. ${fullName} عزیز، شما به‌عنوان ادمین کل خبرگزاری سازمان راه‌اندازی شدید!`
          : `ثبت‌نام شما ثبت شد، ${fullName} عزیز! حساب شما پس از تایید مدیر فعال می‌شود.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ثبت‌نام" }, { status: 500 })
  }
}
