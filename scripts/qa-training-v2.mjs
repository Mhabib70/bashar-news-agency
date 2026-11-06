// QA آکادمی v2 — بازطراحی گرافیکی بخش آموزش + چرخه کامل آموزش
// ادمین: انتشار درس با دسته/سطح/مدت + اعلان · کاربر: خواندن درس، بازدید، «خوانده شد»، پیشرفت
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const REPORTER_PHONE = '09131000911'
const OUT = '/home/z/my-project/download/screenshots/training-v2'
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

  /* ───── جلسه ۱: ادمین — انتشار درس‌های آموزشی ───── */
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => errors.push('p1 pageerror: ' + String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('p1 console: ' + m.text()) })

  await login(page, ADMIN_PHONE)
  await page.goto(BASE + '/training', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await shot(page, '01-academy-admin-empty')

  // درس ۱ — نگارش و لید
  await page.locator('button:has-text("آموزش جدید")').first().click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] input').first().fill('اصول لیدنویسی — ۵ ثانیه طلایی')
  await page.locator('[role="dialog"] textarea').fill('لید، پاراگراف اول خبر است و باید در ۵ ثانیه مخاطب را قانع کند:\n۱. مهم‌ترین اطلاعات را در جمله اول بیاورید (چه کسی، چه چیزی، کجا، کِی).\n۲. جمله‌ها کوتاه و فعلمحور باشند.\n۳. از صفت‌های اغراق‌آمیز پرهیز کنید.\n۴. عدد و آمار دقیق بدهید تا اعتماد ساخته شود.')
  await page.locator('[role="dialog"] button:has-text("انتشار درس")').click()
  await page.waitForTimeout(2200)
  await shot(page, '02-academy-first-lesson')

  // درس ۲ — عکاسی خبری
  await page.locator('button:has-text("آموزش جدید")').first().click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] input').first().fill('عکاسی خبری — قاب‌بندی و لحظه‌یابی')
  await page.locator('[role="dialog"] textarea').fill('در عکاسی خبری، لحظه همه‌چیز است:\n• قانون یک‌سوم: سوژه را روی خطوط تقسیم‌کننده قاب بگذارید.\n• از فلاش مستقیم بپرهیزید و از نور طبیعی استفاده کنید.\n• همیشه یک نمای کلی + یک نمای میانه + یک کلوزآپ بگیرید.')
  await page.locator('[role="dialog"] button:has-text("انتشار درس")').click()
  await page.waitForTimeout(2000)

  // درس ۳ — سطح پیشرفته، دسته رسانه
  await page.locator('button:has-text("آموزش جدید")').first().click()
  await page.waitForTimeout(700)
  await page.locator('[role="dialog"] input').first().fill('اخلاق رسانه‌ای در پوشش حوادث')
  await page.locator('[role="dialog"] textarea').fill('پوشش حوادث نیازمند رعایت خط قرمزهای حرفه‌ای است:\n• مصدومان را بدون رضایت تصویر نکنید.\n• هویت قربانیان و خانواده‌ها را حفظ کنید.\n• از انتشار شایعه بپرهیزید؛ فقط منبع موثق.')
  // انتخاب دسته رسانه و اخلاق + سطح پیشرفته
  await page.locator('[role="dialog"] button:has-text("📰 رسانه و اخلاق")').click()
  await page.waitForTimeout(300)
  await page.locator('[role="dialog"] button:has-text("پیشرفته")').click()
  await page.waitForTimeout(300)
  await page.locator('[role="dialog"] button:has-text("انتشار درس")').click()
  await page.waitForTimeout(2200)
  await shot(page, '03-academy-three-lessons')

  // فیلتر دسته — سلکتور محدود به نوار چیپ‌ها
  await page.locator('div.no-scrollbar button:has-text("نگارش و لید")').click()
  await page.waitForTimeout(700)
  await shot(page, '04-academy-filter-writing')
  await page.locator('div.no-scrollbar button:has-text("همه")').first().click()
  await page.waitForTimeout(500)

  // باز کردن خواننده درس (ادمین)
  await page.locator('button[aria-label="خواندن اصول لیدنویسی — ۵ ثانیه طلایی"]').first().click()
  await page.waitForTimeout(1500)
  await shot(page, '05-lesson-reader')

  // علامت خوانده شد توسط ادمین
  await page.locator('button:has-text("این درس را خواندم")').click()
  await page.waitForTimeout(1500)
  await shot(page, '06-lesson-completed')
  await page.locator('[role="dialog"] button[aria-label="بستن"]').click()
  await page.waitForTimeout(800)
  await page.close()

  /* ───── جلسه ۲: خبرنگار — خواندن درس و پیشرفت ───── */
  const p2 = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })
  p2.on('pageerror', (e) => errors.push('p2 pageerror: ' + String(e)))
  p2.on('console', (m) => { if (m.type() === 'error') errors.push('p2 console: ' + m.text()) })

  await login(p2, REPORTER_PHONE)
  await p2.goto(BASE + '/training', { waitUntil: 'networkidle' })
  await p2.waitForTimeout(2200)
  await shot(p2, '07-academy-reporter-view')

  // بنر ادامه یادگیری باید دیده شود
  const bannerVisible = await p2.locator('button:has-text("ادامه یادگیری")').first().isVisible().catch(() => false)
  console.log('continue-learning banner visible:', bannerVisible)

  // خبرنگار درس اول را می‌خواند و علامت می‌زند
  await p2.locator('button[aria-label="خواندن اصول لیدنویسی — ۵ ثانیه طلایی"]').first().click()
  await p2.waitForTimeout(1500)
  await p2.locator('button:has-text("این درس را خواندم")').click()
  await p2.waitForTimeout(1500)
  await shot(p2, '08-reporter-completes')
  await p2.locator('[role="dialog"] button[aria-label="بستن"]').click()
  await p2.waitForTimeout(800)
  await shot(p2, '09-reporter-progress')

  // نباید دکمه افزودن برای خبرنگار باشد
  const addBtnForReporter = await p2.locator('button:has-text("آموزش جدید")').count()
  console.log('add button for reporter (must be 0):', addBtnForReporter)

  // جستجو
  await p2.locator('input[placeholder*="جستجو"]').fill('عکاسی')
  await p2.waitForTimeout(800)
  await shot(p2, '10-search-results')

  // تم روشن
  await p2.locator('input[placeholder*="جستجو"]').fill('')
  await p2.waitForTimeout(400)
  const themeBtn = p2.locator('header button[aria-label*="تم"], header button[title*="تم"], header button').last()
  await themeBtn.click().catch(() => {})
  await p2.waitForTimeout(900)
  await shot(p2, '11-light-theme')

  await browser.close()
  console.log(errors.length === 0 ? 'ALL OK — بدون خطای کنسول' : 'ERRORS:\n' + errors.join('\n'))
  if (errors.length) process.exit(1)
}

run().catch((e) => { console.error('FATAL', e); process.exit(1) })
