// راستی‌آزمایی لایو: تالار/آموزش بالا، حذف استوری، کارت‌های خبر Candy
import { chromium } from 'playwright'

const BASE = 'http://80.91.208.240'
const ADMIN_PHONE = '09300500977' // اکانت تست لایو — ادمین بدون PIN
const OUT = '/tmp/render/live3'
import fs from 'fs'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

// لاگین از درون مرورگر تا کوکی سشن ست شود
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate(async (phone) => {
  await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
}, ADMIN_PHONE)
await page.waitForTimeout(800)
// uid از state واقعی بخوان
const uid = await page.evaluate(async () => {
  const s = await fetch('/api/state', { credentials: 'same-origin' }).then((r) => r.json())
  return s?.user?.id ?? null
})
console.log('live uid:', uid)
if (uid) await page.evaluate((u) => localStorage.setItem('newsapp_uid', u), uid)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2800)

const posForum = await page.locator('button:has-text("تالار گفتگو")').first().boundingBox()
const posRing = await page.locator('text=کارنامه عملکرد هفتگی').first().boundingBox()
console.log('forum top:', posForum?.y, '| weekly top:', posRing?.y, '| forum above weekly:', (posForum?.y ?? 1e9) < (posRing?.y ?? 1e9))
const story = await page.locator('button:has-text("خبر شما")').count()
const conic = await page.locator('[class*="conic-gradient"]').count()
console.log('story count (must 0):', story, '| conic rings (must 0):', conic)
await page.screenshot({ path: `${OUT}/01-live-home.png` })
await page.mouse.wheel(0, 1600); await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/02-live-feed.png` })

// تب اخبار
const bottomNav = page.locator('nav').last()
await bottomNav.locator('button').filter({ hasText: /^اخبار$/ }).first().click().catch((e) => console.log('nav click fail', e.message))
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/03-live-news.png` })

console.log('pageerrors:', errors.length ? errors : 'none')
await browser.close()
