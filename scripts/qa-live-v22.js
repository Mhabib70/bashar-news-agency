// QA زنده نسخه ۲.۲ — اسکرین‌شات صفحه ورود و فید ادمین از سرور production محلی
// اجرا: node scripts/qa-live-v22.js
import { chromium } from "playwright"

const base = process.env.QA_BASE || "http://127.0.0.1:3000"
const b = await chromium.launch()
const ctx = await b.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "fa-IR",
})
const p = await ctx.newPage()
const errors = []
p.on("pageerror", (e) => errors.push(String(e)))

// ۱) صفحه ورود
await p.goto(base + "/", { waitUntil: "networkidle", timeout: 30000 })
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(1200)
await p.screenshot({ path: "/tmp/qa-v22-welcome.png" })

// ۲) ورود به‌عنوان ادمین کل و فید اجتماعی
await p.evaluate(() => localStorage.setItem("newsapp_uid", "u_admin"))
await p.reload({ waitUntil: "networkidle" })
await p.waitForTimeout(1800)
await p.screenshot({ path: "/tmp/qa-v22-feed.png" })

console.log("pageerrors:", errors.length ? errors.slice(0, 3) : "none")
await b.close()
