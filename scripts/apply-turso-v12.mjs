// ارتقای idempotent اسکیمای Turso تا نسخه ۱.۲ (ستون avatar کاربر)
// اگر ستون از قبل باشد، تغییری اعمال نمی‌شود و فقط راستی‌آزمایی می‌شود.
import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error("MISSING_ENV — توکن Turso در .env نیست")
  process.exit(1)
}

const c = createClient({ url, authToken })

const info = await c.execute("PRAGMA table_info(User)")
const hasAvatar = info.rows.some((x) => x.name === "avatar")
if (!hasAvatar) {
  await c.execute(`ALTER TABLE "User" ADD COLUMN "avatar" TEXT NOT NULL DEFAULT ''`)
  console.log("avatar column ADDED")
} else {
  console.log("avatar column already exists")
}

const after = await c.execute("PRAGMA table_info(User)")
console.log("User cols:", after.rows.map((x) => x.name).join(","))
const users = await c.execute("SELECT COUNT(*) AS n FROM User")
console.log("users in turso:", users.rows[0].n)
process.exit(0)
