// رندر بصری تم جدید — اسکرین‌شات صفحات کلیدی
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const PHONE = process.env.ADMIN_PHONE || '09300500977'
const OUT = '/tmp/render/candy'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
const T = { timeout: 6000 }

const shot = async (name) => {
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}
const tryClick = async (sel) => {
  const el = page.locator(sel).first()
  if (await el.count()) { await el.click(T).catch(() => {}); return true }
  return false
}

// ۱) اسپلش (قبل از لاگین)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await shot('01-welcome')

// ۲) لاگین ادمین
const start = page.locator('button:has-text("ورود به داشبورد")').first()
if (await start.count()) { await start.click(T).catch(() => {}); await page.waitForTimeout(700) }
const tel = page.locator('input[inputmode="tel"]').first()
if (await tel.count()) {
  await tel.fill(PHONE)
  await page.locator('button:has-text("ورود")').last().click(T).catch(() => {})
  await page.waitForTimeout(3500)
}
await shot('02-home')

// ۳) تب اخبار (کارتابل) — باتم‌نو موبایل (نه سایدبار دسکتاپ)
const NAV = 'nav[aria-label="ناوبری اصلی"]'
await tryClick(NAV + ' button:has-text("اخبار")')
await shot('03-news')

// ۴) فرم ارسال
await page.goto(BASE + '/', { waitUntil: 'networkidle' }).catch(() => {})
await tryClick(NAV + ' button:nth(2)')
await shot('04-submit')

// ۵) کارنامه
await tryClick(NAV + ' button:has-text("کارنامه")')
await shot('05-activity')

// ۶) پروفایل
await tryClick(NAV + ' button:has-text("پروفایل")')
await shot('06-profile')

// ۷) پنل ادمین
await page.goto(BASE + '/admin', { waitUntil: 'networkidle' }).catch(() => {})
await shot('07-admin')

// ۸) تالار گفتگو
await page.goto(BASE + '/forum', { waitUntil: 'networkidle' }).catch(() => {})
await shot('08-forum')

// ۹) آموزش
await page.goto(BASE + '/training', { waitUntil: 'networkidle' }).catch(() => {})
await shot('09-training')

await browser.close()
console.log('done ->', OUT)
