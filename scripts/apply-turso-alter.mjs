// اعمال ALTER اسکیما روی Turso + راستی‌آزمایی
import { createClient } from "@libsql/client"
import { readFileSync } from "node:fs"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error("MISSING_ENV")
  process.exit(1)
}

const c = createClient({ url, authToken })
await c.executeMultiple(readFileSync(new URL("./turso-alter.sql", import.meta.url), "utf8"))

const tables = await c.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Notification','NewsItem')"
)
console.log("TURSO_TABLES:", tables.rows.map((x) => x.name).join(","))
const cols = await c.execute("PRAGMA table_info(NewsItem)")
console.log("mediaUrl col:", cols.rows.some((x) => x.name === "mediaUrl"));
const notifCols = await c.execute("PRAGMA table_info(Notification)")
console.log("deliveredAt col:", notifCols.rows.some((x) => x.name === "deliveredAt"))
const users = await c.execute("SELECT COUNT(*) AS n FROM User")
console.log("users in turso:", users.rows[0].n)
process.exit(0)
