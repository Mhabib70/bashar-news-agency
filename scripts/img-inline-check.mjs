// چک سریع رندر عکس پیوست داخل حباب (لود تازه صفحه)
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('newsapp_uid', 'cmw30ejqz0000ojjxn3emltdg'))
await page.goto('http://localhost:3000/forum', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const card = page.locator('button:has-text("کلاس تصویری اصول خبرنویسی — جلسه دوم")').first()
await card.click()
await page.waitForTimeout(2500)
const imgs = page.locator('img[alt="پیوست تصویری"]')
const n = await imgs.count()
console.log('inline img count:', n)
if (n > 0) {
  const ok = await imgs.first().evaluate((el) => el.complete && el.naturalWidth > 0)
  console.log('img loaded ok:', ok, 'naturalWidth:', await imgs.first().evaluate((el) => el.naturalWidth))
}
await page.screenshot({ path: '/home/z/my-project/download/screenshots/forum-v2/07b-image-inline-check.png' })
await browser.close()
