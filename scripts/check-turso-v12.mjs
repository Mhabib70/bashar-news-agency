// بررسی وضعیت اسکیمای Turso: جداول و ستون‌های کلیدی v1.2
import { createClient } from "@libsql/client"

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
console.log("TABLES:", tables.rows.map((x) => x.name).join(","))

for (const t of ["User", "NewsItem", "NewsEvent", "Notification"]) {
  try {
    const info = await c.execute(`PRAGMA table_info("${t}")`)
    console.log(`${t}:`, info.rows.map((x) => x.name).join(","))
  } catch (e) {
    console.log(`${t}: ERROR ${e.message}`)
  }
}
const users = await c.execute("SELECT COUNT(*) AS n FROM User")
const news = await c.execute("SELECT COUNT(*) AS n FROM NewsItem")
console.log("users:", users.rows[0].n, "| news:", news.rows[0].n)
process.exit(0)
