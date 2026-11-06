// بررسی دقیق: دکمه ادمینی «سوال هفته» (aria-label) نباید برای خبرنگار دیده شود
import { chromium } from 'playwright'
const BASE = 'http://localhost:3000'
const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(700)
  await page.locator('input[inputmode="tel"]').first().fill('09131000911')
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(2500)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  const crownByAria = await page.locator('button[aria-label="سوال هفته"]').count()
  console.log('crown aria-label count for reporter (must be 0):', crownByAria)
  await browser.close()
  if (crownByAria !== 0) process.exit(2)
  console.log('CROWN OK — فقط ادمین می‌بیند')
}
run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
