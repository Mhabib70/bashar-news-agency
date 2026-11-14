// QA جامع بسته‌های تعامل/اثر/ابزار — محلی، دسکتاپ‌ویو + موبایل‌ویو
// ۱) ورود ادمین ۲) شیت اعلان‌ها ۳) تقویم جلالی ۴) پیش‌نویس ۵) جستجوی آرشیو ۶) PIN set/login/remove (API)
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const OUT = '/tmp/render/v3'
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` })

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1380, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  // اگر مهمان است وارد شو
  const body0 = await page.locator('body').innerText()
  if (body0.includes('شروع کن')) {
    await page.locator('button:has-text("شروع کن")').first().click()
    await page.waitForTimeout(600)
    await page.locator('input[inputmode="tel"]').first().fill(ADMIN_PHONE)
    await page.locator('button:has-text("ورود")').last().click()
    await page.waitForTimeout(4500)
  }
  const body = await page.locator('body').innerText()
  console.log('logged in?', body.includes('رضوان') || body.includes('امتیاز'))

  // ۲) شیت اعلان‌ها — کلیک روی زنگوله TopBar
  await page.locator('button:has([class*="lucide-bell"]), button:has(.lucide-bell)').first().click().catch(async () => {
    await page.locator('[class*="bell"], button:has-text("اعلان")').first().click()
  })
  await page.waitForTimeout(1500)
  const notifBody = await page.locator('body').innerText()
  console.log('notif sheet shows اعلان‌ها?', notifBody.includes('اعلان‌ها'))
  await shot(page, 'p1-notifications')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)

  // ۳) تب اخبار → تقویم جلالی
  await page.locator('button:has-text("اخبار"), a:has-text("اخبار")').first().click().catch(() => {})
  await page.waitForTimeout(1200)
  const calBtn = page.locator('button:has(.lucide-calendar-days), button[title*="تقویم"], button:has-text("تقویم")').first()
  if (await calBtn.count() > 0) { await calBtn.click(); await page.waitForTimeout(1800); await shot(page, 'p2-calendar') }
  const body2 = await page.locator('body').innerText()
  console.log('calendar visible?', /آبان|1405|تقویم/.test(body2))

  // ۴) پیش‌نویس‌ها در تب اخبار (فیلتر «من»)
  const mineBtn = page.locator('button:has-text("خبرهای من"), button:has-text("من")').first()
  if (await mineBtn.count() > 0) { await mineBtn.click(); await page.waitForTimeout(1000) }
  await shot(page, 'p3-news-mine')

  // ۵) جستجوی آرشیو
  const search = page.locator('input[placeholder*="جستجو"]').first()
  if (await search.count() > 0) {
    await search.fill('رشت')
    await page.waitForTimeout(1800)
    await shot(page, 'p4-search')
    const b3 = await page.locator('body').innerText()
    console.log('search results visible?', b3.includes('N-'))
  }

  // ۶) PIN E2E از طریق API در همان مرورگر
  const ctx = page.context()
  const api = async (path, opts = {}) => {
    const r = await ctx.request.post(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...opts })
    return { status: r.status(), json: await r.json().catch(() => ({})) }
  }
  const pin1 = await api('/api/user/pin', { data: { action: 'set', currentPin: '', newPin: '4422' } })
  console.log('PIN set:', JSON.stringify(pin1.json).slice(0, 90))
  const logout = await api('/api/logout', { data: {} })
  console.log('logout ok?', logout.status)
  const login2 = await api('/api/login', { data: { phone: ADMIN_PHONE } })
  console.log('re-login pinRequired?', login2.json.pinRequired, '| fullName:', login2.json.fullName ?? '')
  const pinLogin = await api('/api/login/pin', { data: { phone: ADMIN_PHONE, pin: '4422' } })
  console.log('PIN login ok?', pin1.status === 200 && pinLogin.json.ok === true, JSON.stringify(pinLogin.json).slice(0, 60))
  const badPin = await api('/api/login/pin', { data: { phone: ADMIN_PHONE, pin: '9999' } })
  console.log('wrong PIN rejected?', badPin.json.ok !== true, badPin.json.error ?? '')
  const pinRemove = await api('/api/user/pin', { data: { action: 'remove', currentPin: '4422' } })
  console.log('PIN removed:', JSON.stringify(pinRemove.json).slice(0, 80))
  const login3 = await api('/api/login', { data: { phone: ADMIN_PHONE } })
  console.log('login after remove → pinRequired?', login3.json.pinRequired ?? false)

  console.log('pageerrors:', errors.length, errors.slice(0, 3))
  await browser.close()
}

run().catch((e) => { console.error('QA FAIL:', e.message); process.exit(1) })
