// پاک‌سازی کامل داده‌های اپ برای شروع تازه سازمان (لوکال db/custom.db)
import { createClient } from "@libsql/client"

const c = createClient({ url: process.env.DATABASE_URL })
const tables = [
  "PointsLog", "UserBadge", "ChallengeParticipation", "Challenge",
  "NewsEvent", "NewsItem", "Draft", "Notification", "NotifSetting", "User",
]
for (const t of tables) {
  await c.execute(`DELETE FROM "${t}"`)
}
const u = await c.execute("SELECT COUNT(*) AS n FROM User")
const n = await c.execute("SELECT COUNT(*) AS n FROM NewsItem")
console.log("users:", u.rows[0].n, "| news:", n.rows[0].n, "— CLEAN")
process.exit(0)
