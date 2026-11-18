// QA جامع ۱۲ اصلاح — دسکتاپ + API
// ۱) خانه: کلیک فید → خوانندهٔ خبر در همان صفحه  ۲) همهٔ خبرهای من با scope mine
// ۳) فعالیت: کارنامه من + باز شدن اخبار  ۴) پنل: بررسی اخبار (همه + جستجو)
// ۵) پنل: پیام همگانی با انتخاب مخاطب  ۶) پنل: مخاطبان رسانه‌ای (CRUD)
// ۷) خروجی‌ها (کوکی‌محور)  ۸) forum/training gating  ۹) honor board بدون ادمین
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const OUT = '/tmp/render/v4'
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` })

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

  const ctx = page.context()
  const api = async (path, opts = {}) => {
    const r = await ctx.request.fetch(BASE + path, { method: opts.method || 'POST', headers: { 'Content-Type': 'application/json' }, data: opts.data })
    return { status: r.status(), json: await r.json().catch(() => ({})) }
  }
  const apiGet = async (path) => {
    const r = await ctx.request.get(BASE + path)
    return { status: r.status(), json: await r.json().catch(() => ({})) }
  }

  // ── API QA ──
  // خروجی‌ها (کوکی‌محور — بدون userId)
  const exp = await apiGet('/api/export?type=users')
  console.log('EXPORT users:', exp.status, String(exp.json).slice(0, 0) || (typeof exp.json === 'string' ? 'csv' : Object.keys(exp.json)))
  // مخاطبان: create → list → delete
  const c1 = await api('/api/contacts', { data: { action: 'create', fullName: 'QA رسانه تست', mediaName: 'خبرگزاری تست', phone: '09121110000', note: 'تست' } })
  console.log('CONTACT create:', c1.status, JSON.stringify(c1.json).slice(0, 80))
  const list = await apiGet('/api/contacts')
  console.log('CONTACT list:', list.status, 'count:', list.json.contacts?.length, '| smsConfigured:', list.json.smsConfigured, '| eitaaConfigured:', list.json.eitaaConfigured)
  const cid = list.json.contacts?.[0]?.id
  if (cid) {
    const sms = await api('/api/contacts', { data: { action: 'sms', ids: [cid], text: 'تست پیامک سامانه — لطفا نادیده بگیرید' } })
    console.log('SMS send:', sms.status, JSON.stringify(sms.json).slice(0, 110))
    const del = await api('/api/contacts', { data: { action: 'delete', id: cid } })
    console.log('CONTACT delete:', del.status, JSON.stringify(del.json).slice(0, 60))
  }
  // forum viewer flag + honor board بدون ادمین
  const forum = await apiGet('/api/forum')
  console.log('FORUM viewer.canManageContent:', forum.json.viewer?.canManageContent, '| honor roles:', (forum.json.honorBoard ?? []).map((h) => h.role))
  // training viewer flag
  const tr = await apiGet('/api/training')
  console.log('TRAINING viewer.canManageContent:', tr.json.viewer?.canManageContent)
  // broadcast targeted (به خود ادمین — حوزه سالم؟ انتخاب نقش admin)
  const bc = await api('/api/broadcast', { data: { title: 'QA مخاطبان', text: 'تست ارسال هدفمند به کارشناس‌ها', targets: { roles: ['specialist'] } } })
  console.log('BROADCAST targeted:', bc.status, JSON.stringify(bc.json).slice(0, 110))
  const bc2 = await api('/api/broadcast', { data: { title: 'QA همه', text: 'تست ارسال به همه اعضا' } })
  console.log('BROADCAST all:', bc2.status, JSON.stringify(bc2.json).slice(0, 90))
  // کاربر ویرایش/حذف روی کاربر تستی موقتی؟ — فقط PATCH خود ادمین (نام تغییر نکن؛ فقط تست خطا)
  const st = await apiGet('/api/state')
  const me = st.json.user
  const patch = await api('/api/users', { method: 'PATCH', data: { id: me.id, fullName: me.fullName } })
  console.log('USER patch(no-op):', patch.status, JSON.stringify(patch.json).slice(0, 70))

  // ── UI QA ──
  // خانه: کلیک روی پست فید → خوانندهٔ خبر همان صفحه
  await page.waitForTimeout(1200)
  const readBtn = page.locator('button:has-text("مطالعهٔ کامل خبر")').first()
  if (await readBtn.count() > 0) {
    await readBtn.click()
    await page.waitForTimeout(1200)
    const b = await page.locator('body').innerText()
    console.log('READER opens in home?', b.includes('مطالعهٔ') === false && b.includes('منتشر شده') || b.includes('خبرگزاری بسیج شهر رشت'))
    await shot(page, 'v4-1-reader-home')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
  } else {
    console.log('READER: no feed post found (maybe empty feed)')
  }

  // خانه: همهٔ خبرهای من → تب اخبار با scope mine
  const myNewsBtn = page.locator('button:has-text("همهٔ خبرهای من")').first()
  if (await myNewsBtn.count() > 0) {
    await myNewsBtn.click()
    await page.waitForTimeout(1500)
    const b = await page.locator('body').innerText()
    console.log('MY-NEWS scope active?', b.includes('اخبار من'))
    await shot(page, 'v4-2-news-mine')
    await page.locator('button:has-text("خانه"), a:has-text("خانه"), button:has-text("جریان خبری")').first().click().catch(() => {})
    await page.waitForTimeout(800)
  }

  // فعالیت: کارنامه من
  await page.locator('button:has-text("کارنامه"), a:has-text("کارنامه")').first().click().catch(() => {})
  await page.waitForTimeout(1500)
  const b2 = await page.locator('body').innerText()
  console.log('ACTIVITY کارنامه من?', b2.includes('کارنامه من') && b2.includes('نرخ تایید'))
  await shot(page, 'v4-3-activity')
  // باز کردن خبر از فعالیت
  const actNews = page.locator('button:has-text("در بررسی"), .v3-card button').first()
  const lastNews = page.locator('section:has-text("آخرین اخبار من") button').nth(1)
  if (await lastNews.count() > 0) {
    await lastNews.click().catch(() => {})
    await page.waitForTimeout(1000)
    await shot(page, 'v4-4-reader-activity')
    await page.keyboard.press('Escape')
  }

  // پنل مدیریت: بررسی اخبار با جستجو
  await page.locator('button:has-text("پنل مدیریت")').first().click().catch(() => {})
  await page.waitForTimeout(2000)
  const reviewNav = page.locator('button:has-text("بررسی اخبار")').first()
  await reviewNav.click().catch(() => {})
  await page.waitForTimeout(2500)
  const b3 = await page.locator('body').innerText()
  console.log('ADMIN review shows news?', /N-\d+/.test(b3), '| search box?', await page.locator('input[placeholder*="جستجو"]').count() > 0)
  await shot(page, 'v4-5-admin-review')
  const sIn = page.locator('input[placeholder*="جستجو"]').first()
  if (await sIn.count() > 0) {
    await sIn.fill('رشت')
    await page.waitForTimeout(1800)
    const b4 = await page.locator('body').innerText()
    console.log('ADMIN search results?', /N-\d+/.test(b4))
    await sIn.fill('')
    await page.waitForTimeout(1500)
  }

  // پنل: مخاطبان رسانه‌ای
  await page.locator('button:has-text("رسانه‌های بیرونی")').first().click().catch(() => {})
  await page.waitForTimeout(1500)
  const b5 = await page.locator('body').innerText()
  console.log('CONTACTS section?', b5.includes('دفترچهٔ مخاطبان') || b5.includes('ثبت مخاطب جدید'))
  await shot(page, 'v4-6-contacts')

  // پنل: پیام همگانی با انتخاب مخاطب
  await page.locator('button:has-text("پیام همگانی")').first().click().catch(() => {})
  await page.waitForTimeout(1500)
  const b6 = await page.locator('body').innerText()
  console.log('BROADCAST targeting?', b6.includes('مخاطبان') && b6.includes('پایگاه‌ها'))
  await shot(page, 'v4-7-broadcast')

  console.log('pageerrors:', errors.length, errors.slice(0, 3))
  await browser.close()
}

run().catch((e) => { console.error('QA FAIL:', e.message); process.exit(1) })
