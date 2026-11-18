// QA بصری تم قرمز/سفید — اسکرین‌شات از همه صفحه‌ها
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const PHONE = process.env.ADMIN_PHONE || '09300500977'
const OUT = '/tmp/render/red'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
const T = { timeout: 5000 }

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

// ۱) صفحه خوش‌آمد (قبل از لاگین)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await shot('01-welcome')

// ۲) لاگین ادمین: شروع کن → شماره → ورود
const start = page.locator('button:has-text("شروع کن")').first()
if (await start.count()) { await start.click(T).catch(() => {}); await page.waitForTimeout(800) }
const tel = page.locator('input[inputmode="tel"]').first()
if (await tel.count()) {
  await tel.fill(PHONE)
  await page.locator('button:has-text("ورود")').last().click(T).catch(() => {})
  await page.waitForTimeout(3500)
}
await shot('02-home')

// ۳) تب خبرها از نوار پایین
await tryClick('button:has-text("اخبار"), a:has-text("اخبار")')
await shot('03-news')

// ۴) تالار گفتگو — مسیر مستقیم
await page.goto(BASE + '/forum', { waitUntil: 'networkidle' }).catch(() => {})
await shot('04-forum')

// ۵) آکادمی/آموزش — مسیر مستقیم
await page.goto(BASE + '/training', { waitUntil: 'networkidle' }).catch(() => {})
await shot('05-training')

// ۶) ارسال خبر (دکمه مرکزی کهربایی)
await page.goto(BASE + '/', { waitUntil: 'networkidle' }).catch(() => {})
await tryClick('button:has-text("ارسال")')
await shot('06-submit')

// ۷) پروفایل از نوار پایین
await tryClick('button:has-text("پروفایل"), a:has-text("پروفایل")')
await shot('07-profile')

// ۸) پنل مدیریت
await page.goto(BASE + '/admin', { waitUntil: 'networkidle' }).catch(() => {})
await shot('08-admin')

await browser.close()
console.log('done ->', OUT)
