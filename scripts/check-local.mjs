import Database from "better-sqlite3"
const db = new Database("/home/z/my-project/db/custom.db")
try {
  const users = db.prepare(`SELECT fullName, role, status, district FROM User`).all()
  console.log("USERS:", users.length); for (const u of users) console.log(" ", u.fullName, "|", u.role, "|", u.status, "|", u.district)
  const news = db.prepare(`SELECT code, title, status, reviewStage, district FROM NewsItem ORDER BY id DESC LIMIT 15`).all()
  console.log("NEWS:", news.length); for (const n of news) console.log(" ", n.code, "|", n.status, "|", n.reviewStage, "|", n.title.slice(0,40))
} catch(e) { console.log("ERR", e.message) }
