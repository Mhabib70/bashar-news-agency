// اسکرین‌شات تالار در پوسته تاریک نئونی — دو قاب: فهرست + گفتگو
import { chromium } from 'playwright'
const BASE = 'http://localhost:3000'
const OUT = '/home/z/my-project/download/screenshots/forum-v3'
const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('theme', 'dark'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(700)
  await page.locator('input[inputmode="tel"]').first().fill('09300500977')
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(2600)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2300)
  await page.screenshot({ path: `${OUT}/16-dark-topics.png` })
  console.log('dark topics ✓')
  await page.locator('button:has-text("موفق‌ترین پوشش خبری این هفته")').first().click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/17-dark-thread.png` })
  console.log('dark thread ✓')
  await browser.close()
}
run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
