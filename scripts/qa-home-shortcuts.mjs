// QA: دکمه‌های تالار گفتگو و آموزش در صفحه اصلی + مسیرها
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // ورود با شماره ادمین کل → uid به‌صورت پویا (مقاوم به ریست دیتابیس)
  const loginRes = await fetch(BASE + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: ADMIN_PHONE }),
  })
  const loginData = await loginRes.json()
  if (!loginData.ok) { console.error('LOGIN FAILED:', JSON.stringify(loginData)); process.exit(3) }
  const ADMIN_UID = loginData.userId
  console.log('logged-in uid:', ADMIN_UID, '| name:', loginData.fullName)

  // ورود مستقیم با uid ادمین کل (دسترسی بالا برای دیدن کل خانه)
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate((uid) => localStorage.setItem('newsapp_uid', uid), ADMIN_UID)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // ۱) صفحه اصلی — دکمه‌های جدید باید پیدا شوند
  const forumBtn = page.locator('button:has-text("تالار گفتگو")').first()
  const trainingBtn = page.locator('button:has-text("آموزش")').first()
  const forumVisible = await forumBtn.isVisible()
  const trainingVisible = await trainingBtn.isVisible()
  console.log('forum card visible:', forumVisible, '| training card visible:', trainingVisible)
  await page.screenshot({ path: '/tmp/render/home-1-cards.png' })

  // ۲) کلیک تالار گفتگو → صفحه انجمن
  await forumBtn.click()
  await page.waitForTimeout(2200)
  const url1 = page.url()
  console.log('after forum click:', url1)
  await page.screenshot({ path: '/tmp/render/home-2-forum.png' })

  // ۳) برگشت به خانه و کلیک آموزش
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await trainingBtn.click()
  await page.waitForTimeout(2200)
  const url2 = page.url()
  console.log('after training click:', url2)
  await page.screenshot({ path: '/tmp/render/home-3-training.png' })

  // ۴) تب پروفایل — نباید دکمه‌های قبلی آنجا باشند
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const profNav = page.locator('nav button, [class*="bottom"] button, button:has-text("پروفایل")').last()
  try { await profNav.click({ timeout: 3000 }) } catch {}
  await page.waitForTimeout(1000)
  const body = await page.locator('body').innerText()
  const profileHasOld = /خروج از حساب/.test(body) && /تالار گفتگو/.test(body)
  console.log('profile still has تالار گفتگو button?', profileHasOld)

  console.log('pageerrors:', errors.length, errors.slice(0, 3))
  await browser.close()
  if (!forumVisible || !trainingVisible) process.exit(2)
}

run().catch((e) => { console.error('QA FAIL:', e.message); process.exit(1) })
