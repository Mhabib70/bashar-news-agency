import { db } from "@/lib/db"
import { tehranMinutesNow, tehranYMD, parseHM } from "./tz"

// نگاشت نوع اعلان → فلگ تنظیمات کاربر (معادل flags ربات)
const KIND_FLAG: Record<string, "approvals" | "rejections" | "challenges" | "broadcast"> = {
  approved: "approvals",
  badge: "approvals",
  review: "approvals",
  rejected: "rejections",
  challenge: "challenges",
  challenge_reminder: "challenges",
  rank: "challenges",
  broadcast: "broadcast",
}

// آیا الان داخل بازه سکوت کاربر هستیم؟ (معادل _in_quiet ربات)
export function inQuietWindow(quietStart: string, quietEnd: string, now = new Date()): boolean {
  const s = parseHM(quietStart)
  const e = parseHM(quietEnd)
  if (s === null || e === null || s === e) return false
  const cur = tehranMinutesNow(now)
  if (s > e) return cur >= s || cur < e
  return s <= cur && cur < e
}

// پایان بعدی بازه سکوت به‌صورت لحظه UTC
function nextQuietEnd(quietEnd: string, now = new Date()): Date {
  const mins = parseHM(quietEnd) ?? 8 * 60
  const { y, m, d } = tehranYMD(now)
  let end = new Date(Date.UTC(y, m - 1, d, 0, 0) - 3.5 * 3600 * 1000 + mins * 60 * 1000)
  if (end.getTime() <= now.getTime()) end = new Date(end.getTime() + 24 * 3600 * 1000)
  return end
}

export type NotifyKind = keyof typeof KIND_FLAG | "user_status" | "demotion" | "points"

/**
 * ایجاد اعلان درون‌برنامه‌ای برای یک کاربر.
 * - فلگ تنظیمات: اگر کاربر آن نوع را غیرفعال کرده باشد، ارسال نمی‌شود.
 * - ساعت سکوت: اعلان‌های غیرضروری به پایان سکوت موکول می‌شوند (deliveredAt).
 * - kinds همیشگی (user_status/demotion/points): بدون فیلتر.
 */
export async function notifyUser(
  userId: string,
  kind: NotifyKind,
  title: string,
  body = "",
  ref = "",
  opts?: { force?: boolean },
): Promise<boolean> {
  const s = await db.notifSetting.findUnique({ where: { userId } })
  const flag = KIND_FLAG[kind]
  if (flag && !opts?.force) {
    const enabled = s ? s[flag] : true
    if (!enabled) return false
  }
  let deliveredAt = new Date()
  if (!opts?.force && s && inQuietWindow(s.quietStart, s.quietEnd)) {
    deliveredAt = nextQuietEnd(s.quietEnd)
  }
  await db.notification.create({ data: { userId, kind, title, body: body.slice(0, 500), ref, deliveredAt } })
  return true
}

/** اعلان به همه کاربران فعال با فلگ مشخص (معادل _notify_users ربات) */
export async function notifyActiveUsers(
  kind: NotifyKind,
  title: string,
  body = "",
  ref = "",
  opts?: { includeStaff?: boolean },
): Promise<number> {
  const users = await db.user.findMany({
    where: { status: "active" },
    select: { id: true, role: true },
  })
  let sent = 0
  for (const u of users) {
    if (opts?.includeStaff === false && (u.role === "admin" || u.role === "specialist")) continue
    const ok = await notifyUser(u.id, kind, title, body, ref)
    if (ok) sent++
  }
  return sent
}

/** اعلان به ارزیابانِ مرحله مشخص + ادمین‌ها (خبر جدید در صف بررسی) */
export async function notifyStageStaff(stage: string, title: string, body: string, ref: string): Promise<number> {
  const roleForStage: Record<string, string> = { district: "district_manager", specialist: "specialist", admin: "admin" }
  const roles = [roleForStage[stage], "admin"].filter(Boolean)
  const staff = await db.user.findMany({ where: { role: { in: roles }, status: "active" }, select: { id: true } })
  let sent = 0
  for (const s of staff) {
    const ok = await notifyUser(s.id, "review", title, body, ref)
    if (ok) sent++
  }
  return sent
}
