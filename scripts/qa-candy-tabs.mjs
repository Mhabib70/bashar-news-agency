// رندر بصری + لاگ خطاها — تشخیص مشکل تب‌ها
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const PHONE = process.env.ADMIN_PHONE || '09113010001'
const OUT = '/tmp/render/candy'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
const T = { timeout: 8000 }
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const start = page.locator('button:has-text("ورود به داشبورد")').first()
if (await start.count()) { await start.click(T).catch((e) => console.log('start-btn fail')); await page.waitForTimeout(800) }
const tel = page.locator('input[inputmode="tel"]').first()
if (await tel.count()) {
  await tel.fill(PHONE)
  await page.locator('button:has-text("ورود")').last().click(T).catch((e) => console.log('login fail'))
  await page.waitForTimeout(3800)
}
console.log('logged-in header:', (await page.locator('header, main').first().textContent())?.slice(0, 60))

// تب اخبار (باتم‌نو موبایل)
const NAV = 'nav[aria-label="ناوبری اصلی"]'
const nb = page.locator(NAV + ' button:has-text("اخبار")').first()
console.log('news btn count:', await nb.count())
await nb.click(T).catch((e) => console.log('news click fail:', e.message.slice(0, 120)))
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/03-news.png` })
console.log('after news click, active aria:', await page.locator(NAV + ' button[aria-current="page"]').textContent().catch(() => '?'))

// تب کارنامه
const ab = page.locator(NAV + ' button:has-text("کارنامه")').first()
console.log('activity btn count:', await ab.count())
await ab.click(T).catch((e) => console.log('activity click fail:', e.message.slice(0, 120)))
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/05-activity.png` })

// تب پروفایل
const pb = page.locator(NAV + ' button:has-text("پروفایل")').first()
await pb.click(T).catch((e) => console.log('profile click fail'))
await page.waitForTimeout(1300)
await page.screenshot({ path: `${OUT}/06-profile.png` })

// انجمن و آموزش و تشکیلات (صفحات مستقل)
for (const [i, p] of [['08-forum', '/forum'], ['09-training', '/training'], ['10-org', '/organization']].entries()) {
  await page.goto(BASE + p[1], { waitUntil: 'networkidle' }).catch(() => console.log('goto fail', p[1]))
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/${p[0]}.png` })
  console.log('shot', p[0])
}

await browser.close()
console.log('done ->', OUT)
