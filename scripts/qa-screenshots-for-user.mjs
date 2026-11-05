// اسکرین‌شات واقعی از جریان کاربر: خوش‌آمد → ورود → صفحه اصلی با کارت‌های جدید
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const OUT = '/home/z/my-project/download/screenshots'
fs.mkdirSync(OUT, { recursive: true })

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  // ۱) صفحه خوش‌آمد (همان چیزی که کاربر اول می‌بیند)
  const resp = await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  console.log('HTTP status:', resp.status())
  console.log('Cache-Control (server → browser):', resp.headers()['cache-control'] || '(none)')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/01-welcome.png` })
  console.log('shot 01-welcome ✓')

  // ۲) کلیک «شروع کن» → دیالوگ ورود
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/02-login-dialog.png` })
  console.log('shot 02-login-dialog ✓')

  // ۳) تایپ شماره و ورود
  const phoneInput = page.locator('input[inputmode="tel"]').first()
  await phoneInput.fill(ADMIN_PHONE)
  await page.waitForTimeout(400)
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/03-home.png` })
  console.log('shot 03-home ✓')

  // ۴) بررسی کارت‌های جدید در صفحه اصلی
  const body = await page.locator('body').innerText()
  const hasForumCard = body.includes('تالار گفتگو')
  const hasTrainingCard = body.includes('آموزش')
  console.log('home has تالار گفتگو card:', hasForumCard, '| has آموزش card:', hasTrainingCard)

  // ۵) کلیک روی کارت تالار گفتگو
  const forumCard = page.locator('button:has-text("تالار گفتگو")').first()
  if (await forumCard.isVisible()) {
    await forumCard.click()
    await page.waitForTimeout(2500)
    console.log('after forum click URL:', page.url())
    await page.screenshot({ path: `${OUT}/04-forum.png` })
    console.log('shot 04-forum ✓')
  }

  // ۶) برگشت به خانه → کلیک آموزش
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const trainingCard = page.locator('button:has-text("آموزش")').first()
  if (await trainingCard.isVisible()) {
    await trainingCard.click()
    await page.waitForTimeout(2500)
    console.log('after training click URL:', page.url())
    await page.screenshot({ path: `${OUT}/05-training.png` })
    console.log('shot 05-training ✓')
  }

  console.log('page errors:', errors.length, errors.slice(0, 3))
  await browser.close()
  if (!hasForumCard || !hasTrainingCard) { console.error('CARDS NOT VISIBLE'); process.exit(2) }
  console.log('ALL OK')
}

run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
