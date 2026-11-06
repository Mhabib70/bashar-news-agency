// پیش‌نمایش سریع تالار v4 — اسکرین‌شات لابی + گفتگو برای بازبینی طراحی
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const OUT = '/home/z/my-project/download/screenshots/forum-v4-preview'
fs.mkdirSync(OUT, { recursive: true })

const shot = async (page, name, full = false) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  console.log(`shot ${name} ✓`)
}

const login = async (page, phone) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(700)
  await page.locator('input[inputmode="tel"]').first().fill(phone)
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(2500)
}

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await login(page, ADMIN_PHONE)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await shot(page, '01-lobby', true)
  await page.screenshot({ path: `${OUT}/01b-lobby-viewport.png` })

  // باز کردن اولین تاپیک
  const firstTopic = page.locator('button[aria-label^="باز کردن"]').first()
  if (await firstTopic.isVisible().catch(() => false)) {
    await firstTopic.click()
    await page.waitForTimeout(2000)
    const ta = page.locator('textarea').first()
    await ta.click()
    await ta.pressSequentially('سلام بچه‌ها! طراحی جدید تالار چطوره؟ نظرات‌تون رو با @امیرحسین میرمعزی در میان بگذارید.')
    await page.locator('button[aria-label="ارسال"]').click()
    await page.waitForTimeout(1800)
    await shot(page, '02-chat')
  }
  console.log('errors:', errors.length, errors.slice(0, 3))
  await browser.close()
}
run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
