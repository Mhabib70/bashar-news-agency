// QA تالار گفتگو v3 — سبک تلگرامی + امتیاز تالار + تخته افتخار + سوال هفته ادمین
// پوشش: پروفایل کنار پیام، جداساز تاریخ، گروه‌بندی پیام، واکنش، ریپلای، نظرسنجی،
// تخته افتخار هفته، بنر سوال هفته، نوار آمار من، دکمه سوال هفته (فقط ادمین)
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'      // ادمین کل
const REPORTER_PHONE = '09131000911'   // امیرحسین میرمعزی — خبرنگار پرکار
const REPORTER_NAME = 'امیرحسین میرمعزی'
const OUT = '/home/z/my-project/download/screenshots/forum-v3'
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

  await login(page, ADMIN_PHONE)
  await page.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  const topicsBody = await page.locator('body').innerText()
  const honorVisible = topicsBody.includes('افتخارات هفته')
  const crownVisible = await page.locator('button:has-text("سوال هفته")').first().isVisible().catch(() => false)
  console.log('honor board visible:', honorVisible, '| crown (سوال هفته) visible for admin:', crownVisible)
  await shot(page, '01-topics-list-honor')

  // ۱) سوال هفته ادمین → بنر + تاپیک سنجاق‌شده + اعلان همگانی
  await page.locator('button:has-text("سوال هفته")').first().click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] textarea').fill('موفق‌ترین پوشش خبری این هفته از نظر شما کدام بود و چرا؟')
  await shot(page, '02-weekly-question-dialog')
  await page.locator('[role="dialog"] button:has-text("ثبت و اطلاع‌رسانی")').click()
  await page.waitForTimeout(2500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  const weeklyBanner = await page.locator('button:has-text("سوال هفته")').nth(0).isVisible().catch(() => false)
  const bodyAfterWq = await page.locator('body').innerText()
  const bannerOk = bodyAfterWq.includes('❓ سوال هفته')
  console.log('weekly banner rendered:', bannerOk)
  await shot(page, '03-weekly-banner-honor')

  // ۲) باز کردن تاپیک سوال هفته و پیام دادن (امتیاز +۲)
  await page.locator('button:has-text("موفق‌ترین پوشش خبری این هفته")').first().click()
  await page.waitForTimeout(1800)
  const ta = page.locator('textarea').first()
  await ta.click()
  await ta.pressSequentially('پیشنهاد من گزارش تصویری اردوی هفتگی است — نظرات‌تان را با @امیرحسین میرمعزی هماهنگ کنید.')
  await page.waitForTimeout(400)
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(1800)
  await shot(page, '04-telegram-bubbles')

  // ۳) منشن واقعی با پاپ‌آپ
  await ta.click()
  await ta.pressSequentially('@امیرحس')
  await page.waitForTimeout(700)
  const popupVisible = await page.locator(`button:has-text("${REPORTER_NAME}")`).first().isVisible().catch(() => false)
  console.log('mention popup visible:', popupVisible)
  await shot(page, '05-mention-popup')
  if (popupVisible) {
    await page.locator(`button:has-text("${REPORTER_NAME}")`).first().click()
    await page.waitForTimeout(300)
    await ta.pressSequentially(' لطفاً تصاویر اردو را در همین تاپیک بگذار.')
    await page.locator('button[aria-label="ارسال"]').click()
    await page.waitForTimeout(1600)
  }
  await shot(page, '06-grouped-messages')

  // ۴) واکنش به پیام — قرص ایموجی داخل حباب
  await page.locator('button[aria-label="افزودن واکنش"]').first().click()
  await page.waitForTimeout(500)
  await shot(page, '07-reaction-picker')
  await page.locator('button:has-text("🔥")').first().click()
  await page.waitForTimeout(1300)
  const reactionPill = await page.locator('button:has-text("🔥")').first().isVisible().catch(() => false)
  console.log('reaction pill visible:', reactionPill)
  await shot(page, '08-reaction-in-bubble')

  // ۵) پیوست تصویری داخل حباب
  const ATTACH = '/tmp/forum-attachment.png'
  if (!fs.existsSync(ATTACH)) {
    console.error('PNG تست نیست: python3 -c "from PIL import Image,ImageDraw; ..."')
    process.exit(1)
  }
  await page.locator('input[type="file"]').setInputFiles(ATTACH)
  await page.waitForTimeout(1600)
  await page.locator('button[aria-label="ارسال"]').click()
  await page.waitForTimeout(2200)
  await shot(page, '09-image-inline')

  // ۶) نظرسنجی — ساخت و رأی
  await page.locator('button[aria-label="نظرسنجی جدید"]').click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] input[placeholder*="سوال نظرسنجی"]').fill('بهترین ساعت کلاس تصویری این هفته کدام است؟')
  await page.locator('[role="dialog"] input[placeholder="گزینه ۱"]').fill('ساعت ۱۸')
  await page.locator('[role="dialog"] input[placeholder="گزینه ۲"]').fill('ساعت ۲۰')
  await page.locator('[role="dialog"] button:has-text("ایجاد نظرسنجی")').click()
  await page.waitForTimeout(1600)
  await page.locator('button:has-text("ساعت ۱۸")').first().click()
  await page.waitForTimeout(1300)
  await shot(page, '10-poll-voted')

  // ۷) برگشت به فهرست — بنر و تخته افتخار و آمار من
  await page.locator('button[aria-label="بازگشت"]').click()
  await page.waitForTimeout(1500)
  const myStatsTxt = await page.locator('body').innerText()
  const hasForumPoints = myStatsTxt.includes('امتیاز تالار شما')
  console.log('my stats strip visible:', hasForumPoints)
  await shot(page, '11-topics-after-activity')
  const adminUid = await page.evaluate(() => localStorage.getItem('newsapp_uid'))
  console.log('admin uid ok:', !!adminUid)
  await page.close()

  /* ───────── جلسه ۲: خبرنگار — ریپلای + اعلان سوال هفته + نبود دکمه ادمین ───────── */
  const page2 = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  page2.on('pageerror', (e) => errors.push('p2 pageerror: ' + String(e)))
  page2.on('console', (m) => { if (m.type() === 'error') errors.push('p2 console: ' + m.text()) })

  await login(page2, REPORTER_PHONE)
  await page2.goto(BASE + '/forum', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(2200)
  const crownForReporter = await page2.locator('button[aria-label="سوال هفته"]').count()
  console.log('crown button count for reporter (must be 0):', crownForReporter)
  const repBody = await page2.locator('body').innerText()
  console.log('reporter sees weekly banner:', repBody.includes('❓ سوال هفته'))
  await shot(page2, '12-reporter-forum-list')

  await page2.locator('button:has-text("موفق‌ترین پوشش خبری این هفته")').first().click()
  await page2.waitForTimeout(1800)

  // ریپلای به پیام ادمین — نقل‌قول داخل حباب
  await page2.locator('button:has-text("پاسخ")').first().click()
  await page2.waitForTimeout(500)
  const replyBarVisible = await page2.locator('text=پاسخ به').first().isVisible().catch(() => false)
  console.log('reply preview bar visible:', replyBarVisible)
  await page2.locator('textarea').first().fill('تایید می‌شود — تصاویر اردو را امشب می‌فرستم 👌')
  await shot(page2, '13-reporter-reply-quote')
  await page2.locator('button[aria-label="ارسال"]').click()
  await page2.waitForTimeout(1900)
  await shot(page2, '14-reply-thread-telegram')

  // اعلان سوال هفته — زنگ اعلان
  await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(2000)
  const bell = page2.locator('button[aria-label*="اعلان"], button:has-text("اعلان")').first()
  if (await bell.isVisible().catch(() => false)) {
    await bell.click()
    await page2.waitForTimeout(1500)
  }
  await shot(page2, '15-reporter-notifications')
  const notifBody = await page2.locator('body').innerText()
  const hasWeeklyNotif = notifBody.includes('سوال هفته')
  console.log('weekly-question notification visible:', hasWeeklyNotif)

  await page2.close()
  await browser.close()

  console.log('---- errors:', errors.length, errors.slice(0, 4))
  const critical = errors.filter((e) => !e.includes('favicon') && !e.includes('404'))
  if (critical.length > 0) { console.error('CRITICAL ERRORS'); process.exit(2) }
  if (!honorVisible) { console.error('HONOR BOARD MISSING'); process.exit(2) }
  if (!crownVisible) { console.error('CROWN BUTTON MISSING FOR ADMIN'); process.exit(2) }
  if (!bannerOk) { console.error('WEEKLY BANNER MISSING'); process.exit(2) }
  if (!reactionPill) { console.error('REACTION MISSING'); process.exit(2) }
  if (!popupVisible) { console.error('MENTION POPUP MISSING'); process.exit(2) }
  if (!replyBarVisible) { console.error('REPLY BAR MISSING'); process.exit(2) }
  if (!hasForumPoints) { console.error('MY STATS STRIP MISSING'); process.exit(2) }
  if (crownForReporter !== 0) { console.error('CROWN LEAKED TO REPORTER'); process.exit(2) }
  console.log('ALL OK — تالار v3 سالم است')
}

run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
