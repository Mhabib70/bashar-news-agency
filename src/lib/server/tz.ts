// محاسبات زمانی به وقت ایران (Asia/Tehran, UTC+3:30 — بدون ساعت تابستانی)
// رفع ایراد: مرز «روز» قبلاً با UTC محاسبه می‌شد که برای ایران ۳:۳۰ ساعت خطا داشت.

export function tehranYMD(d: Date = new Date()): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
  const [y, m, dd] = parts.split("-").map(Number)
  return { y, m, d: dd }
}

// کلید روز جلالی‌شده به وقت تهران: "YYYY-MM-DD"
export function tehranDayKey(d: Date = new Date()): string {
  const { y, m, d: day } = tehranYMD(d)
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// لحظه UTC نیمه‌شب تهرانِ روزِ داده‌شده
export function tehranDayStart(d: Date = new Date()): Date {
  const { y, m, d: day } = tehranYMD(d)
  // نیمه‌شب تهران = 20:30 UTC روز قبل (UTC+3:30)
  return new Date(Date.UTC(y, m - 1, day) - 3.5 * 3600 * 1000)
}

// دقیقه فعلی روز به وقت تهران (0..1439)
export function tehranMinutesNow(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
  const [h, m] = parts.split(":").map(Number)
  return h * 60 + m
}

// "HH:MM" → دقیقه؛ ورودی نامعتبر → null
export function parseHM(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1]), mm = Number(m[2])
  if (h > 23 || mm > 59) return null
  return h * 60 + mm
}
