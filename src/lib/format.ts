// قالب‌بندی فارسی: ارقام، تاریخ شمسی، زمان نسبی
export function fa(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
}

export const toFa = fa

export function faNum(n: number): string {
  return fa(n.toLocaleString("en-US"))
}

export function faTime(n: number | string): string {
  return fa(String(n)).replace(/,/g, "،")
}

const jDate = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" })
const jDateFull = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" })
const jDay = new Intl.DateTimeFormat("fa-IR", { weekday: "short" })

export function jalali(d: string | Date, full = false): string {
  const date = typeof d === "string" ? new Date(d) : d
  return (full ? jDateFull : jDate).format(date)
}

export function jalaliDay(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d
  return jDay.format(date)
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "همین حالا"
  if (m < 60) return `${fa(m)} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${fa(h)} ساعت پیش`
  const d = Math.floor(h / 24)
  if (d < 7) return `${fa(d)} روز پیش`
  return jalali(iso)
}

export function durFmt(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${fa(m)} دقیقه`
  if (m === 0) return `${fa(h)} ساعت`
  return `${fa(h)}س ${fa(m)}د`
}

export function untilFmt(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "پایان یافته"
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${fa(Math.max(1, Math.floor(diff / 60000)))} دقیقه مانده`
  if (h < 24) return `${fa(h)} ساعت مانده`
  return `${fa(Math.floor(h / 24))} روز مانده`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0] ?? "").join(" ")
}
