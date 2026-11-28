import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizePhone } from "@/lib/domain"
import { attachSession, createSessionToken } from "@/lib/server/session"
import { logSec, pruneSecurityLog } from "@/lib/server/security-log"

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

    const users = await db.user.findMany({ select: { id: true, fullName: true, phone: true, status: true, active: true, pinHash: true } })
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
    if (u.active === false) {
      void logSec({ kind: "login_failed", title: "تلاش ورود به حساب غیرفعال", detail: `شماره ${norm} — حساب توسط ادمین غیرفعال شده`, phone: norm, severity: "warn" })
      return NextResponse.json(
        { ok: false, code: "inactive", error: "دسترسی حساب شما موقتاً توسط ادمین کل غیرفعال شده است." },
        { status: 403 },
      )
    }

    // حساب‌های دارای رمز دوم (PIN): در همین مرحله نشست صادر نمی‌شود؛
    // کلاینت باید PIN را بگیرد و به /api/login/pin برود.
    if (u.pinHash) {
      return NextResponse.json({ ok: true, pinRequired: true, fullName: u.fullName })
    }

    void logSec({ kind: "login", title: "ورود موفق به سامانه", detail: u.fullName, phone: norm, actorName: u.fullName })
    void pruneSecurityLog()
    // توکن در بدنهٔ پاسخ هم برمی‌گردد: اگر مرورگر کوکی را ذخیره نکرد
    // (آیفریم پیش‌نمایش)، کلاینت آن را در localStorage نگه می‌دارد و
    // در درخواست‌های بعدی با هدر x-session-token می‌فرستد.
    const res = NextResponse.json({ ok: true, userId: u.id, fullName: u.fullName, token: createSessionToken(u.id) })
    return attachSession(res, u.id, req)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: "خطا در ورود — دوباره تلاش کنید" }, { status: 500 })
  }
}
