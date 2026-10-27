// اعمال اسکیمای Prisma روی دیتابیس ابری Turso
import { createClient } from "@libsql/client"
import { readFileSync } from "node:fs"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url || !authToken) {
  console.error("MISSING_ENV")
  process.exit(1)
}

const sql = readFileSync(new URL("./turso-schema.sql", import.meta.url), "utf8")
const client = createClient({ url, authToken })

// شمارش جداول پیش از اعمال
const before = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
)
console.log("TABLES_BEFORE:", before.rows.map((r) => r.name).join(",") || "(empty)")

await client.executeMultiple(sql)

const after = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
)
console.log("TABLES_AFTER:", after.rows.map((r) => r.name).join(","))
console.log("SCHEMA_APPLIED_OK")
process.exit(0)
