import { db } from "@/lib/db"
import { kindAllowed, inQuiet, type NotifFlags } from "./notif-utils"

// اعلان‌های نگهداری دوره‌ای (یادآوری ادمین، اعلان همگانی و…).
// منطق «ساعت سکوت» و پرچم‌های تنظیمات از notif-utils می‌آید.

async function activeUsersWithFlags() {
  const users = await db.user.findMany({
    where: { status: "active" },
    select: { id: true, role: true, district: true, notifSetting: true },
  })
  return users.map((u) => ({
    id: u.id,
    role: u.role,
    district: u.district,
    flags: {
      approvals: u.notifSetting?.approvals ?? true,
      rejections: u.notifSetting?.rejections ?? true,
      challenges: u.notifSetting?.challenges ?? true,
      broadcast: u.notifSetting?.broadcast ?? true,
      quietStart: u.notifSetting?.quietStart ?? "22:00",
      quietEnd: u.notifSetting?.quietEnd ?? "08:00",
    },
  }))
}

/**
 * ارسال اعلان به گروهی از کاربران فعال — با رعایت پرچم تنظیمات و ساعت سکوت.
 * برمی‌گرداند: چند رسید، چند به‌خاطر سکوت/تنظیمات رد شد.
 */
export async function notifyUsers(opts: {
  kind: string
  title: string
  body: string
  ref?: string
  /** نقش‌های هدف؛ پیش‌فرض همه */
  roles?: string[]
  /** رعایت پرچم تنظیمات و ساعت سکوت (پیش‌فرض: بله) */
  respectFlags?: boolean
}): Promise<{ sent: number; skipped: number }> {
  const users = await activeUsersWithFlags()
  const roles = opts.roles
  let sent = 0
  let skipped = 0
  const rows: { userId: string; kind: string; title: string; body: string; ref: string }[] = []
  for (const u of users) {
    if (roles && !roles.includes(u.role)) continue
    if (opts.respectFlags !== false && !kindAllowed(opts.kind, u.flags)) {
      skipped++
      continue
    }
    if (opts.respectFlags !== false && inQuiet(u.flags)) {
      skipped++
      continue
    }
    rows.push({ userId: u.id, kind: opts.kind, title: opts.title, body: opts.body, ref: opts.ref ?? "" })
    sent++
  }
  if (rows.length) await db.notification.createMany({ data: rows })
  return { sent, skipped }
}

/** اعلان هدفمند به کارمندان (ادمین‌ها + کارشناس‌ها + مدیر حوزهٔ همان حوزه) */
export async function notifyStaff(opts: {
  kind: string
  title: string
  body: string
  ref?: string
  district?: string
}): Promise<number> {
  const staff = await db.user.findMany({
    where: { status: "active", role: { in: ["admin", "specialist", "district_manager"] } },
    select: { id: true, role: true, district: true },
  })
  const targets = staff.filter(
    (s) => s.role !== "district_manager" || (opts.district && s.district === opts.district),
  )
  const seen = new Set<string>()
  const rows = targets
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .map((t) => ({ userId: t.id, kind: opts.kind, title: opts.title, body: opts.body, ref: opts.ref ?? "" }))
  if (rows.length) await db.notification.createMany({ data: rows })
  return rows.length
}
