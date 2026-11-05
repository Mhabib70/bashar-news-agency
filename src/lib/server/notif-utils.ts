// ابزار مشترک اعلان‌ها — بدون وابستگی (state.ts و upkeep.ts هر دو استفاده می‌کنند)
export type NotifFlags = {
  approvals: boolean
  challenges: boolean
  broadcast: boolean
  rejections: boolean
  quietStart: string
  quietEnd: string
}

/** ساعت سکوت (معادل _in_quiet ربات) */
export function inQuiet(s: Pick<NotifFlags, "quietStart" | "quietEnd">, now = new Date()): boolean {
  const mins = (t: string) => {
    const [hh, mm] = t.split(":").map((x) => Number(x) || 0)
    return hh * 60 + mm
  }
  const start = mins(s.quietStart || "22:00")
  const end = mins(s.quietEnd || "08:00")
  const cur = now.getHours() * 60 + now.getMinutes()
  if (start === end) return false
  if (start > end) return cur >= start || cur < end
  return start <= cur && cur < end
}

/** آیا این نوع اعلان با تنظیمات کاربر مجاز است؟ (معادل پرچم‌های ربات) */
export function kindAllowed(kind: string, f: NotifFlags): boolean {
  if (kind === "broadcast") return f.broadcast
  if (kind === "challenge_new" || kind === "rank_update" || kind === "reminder") return f.challenges
  if (kind === "rejected") return f.rejections
  if (kind === "approved") return f.approvals
  return true // pending_user / system / points
}
