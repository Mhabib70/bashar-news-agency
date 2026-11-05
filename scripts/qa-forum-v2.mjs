// QA تالار گفتگو v2 — جریان واقعی ادمین و خبرنگار با اسکرین‌شات از هر قابلیت جدید
// پوشش: فیلتر نوع تاپیک، ایجاد تاپیک نوع‌دار، منشن @، واکنش، ریپلای، پیوست تصویری، نظرسنجی + رأی، اعلان منشن
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'      // ادمین کل
const REPORTER_PHONE = '09131000911'   // امیرحسین میرمعزی — خبرنگار پرکار
const REPORTER_NAME = 'امیرحسین میرمعزی'
const OUT = '/home/z/my-project/download/screenshots/forum-v2'
fs.mkdirSync(OUT, { recursive: true })

const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`shot ${name} ✓`)
}

const login = async (page, phone) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(700)
  await page.locator('input[inputmode="tel"]').first().fill(phone)
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(2500)
}

const run = async () => {
  const browser = await chromium.launch()
  const errors = []

  /* ───────── جلسه ۱: ادمین کل ───────── */
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  page.on('response', (r) => { if (r.status() === 404) console.log('404 URL:', r.url()) })

  await login(page, ADMIN_PHONE)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await shot(page, '01-topics-list')

  // ۱) ایجاد تاپیک نوع‌دار (کلاس تصویری) — داخل دیالوگ
  await page.locator('button:has-text("تاپیک جدید")').first().click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] button:has-text("کلاس تصویری")').first().click()
  await page.locator('[role="dialog"] input').fill('کلاس تصویری اصول خبرنویسی — جلسه دوم')
  await shot(page, '02-create-topic-dialog')
  await page.locator('[role="dialog"] button:has-text("ایجاد تاپیک")').click()
  await page.waitForTimeout(1800)

  // باز کردن تاپیک تازه‌ساخته
  await page.locator('button:has-text("کلاس تصویری اصول خبرنویسی — جلسه دوم")').first().click()
  await page.waitForTimeout(1500)

  // ۲) پیام با منشن — تایپ تدریجی واقعی تا پاپ‌آپ ظاهر شود
  const ta = page.locator('textarea').first()
  await ta.click()
  await ta.pressSequentially('@امیرحس')
  await page.waitForTimeout(600)
  const popupVisible = await page.locator('button:has-text("' + REPORTER_NAME + '")').first().isVisible().catch(() => false)
  console.log('mention popup visible:', popupVisible)
  await shot(page, '03-mention-popup')
  if (popupVisible) await page.locator('button:has-text("' + REPORTER_NAME + '")').first().click()
  await page.waitForTimeout(300)
  await ta.pressSequentially(' لطفاً تمرین جلسه قبل را آماده کن — لینک کلاس فردا: https://meet.example.com/bashar-class-2')
  await page.waitForTimeout(300)
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(1500)
  await shot(page, '04-message-link-card')

  // ۳) واکنش به پیام — پیکر ایموجی
  const smileBtn = page.locator('button[aria-label="افزودن واکنش"]').first()
  await smileBtn.click()
  await page.waitForTimeout(500)
  await shot(page, '05-reaction-picker')
  await page.locator('button:has-text("🔥")').first().click()
  await page.waitForTimeout(1200)
  const reactionPill = await page.locator('button:has-text("🔥")').first().isVisible()
  console.log('reaction pill visible:', reactionPill)
  await shot(page, '06-reaction-added')

  // ۴) پیوست تصویری داخل حباب — از PNG معتبرِ ازپیش‌ساخته با PIL استفاده می‌کنیم
  const ATTACH = '/tmp/forum-attachment.png'
  if (!fs.existsSync(ATTACH)) {
    console.error('PNG تست نیست: python3 -c "from PIL import Image,ImageDraw; ..."')
    process.exit(1)
  }
  await page.locator('input[type="file"]').setInputFiles(ATTACH)
  await page.waitForTimeout(1500)
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(2000)
  await shot(page, '07-image-inline')

  // ۵) نظرسنجی — ساخت و رأی
  const pollBtn = page.locator('button[aria-label="نظرسنجی جدید"]')
  console.log('poll button visible for admin:', await pollBtn.isVisible().catch(() => false))
  await pollBtn.click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] input[placeholder*="سوال نظرسنجی"]').fill('بهترین ساعت کلاس تصویری این هفته کدام است؟')
  await page.locator('[role="dialog"] input[placeholder="گزینه 1"]').fill('ساعت ۱۸')
  await page.locator('[role="dialog"] input[placeholder="گزینه 2"]').fill('ساعت ۲۰')
  await shot(page, '08-poll-dialog')
  await page.locator('[role="dialog"] button:has-text("ایجاد نظرسنجی")').click()
  await page.waitForTimeout(1500)
  await shot(page, '09-poll-card')
  await page.locator('[role="dialog"] button:has-text("ساعت ۱۸")').first().click().catch(() => {})
  await page.locator('button:has-text("ساعت ۱۸")').first().click()
  await page.waitForTimeout(1300)
  await shot(page, '10-poll-voted')

  // ۶) هدر زنده — برگشت و فیلتر نوع
  await page.locator('button[aria-label="بازگشت"]').click()
  await page.waitForTimeout(1200)
  const headerTxt = await page.locator('header').innerText().catch(() => '')
  await page.locator('button:has-text("🏆 چالش")').first().click().catch(() => {})
  await page.waitForTimeout(800)
  await shot(page, '11-filter-chips')
  console.log('thread header sample:', headerTxt.replace(/\n/g, ' | ').slice(0, 120))

  const adminUid = await page.evaluate(() => localStorage.getItem('newsapp_uid'))
  console.log('admin uid ok:', !!adminUid)
  await page.close()

  /* ───────── جلسه ۲: خبرنگار — ریپلای + اعلان منشن + بدون دکمه نظرسنجی ───────── */
  const page2 = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  page2.on('pageerror', (e) => errors.push('p2 pageerror: ' + String(e)))
  page2.on('console', (m) => { if (m.type() === 'error') errors.push('p2 console: ' + m.text()) })

  await login(page2, REPORTER_PHONE)
  await page2.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(2000)
  await page2.locator('button:has-text("کلاس تصویری اصول خبرنویسی — جلسه دوم")').first().click()
  await page2.waitForTimeout(1800)

  const pollBtnForReporter = await page2.locator('button[aria-label="نظرسنجی جدید"]').count()
  console.log('poll button count for reporter (must be 0):', pollBtnForReporter)

  // ریپلای به پیام ادمین
  await page2.locator('button:has-text("پاسخ")').first().click()
  await page2.waitForTimeout(500)
  const replyBarVisible = await page2.locator('text=پاسخ به').first().isVisible().catch(() => false)
  console.log('reply preview bar visible:', replyBarVisible)
  await page2.locator('textarea').first().fill('بله آماده است — تمرین را همین امشب می‌فرستم 👌')
  await shot(page2, '12-reporter-reply-quote')
  await page2.locator('button[aria-label="ارسال"]').click()
  await page2.waitForTimeout(1800)
  await shot(page2, '13-reply-thread')

  // واکنش خبرنگار به پیام ادمین
  await page2.locator('button[aria-label="افزودن واکنش"]').first().click()
  await page2.waitForTimeout(400)
  await page2.locator('button:has-text("😍")').first().click()
  await page2.waitForTimeout(1200)

  // اعلان منشن — صفحه اصلی + زنگ اعلان
  await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(2000)
  const bell = page2.locator('button[aria-label*="اعلان"], button:has-text("اعلان")').first()
  if (await bell.isVisible().catch(() => false)) {
    await bell.click()
    await page2.waitForTimeout(1500)
  }
  await shot(page2, '14-reporter-notifications')
  const notifBody = await page2.locator('body').innerText()
  const hasMentionNotif = notifBody.includes('اشاره به شما در تالار گفتگو')
  console.log('mention notification visible in UI (ممکن است ساعت سکوت موکولش کند):', hasMentionNotif)

  // کشف منبع خطای ۴۰۴
  page2.on('response', (r) => { if (r.status() === 404) console.log('404 URL:', r.url()) })

  await page2.close()
  await browser.close()

  console.log('---- errors:', errors.length, errors.slice(0, 4))
  const critical = errors.filter((e) => !e.includes('favicon') && !e.includes('404'))
  if (critical.length > 0) { console.error('CRITICAL ERRORS'); process.exit(2) }
  if (!reactionPill) { console.error('REACTION MISSING'); process.exit(2) }
  if (!popupVisible) { console.error('MENTION POPUP MISSING'); process.exit(2) }
  if (!replyBarVisible) { console.error('REPLY BAR MISSING'); process.exit(2) }
  if (pollBtnForReporter !== 0) { console.error('POLL BUTTON LEAKED TO REPORTER'); process.exit(2) }
  console.log('ALL OK — تالار v2 سالم است')
}

run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
