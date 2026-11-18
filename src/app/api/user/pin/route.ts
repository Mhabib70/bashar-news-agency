import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"
import { hashPin, verifyPin, isValidPin } from "@/lib/server/pin"

// مدیریت PIN دوم حساب — فعال‌سازی / تغییر / حذف
// action: "set" (فعال‌سازی یا تغییر — تغییر نیازمند PIN فعلی) | "remove" (نیازمند PIN فعلی)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action ?? "set")
    const user = await activeUser(req)
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })

    const u = await db.user.findUnique({ where: { id: user.id }, select: { pinHash: true } })
    if (!u) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

    if (action === "remove") {
      if (!u.pinHash) return NextResponse.json({ error: "PIN فعالی وجود ندارد" }, { status: 400 })
      if (!verifyPin(String(body?.currentPin ?? ""), u.pinHash)) {
        return NextResponse.json({ error: "PIN فعلی اشتباه است" }, { status: 401 })
      }
      await db.user.update({ where: { id: user.id }, data: { pinHash: "" } })
      return NextResponse.json({ ok: true, message: "PIN حذف شد — ورود فقط با شماره موبایل است." })
    }

    // set / change
    const newPin = String(body?.newPin ?? "").trim()
    if (!isValidPin(newPin)) {
      return NextResponse.json({ error: "PIN باید ۴ تا ۶ رقم باشد" }, { status: 400 })
    }
    if (u.pinHash && !verifyPin(String(body?.currentPin ?? ""), u.pinHash)) {
      return NextResponse.json({ error: "PIN فعلی اشتباه است" }, { status: 401 })
    }
    await db.user.update({ where: { id: user.id }, data: { pinHash: hashPin(newPin) } })
    return NextResponse.json({ ok: true, message: "PIN ذخیره شد — از این پس هنگام ورود پرسیده می‌شود." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در تنظیم PIN" }, { status: 500 })
  }
}
