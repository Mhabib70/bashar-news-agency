// اسکرین‌شات کارنامه جدید + پروفایل + فرم — چرخهٔ سریع
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const PHONE = process.env.ADMIN_PHONE || '09113010001'
const OUT = '/tmp/render/candy'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
const T = { timeout: 10000 }
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 250)))

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
const start = page.locator('button:has-text("ورود به داشبورد")').first()
if (await start.count()) { await start.click(T).catch(() => {}); await page.waitForTimeout(900) }
const tel = page.locator('input[inputmode="tel"]').first()
if (await tel.count()) {
  await tel.fill(PHONE)
  await page.locator('button:has-text("ورود")').last().click(T).catch(() => {})
  await page.waitForTimeout(4000)
}

const NAV = 'nav[aria-label="ناوبری اصلی"]'
await page.locator(NAV + ' button:has-text("کارنامه")').first().click(T).catch((e) => console.log('activity click fail'))
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/20-activity-top.png` })
console.log('shot activity top')
await page.mouse.wheel(0, 1100)
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/21-activity-mid.png` })
console.log('shot activity mid')
await page.mouse.wheel(0, 1100)
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/22-activity-bottom.png` })
console.log('shot activity bottom')

await browser.close()
console.log('done')
