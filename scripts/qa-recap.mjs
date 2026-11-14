// QA سالنامه: ورود → پروفایل → کلیک کارت سالنامه → دیالوگ و محتوا
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09131000911'
const OUT = '/tmp/render/v3'

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1380, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const body0 = await page.locator('body').innerText()
  if (body0.includes('شروع کن')) {
    await page.locator('button:has-text("شروع کن")').first().click()
    await page.waitForTimeout(600)
    await page.locator('input[inputmode="tel"]').first().fill(ADMIN_PHONE)
    await page.locator('button:has-text("ورود")').last().click()
    await page.waitForTimeout(4500)
  }

  // API مستقیم سالنامه
  const api = await page.context().request.get(BASE + '/api/recap')
  const data = await api.json()
  console.log('recap api:', api.status(), '| jy:', data.jy, '| approved:', data.totals?.approved, '| views:', data.totals?.views, '| activeDays:', data.totals?.activeDays, '| points:', data.totals?.points, '| bestMonth:', data.bestMonth?.name)

  // پروفایل → کارت سالنامه
  const body = await page.locator('body').innerText()
  const profBtn = page.locator('button:has-text("پروفایل"), a:has-text("پروفایل")').first()
  if (await profBtn.count() > 0) { await profBtn.click(); await page.waitForTimeout(1500) }
  const tile = page.locator('button:has-text("سالنامه")').first()
  console.log('recap tile visible?', await tile.count() > 0)
  await tile.click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/p5-recap.png` })
  const dlg = await page.locator('body').innerText()
  console.log('dialog shows سالنامه?', dlg.includes('سالنامهٔ'), '| خیرین:', dlg.includes('خبر تاییدشده'), '| ماه طلایی:', dlg.includes('ماهِ طلایی'), '| نمودار:', dlg.includes('طول سال'))

  // اسکرول داخل دیالوگ برای نمودار
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/p6-recap-chart.png` })

  console.log('pageerrors:', errors.length, errors.slice(0, 2))
  await browser.close()
}

run().catch((e) => { console.error('QA FAIL:', e.message); process.exit(1) })
