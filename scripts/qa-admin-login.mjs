// QA زنده: ورود ادمین کل با شماره ۰۹۳۰۰۵۰۰۹۷۷ — دقیقاً مسیر کاربر
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  // ۱) صفحه خوش‌آمد و باز کردن دیالوگ ورود
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: '/tmp/render/qa-admin-1-welcome.png' })
  console.log('page title:', (await page.title()).trim())
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(800)

  // ۲) تایپ شماره ادمین کل و ورود
  const phoneInput = page.locator('input[inputmode="tel"]').first()
  await phoneInput.fill(ADMIN_PHONE)
  await page.screenshot({ path: '/tmp/render/qa-admin-2-filled.png' })
  const loginBtn = page.locator('button:has-text("ورود")').last()
  await loginBtn.click()
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '/tmp/render/qa-admin-3-after-login.png' })

  // ۳) چک اینکه وارد شدیم (نه پیام خطا)
  const body = await page.locator('body').innerText()
  const failed = body.includes('یافت نشد') || body.includes('ورود ناموفق')
  console.log('after-login failed?', failed)
  console.log('welcome toast?', body.includes('خوش آمدی'))
  console.log('url now:', page.url())
  console.log('has admin sections?', body.includes('مدیریت') || body.includes('ادمین'))

  // ۴) اسکرول فید + اسکرین‌شات
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: '/tmp/render/qa-admin-4-feed.png' })

  console.log('pageerrors:', errors.length, errors.slice(0, 3))
  await browser.close()
  if (failed) process.exit(2)
}

run().catch((e) => { console.error('QA FAIL:', e.message); process.exit(1) })
