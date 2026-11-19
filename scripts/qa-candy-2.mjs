// رندر هدفمند: فرم ارسال + پروفایل + ادمین
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const PHONE = '09300500977'
const OUT = '/tmp/render/candy'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
const T = { timeout: 6000 }

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const start = page.locator('button:has-text("ورود به داشبورد")').first()
if (await start.count()) { await start.click(T).catch(() => {}); await page.waitForTimeout(600) }
const tel = page.locator('input[inputmode="tel"]').first()
if (await tel.count()) {
  await tel.fill(PHONE)
  await page.locator('button:has-text("ورود")').last().click(T).catch(() => {})
  await page.waitForTimeout(3200)
}

// فرم ارسال — FAB وسط nav
const fab = page.locator('nav button').nth(2)
await fab.click(T).catch((e) => console.log('fab fail', e.message))
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/10-submit-form.png` })
console.log('shot submit')

// اسکرول داخل دیالوگ برای بخش‌های پایینی
await page.mouse.wheel(0, 700)
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/11-submit-bottom.png` })
console.log('shot submit bottom')

// پروفایل
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const prof = page.locator('nav button:has-text("پروفایل")').first()
await prof.click(T).catch(() => {})
await page.waitForTimeout(1200)
await page.mouse.wheel(0, 1400)
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/12-profile-settings.png` })
console.log('shot profile')

// ادمین
await page.goto(BASE + '/admin', { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(1800)
await page.screenshot({ path: `${OUT}/13-admin.png` })
await page.mouse.wheel(0, 900)
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/14-admin-2.png` })
console.log('shot admin')

await browser.close()
console.log('done')
