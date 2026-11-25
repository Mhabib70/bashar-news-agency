// QA یکدستی Candy: ورود → خانه → اخبار → کارنامه → پروفایل → تیره → بررسی
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09113010001'
const OUT = '/home/z/my-project/download/screenshots'
fs.mkdirSync(OUT, { recursive: true })

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // ورود (اگر نشست نیست)
  const body0 = await page.locator('body').innerText()
  if (!body0.includes('کارنامه عملکرد') && !body0.includes('آخرین اخبار')) {
    const enter = page.locator('button:has-text("ورود به داشبورد تحریریه")').first()
    if (await enter.isVisible()) { await enter.click(); await page.waitForTimeout(1200) }
    const phoneInput = page.locator('input[inputmode="tel"], input[inputmode="numeric"], input[type="tel"]').first()
    await phoneInput.waitFor({ timeout: 10000 })
    await phoneInput.fill(ADMIN_PHONE)
    await page.waitForTimeout(300)
    await page.locator('button:has-text("ورود")').last().click()
    await page.waitForTimeout(3200)
  }

  // ۱) خانه
  await page.screenshot({ path: `${OUT}/c1-home.png` })
  const home = await page.locator('body').innerText()
  console.log('home: استوری?', home.includes('استوری'), '| تالار بالای صفحه?', home.includes('تالار گفتگو'))

  // ۲) تب اخبار از باتم‌نو
  const newsBtn = page.locator('button:has-text("اخبار")').last()
  if (await newsBtn.isVisible()) { await newsBtn.click(); await page.waitForTimeout(1800) }
  await page.screenshot({ path: `${OUT}/c2-news.png` })

  // ۳) کارنامه
  const actBtn = page.locator('button:has-text("کارنامه")').last()
  if (await actBtn.isVisible()) { await actBtn.click(); await page.waitForTimeout(1800) }
  await page.screenshot({ path: `${OUT}/c3-activity.png` })

  // ۴) پروفایل
  const profBtn = page.locator('button:has-text("پروفایل")').last()
  if (await profBtn.isVisible()) { await profBtn.click(); await page.waitForTimeout(1800) }
  await page.screenshot({ path: `${OUT}/c4-profile.png` })

  // ۵) تیره
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/c5-profile-dark.png` })

  // برگشت خانه در تیره
  await page.locator('button:has-text("خانه")').last().click().catch(() => {})
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/c6-home-dark.png` })

  console.log('page errors:', errors.length, errors.slice(0, 2))
  await browser.close()
  console.log('DONE')
}

run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
