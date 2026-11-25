// QA صفحات ثانویه: ورود چندمرحله‌ای، کارتابل بررسی، فرم ثبت خبر، انجمن، آموزش
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09113010001'
const DM_PHONE = '09113021001' // مدیر حوزه
const OUT = '/home/z/my-project/download/screenshots'
fs.mkdirSync(OUT, { recursive: true })

const login = async (page, phone) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const body0 = await page.locator('body').innerText()
  if (body0.includes('کارنامه عملکرد') || body0.includes('آخرین اخبار')) return
  const enter = page.locator('button:has-text("ورود به داشبورد تحریریه")').first()
  if (await enter.isVisible()) { await enter.click(); await page.waitForTimeout(1000) }
  const phoneInput = page.locator('input[inputmode="tel"], input[inputmode="numeric"], input[type="tel"]').first()
  await phoneInput.waitFor({ timeout: 10000 })
  await phoneInput.fill(phone)
  await page.waitForTimeout(300)
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(3000)
}

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // ورود admin و گرفتن صفحهٔ ثبت خبر (FAB) و کارنامه
  await login(page, ADMIN_PHONE)
  const fab = page.locator('button:has-text("ثبت خبر")').last()
  if (await fab.isVisible()) { await fab.click(); await page.waitForTimeout(2000); await page.screenshot({ path: `${OUT}/d1-submit.png` }) }
  await page.keyboard.press('Escape').catch(() => {})
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  const act = page.locator('button:has-text("کارنامه")').last()
  if (await act.isVisible()) { await act.click(); await page.waitForTimeout(1800); await page.screenshot({ path: `${OUT}/d2-activity.png` }) }

  // انجمن و آموزش (مسیر مستقل)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/d3-forum.png` })
  await page.goto(BASE + '/training', { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/d4-training.png` })

  // ادمین
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/d5-admin.png` })

  console.log('errors:', errors.length, errors.slice(0, 2))
  await browser.close()
  console.log('DONE')
}

run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
