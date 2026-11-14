import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizePhone } from "@/lib/domain"
import { attachSession } from "@/lib/server/session"

// ورود با شماره موبایل — تنها راه ورود به حساب.
// هیچ فهرستی از حساب‌ها نمایش داده نمی‌شود؛ هر کاربر فقط با شماره خودش وارد می‌شود.
// (ارقام فارسی/انگلیسی و پیش‌شماره ۹۸ به‌صورت خودکار نرمال می‌شوند)
// پس از ورود موفق، یک کوکی نشست HttpOnly صادر می‌شود که هویت کاربر را
// در همهٔ درخواست‌های بعدی به‌صورت غیرقابل‌جعلی مشخص می‌کند.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const norm = normalizePhone(body?.phone ?? "")
    if (norm.length !== 10) {
      return NextResponse.json(
        { ok: false, error: "شماره موبایل معتبر وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹)" },
        { status: 400 },
      )
    }

    const users = await db.user.findMany({ select: { id: true, fullName: true, phone: true, status: true } })
    const u = users.find((x) => normalizePhone(x.phone) === norm)
    if (!u) {
      return NextResponse.json(
        { ok: false, code: "not_found", error: "حسابی با این شماره یافت نشد. شماره را بررسی کنید یا ثبت‌نام کنید." },
        { status: 404 },
      )
    }
    if (u.status === "pending") {
      return NextResponse.json(
        { ok: false, code: "pending", error: "درخواست عضویت شما در انتظار تایید ادمین کل است." },
        { status: 403 },
      )
    }
    if (u.status === "rejected") {
      return NextResponse.json(
        { ok: false, code: "rejected", error: "درخواست عضویت شما تایید نشده است." },
        { status: 403 },
      )
    }

    const res = NextResponse.json({ ok: true, userId: u.id, fullName: u.fullName })
    return attachSession(res, u.id, req)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: "خطا در ورود — دوباره تلاش کنید" }, { status: 500 })
  }
}
