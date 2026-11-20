// QA بصری تغییرات: تالار/آموزش بالای خانه، حذف استوری، کارت‌های خبر Candy
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '0912-555-0203' // ادمین seed محلی
const OUT = '/tmp/render/ui3'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

// لاگین: کوکی سشن از درون مرورگر + uid در localStorage
const login = await fetch(BASE + '/api/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: ADMIN_PHONE }),
}).then((r) => r.json())
if (!login.ok) { console.error('LOGIN FAILED', JSON.stringify(login)); process.exit(3) }
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate(async (phone) => {
  await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
}, ADMIN_PHONE)
await page.evaluate((uid) => localStorage.setItem('newsapp_uid', uid), login.userId)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

// موقعیت عمودی تالار گفتگو نسبت به کارنامه هفتگی
const posForum = await page.locator('button:has-text("تالار گفتگو")').first().boundingBox()
const posRing = await page.locator('text=کارنامه عملکرد هفتگی').first().boundingBox()
console.log('forum top:', posForum?.y, '| weekly-card top:', posRing?.y, '| forum is above weekly:', (posForum?.y ?? 1e9) < (posRing?.y ?? 1e9))

// استوری باید غیب شده باشد
const storyCount = await page.locator('button:has-text("خبر شما")').count()
console.log('story "خبر شما" count (must be 0):', storyCount)

// تپش استوری‌های conic-gradient
const conic = await page.locator('[class*="conic-gradient"]').count()
console.log('conic-gradient story rings (must be 0):', conic)

// اسکرین‌شات خانه بالا
await page.screenshot({ path: `${OUT}/01-home-top.png` })
await page.mouse.wheel(0, 1200); await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/02-home-mid.png` })
await page.mouse.wheel(0, 1400); await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/03-home-feed.png` })

// تب اخبار (کارتابل من) — کارت‌های متحدالشکل
const newsBtn = page.locator('nav button').nth(1)
await newsBtn.click().catch(() => {})
await page.waitForTimeout(1800)
await page.screenshot({ path: `${OUT}/04-news-list.png` })

// کارنامه — StageChip/StatusChip
const tabAct = page.locator('nav button').nth(3)
await tabAct.click().catch(() => {})
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/05-activity.png` })

console.log('pageerrors:', errors.length ? errors : 'none')
await browser.close()
