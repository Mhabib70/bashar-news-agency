import { db } from "@/lib/db"

// ثبت رویدادهای امنیتی/مدیریتی در لاگ زندهٔ ادمین کل (پنل پایش راهبردی)
// هرگز خطا بالا نمی‌دهد — لاگ نباید عملیات اصلی را بشکند
export async function logSec(entry: {
  kind: string
  title: string
  detail?: string
  actorName?: string
  phone?: string
  severity?: "info" | "warn" | "danger"
}) {
  try {
    await db.securityLog.create({
      data: {
        kind: entry.kind,
        title: entry.title.slice(0, 120),
        detail: (entry.detail ?? "").slice(0, 300),
        actorName: (entry.actorName ?? "").slice(0, 60),
        phone: entry.phone ?? "",
        severity: entry.severity ?? "info",
      },
    })
  } catch (e) {
    console.error("security-log failed:", e)
  }
}

// پاک‌سازی لاگ‌های خیلی قدیمی (بیش از ۵۰۰ رکورد آخر حفظ می‌شود)
export async function pruneSecurityLog() {
  try {
    const cnt = await db.securityLog.count()
    if (cnt > 800) {
      const old = await db.securityLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: 500,
        select: { id: true },
      })
      if (old.length) {
        await db.securityLog.deleteMany({ where: { id: { in: old.map((r) => r.id) } } })
      }
    }
  } catch {
    /* بی‌اهمیت */
  }
}
