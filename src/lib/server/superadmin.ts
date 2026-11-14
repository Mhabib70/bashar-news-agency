// تعیین «ادمین کل سامانه» — فقط در سمت سرور.
// شمارهٔ محافظت‌شده نباید در باندل کلاینت لو برود، پس این منطق
// از src/lib/domain (که هم در کلاینت استفاده می‌شود) به اینجا منتقل شد.
//
// مقدار از متغیر محیطی SUPER_ADMIN_PHONE خوانده می‌شود؛
// اگر تنظیم نشده باشد، مقدار پیش‌فرض تاریخی استفاده می‌شود
// (این فایل فقط در سرور اجرا می‌شود، پس نشتی به کلاینت ندارد).

const FALLBACK_SUPER_ADMIN_PHONE = "09300500977"

export const SUPER_ADMIN_PHONE = (process.env.SUPER_ADMIN_PHONE?.trim() || FALLBACK_SUPER_ADMIN_PHONE).replace(/\D/g, "")
export const SUPER_ADMIN_NORM = SUPER_ADMIN_PHONE.slice(-10)

/** نرمال‌سازی شماره برای مقایسه: ارقام فارسی→انگلیسی، حذف غیررقم‌ها، ۱۰ رقم آخر */
export function normalizePhone(raw: unknown): string {
  const fa = String(raw ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  const digits = fa.replace(/\D/g, "")
  return digits.length > 10 ? digits.slice(-10) : digits
}

/** آیا این شماره، شمارهٔ ادمین کل سامانه است؟ */
export function isSuperAdminPhone(raw: unknown): boolean {
  return normalizePhone(raw) === SUPER_ADMIN_NORM
}
