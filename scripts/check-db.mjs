import { createClient } from "@libsql/client"
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
const q = async (sql) => (await c.execute(sql)).rows
const users = await q(`SELECT id, fullName, role, status, district FROM User`)
console.log("USERS:", users.length); for (const u of users) console.log(" ", u.fullName, "|", u.role, "|", u.status, "|", u.district)
const news = await q(`SELECT id, code, title, status, reviewStage, district FROM NewsItem ORDER BY id DESC LIMIT 15`)
console.log("NEWS:", news.length); for (const n of news) console.log(" ", n.code, "|", n.status, "|", n.reviewStage, "|", String(n.title).slice(0,40))
