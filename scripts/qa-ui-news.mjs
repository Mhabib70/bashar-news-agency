// QA تب اخبار و کارنامه — کارت‌های متحدالشکل Candy
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '0912-555-0203'
const OUT = '/tmp/render/ui3'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

const login = await fetch(BASE + '/api/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: ADMIN_PHONE }),
}).then((r) => r.json())
if (!login.ok) { console.error('LOGIN FAILED'); process.exit(3) }
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate(async (phone) => {
  await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
}, ADMIN_PHONE)
await page.evaluate((uid) => localStorage.setItem('newsapp_uid', uid), login.userId)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)

// کلیک روی تب «اخبار» در باتم‌نو موبایل (آخرین nav = باتم‌نو)
const bottomNav = page.locator('nav').last()
const newsBtn = bottomNav.locator('button').filter({ hasText: /^اخبار$/ }).first()
await newsBtn.click().catch((e) => console.log('click news fail', e.message))
await page.waitForTimeout(2000)
const hasFilter = await page.locator('button:has-text("در بررسی")').count()
console.log('news tab loaded (filter chips found):', hasFilter > 0)
await page.screenshot({ path: `${OUT}/10-news-list.png` })
await page.mouse.wheel(0, 900); await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/11-news-list-more.png` })

// کارنامه
const actBtn = bottomNav.locator('button').filter({ hasText: /^کارنامه$/ }).first()
await actBtn.click().catch((e) => console.log('click activity fail', e.message))
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/12-activity.png` })

console.log('pageerrors:', errors.length ? errors : 'none')
await browser.close()
