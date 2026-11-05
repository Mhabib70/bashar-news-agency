// QA: تشخیص «تغییرات اعمال نشده» — سناریوی ورود تازه و سشن قدیمی
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const ADMIN_PHONE = '09300500977'
const OLD_WIPED_UID = 'cmw1kpzk60002sewilgxwzdou' // uid که با ریست دیتابیس پاک شد

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })

  // ── سناریو ۱: کاربر تازه — ورود کامل از UI ──
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("شروع کن")').first().click()
  await page.waitForTimeout(600)
  await page.locator('input[inputmode="tel"]').first().fill(ADMIN_PHONE)
  await page.locator('button:has-text("ورود")').last().click()
  await page.waitForTimeout(3500)
  const body1 = await page.locator('body').innerText()
  console.log('S1: logged in?', body1.includes('خوش آمدی') || body1.includes('خانه'))
  console.log('S1: forum card visible?', await page.locator('button:has-text("تالار گفتگو")').first().isVisible().catch(() => false))
  console.log('S1: training card visible?', await page.locator('button:has-text("آموزش")').first().isVisible().catch(() => false))
  await page.screenshot({ path: '/tmp/render/diag-1-fresh-home.png' })

  // ── سناریو ۲: سشن قدیمی پاک‌شده (مثل مرورگر کاربر فعلی) ──
  const page2 = await browser.newPage({ viewport: { width: 412, height: 915 } })
  await page2.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page2.evaluate((uid) => localStorage.setItem('newsapp_uid', uid), OLD_WIPED_UID)
  await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page2.waitForTimeout(2500)
  const body2 = await page2.locator('body').innerText()
  const onWelcome = body2.includes('روایت‌گر') || body2.includes('شروع کن')
  console.log('S2: old-uid user lands on welcome (logged out)?', onWelcome)
  await page2.screenshot({ path: '/tmp/render/diag-2-stale-uid.png' })

  await browser.close()
}

run().catch((e) => { console.error('DIAG FAIL:', e.message); process.exit(1) })
