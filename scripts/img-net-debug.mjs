// دیباگ شبکه‌ای لود عکس پیوست
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
page.on('requestfailed', (r) => { if (r.url().includes('uploads')) console.log('FAILED:', r.url(), r.failure()?.errorText) })
page.on('response', (r) => { if (r.url().includes('uploads')) console.log('RESPONSE:', r.status(), r.url(), JSON.stringify(r.headers()['content-type'])) })
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)) })
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('newsapp_uid', 'cmw30ejqz0000ojjxn3emltdg'))
await page.goto('http://localhost:3000/forum', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.locator('button:has-text("کلاس تصویری اصول خبرنویسی — جلسه دوم")').first().click()
await page.waitForTimeout(3000)
const imgs = page.locator('img[alt="پیوست تصویری"]')
const n = await imgs.count()
if (n > 0) {
  const src = await imgs.first().getAttribute('src')
  console.log('img src:', src)
  const ok = await imgs.first().evaluate((el) => el.complete && el.naturalWidth > 0)
  console.log('img loaded:', ok)
} else console.log('no img found')
await browser.close()
