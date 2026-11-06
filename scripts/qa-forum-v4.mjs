// QA تالار گفتگو v4 — بازطراحی گرافیکی کامل
// ساخت داده تست + اسکرین‌شات: لابی، چت، واکنش، ریپلای، منشن، نظرسنجی، تم روشن
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const REPORTER_PHONE = '09131000911'
const REPORTER_NAME = 'امیرحسین میرمعزی'
const OUT = '/home/z/my-project/download/screenshots/forum-v4'
fs.mkdirSync(OUT, { recursive: true })

const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log(`shot ${name} ✓`)
}

const login = async (page, phone) => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(600)
  await page.locator('input[inputmode="tel"]').first().fill(phone)
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(2200)
}

const run = async () => {
  const browser = await chromium.launch()
  const errors = []

  /* ───── جلسه ۱: ادمین — ساخت تاپیک و پیام‌ها ───── */
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => errors.push('p1 pageerror: ' + String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('p1 console: ' + m.text()) })

  await login(page, ADMIN_PHONE)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)

  // ساخت تاپیک کلاس تصویری
  await page.locator('button:has-text("تاپیک جدید")').first().click()
  await page.waitForTimeout(600)
  await page.locator('[role="dialog"] button:has-text("کلاس تصویری")').first().click()
  await page.locator('[role="dialog"] input').fill('کلاس تصویری اصول خبرنویسی — جلسه اول')
  await shot(page, '01-new-topic-dialog')
  await page.locator('[role="dialog"] button:has-text("ایجاد تاپیک")').click()
  await page.waitForTimeout(2200)
  await shot(page, '02-lobby-with-topic', false)

  // تاپیک هم‌فکری برای تنوع رنگ تایل‌ها
  await page.locator('button:has-text("تاپیک جدید")').first().click()
  await page.waitForTimeout(600)
  await page.locator('[role="dialog"] button:has-text("هم‌فکری")').first().click()
  await page.locator('[role="dialog"] input').fill('پوشش زنده مراسم هفته بسیج — تقسیم وظایف')
  await page.locator('[role="dialog"] button:has-text("ایجاد تاپیک")').click()
  await page.waitForTimeout(2000)
  await shot(page, '03-lobby-two-types', false)

  // ورود به تاپیک اول
  await page.locator('button[aria-label="باز کردن کلاس تصویری اصول خبرنویسی — جلسه اول"]').first().click()
  await page.waitForTimeout(1800)

  // پیام اول با منشن
  const ta = page.locator('textarea').first()
  await ta.click()
  await ta.pressSequentially('سلام رفقا! جلسه اول ساعت ۱۸ برگزار می‌شود. جزوه را با @')
  await page.waitForTimeout(600)
  const popupVisible = await page.locator(`button:has-text("${REPORTER_NAME}")`).first().isVisible().catch(() => false)
  console.log('mention popup visible:', popupVisible)
  await shot(page, '04-mention-popup')
  if (popupVisible) {
    await page.locator(`button:has-text("${REPORTER_NAME}")`).first().click()
    await page.waitForTimeout(300)
    await ta.pressSequentially(' به اشتراک بگذارید.')
  }
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(1600)

  // پیام دوم + پیوست تصویری
  await ta.click()
  await ta.pressSequentially('پوستر جلسه را هم ببینید:')
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(1400)
  await page.locator('input[type="file"]').setInputFiles('/tmp/forum-attachment.png')
  await page.waitForTimeout(1500)
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(2200)
  await shot(page, '05-chat-bubbles-image')

  // نظرسنجی
  await page.locator('button[aria-label="نظرسنجی جدید"]').click()
  await page.waitForTimeout(600)
  await page.locator('[role="dialog"] input[placeholder*="سوال نظرسنجی"]').fill('بهترین ساعت کلاس تصویری هفته بعد؟')
  await page.locator('[role="dialog"] input[placeholder="گزینه ۱"]').fill('ساعت ۱۸')
  await page.locator('[role="dialog"] input[placeholder="گزینه ۲"]').fill('ساعت ۲۰')
  await page.locator('[role="dialog"] button:has-text("ایجاد نظرسنجی")').click()
  await page.waitForTimeout(1600)
  await page.locator('button:has-text("ساعت ۱۸")').first().click()
  await page.waitForTimeout(1400)
  await shot(page, '06-poll-voted')
  await page.locator('button[aria-label="بازگشت"]').click()
  await page.waitForTimeout(1600)

  /* ───── جلسه ۲: خبرنگار — ریپلای + واکنش ───── */
  const page2 = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  page2.on('pageerror', (e) => errors.push('p2 pageerror: ' + String(e)))
  page2.on('console', (m) => { if (m.type() === 'error') errors.push('p2 console: ' + m.text()) })

  await login(page2, REPORTER_PHONE)
  await page2.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(2200)
  await shot(page2, '07-lobby-reporter')

  await page2.locator('button[aria-label="باز کردن کلاس تصویری اصول خبرنویسی — جلسه اول"]').first().click()
  await page2.waitForTimeout(1800)

  // ریپلای به پیام ادمین
  await page2.locator('button:has-text("پاسخ")').first().click()
  await page2.waitForTimeout(400)
  const replyBar = await page2.locator('text=پاسخ به').first().isVisible().catch(() => false)
  console.log('reply bar visible:', replyBar)
  await shot(page2, '08-reply-preview')
  await page2.locator('textarea').first().fill('حضور دارم — جزوه را همین امشب می‌فرستم 👌')
  await page2.locator('button[aria-label="ارسال"]').click()
  await page2.waitForTimeout(1800)

  // واکنش به پیام ادمین
  await page2.locator('button[aria-label="افزودن واکنش"]').first().click()
  await page2.waitForTimeout(400)
  await page2.locator('button[aria-label="واکنش 🔥"]').click()
  await page2.waitForTimeout(1300)
  await shot(page2, '09-reaction-floating')
  await page2.locator('button[aria-label="بازگشت"]').click()
  await page2.waitForTimeout(1500)
  await shot(page2, '10-lobby-final')

  // ── تم روشن ──
  await page2.evaluate(() => { document.documentElement.classList.add('light'); localStorage.setItem('theme', 'light') })
  await page2.waitForTimeout(700)
  await shot(page2, '11-lobby-light')

  console.log('---- errors:', errors.length, errors.slice(0, 4))
  const critical = errors.filter((e) => !e.includes('favicon') && !e.includes('404'))
  if (critical.length > 0) { console.error('CRITICAL ERRORS'); process.exit(2) }
  if (!popupVisible) { console.error('MENTION POPUP MISSING'); process.exit(2) }
  if (!replyBar) { console.error('REPLY BAR MISSING'); process.exit(2) }
  console.log('ALL OK — تالار v4 سالم است')
  await browser.close()
}
run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
