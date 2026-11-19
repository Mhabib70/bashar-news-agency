// QA حالت تیره + شیت چالش‌ها + خوانندهٔ خبر
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
await page.waitForTimeout(1600)
const start = page.locator('button:has-text("ورود به داشبورد")').first()
if (await start.count()) { await start.click(T).catch(() => {}); await page.waitForTimeout(800) }
const tel = page.locator('input[inputmode="tel"]').first()
if (await tel.count()) {
  await tel.fill(PHONE)
  await page.locator('button:has-text("ورود")').last().click(T).catch(() => {})
  await page.waitForTimeout(4000)
}

// حالت تیره
await page.evaluate(() => document.documentElement.classList.add('dark'))
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/30-dark-home.png` })
console.log('shot dark home')
const NAV = 'nav[aria-label="ناوبری اصلی"]'
await page.locator(NAV + ' button:has-text("کارنامه")').first().click(T).catch(() => {})
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/31-dark-activity.png` })
console.log('shot dark activity')
await page.evaluate(() => document.documentElement.classList.remove('dark'))

// شیت چالش‌ها (از home: دکمهٔ بنر چالش / یا SideNav در موبایل نیست — از تب کارنامه دکمهٔ چالش)
await page.locator(NAV + ' button:has-text("خانه")').first().click(T).catch(() => {})
await page.waitForTimeout(1200)
const chal = page.locator('button:has-text("شرکت در چالش")').first()
if (await chal.count()) {
  await chal.click(T).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/32-challenges-sheet.png` })
  console.log('shot challenges sheet')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

await browser.close()
console.log('done')
