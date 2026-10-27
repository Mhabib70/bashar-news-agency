// پاک‌سازی ادمین آزمونی تست بصری + هر داده آزمونی باقی‌مانده (داده واقعی حفظ می‌شود)
import { createClient } from "@libsql/client"

const url = process.env.DATABASE_URL // file:...
const c = createClient({ url })

const KEEP_ID = "cmvqwgsh1000bnf2ed3wsvbr9" // ادمین واقعی (محمد حبیب زاده فرد)

const users = await c.execute("SELECT id, fullName, role FROM User")
const doomed = users.rows.filter((u) => u.id !== KEEP_ID)
console.log("users total:", users.rows.length, "| deleting:", doomed.map((u) => `${u.id}(${u.fullName})`).join(", ") || "none")

for (const u of doomed) {
  await c.execute(`DELETE FROM NewsItem WHERE reporterId = '${u.id}'`)
  for (const t of ["PointsLog", "UserBadge", "ChallengeParticipation", "Draft", "NotifSetting"]) {
    await c.execute(`DELETE FROM ${t} WHERE userId = '${u.id}'`)
  }
  await c.execute(`DELETE FROM Notification WHERE userId = '${u.id}' OR ref = 'user:${u.id}'`)
  await c.execute(`DELETE FROM User WHERE id = '${u.id}'`)
}

// ایمن‌سازی: اعلان‌های آزمونی برچسب‌دار هم پاک شوند
await c.execute("DELETE FROM Notification WHERE title LIKE '%آزمون%' OR body LIKE '%آزمایشی%'")

const after = await c.execute("SELECT COUNT(*) n FROM User")
const news = await c.execute("SELECT COUNT(*) n FROM NewsItem")
const notif = await c.execute("SELECT COUNT(*) n FROM Notification")
console.log("AFTER — users:", after.rows[0].n, "news:", news.rows[0].n, "notifications:", notif.rows[0].n)
process.exit(0)
