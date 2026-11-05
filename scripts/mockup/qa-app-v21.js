// QA اسکرین‌شات از وب‌اپ نسخه ۲.۱ — موبایل و دسکتاپ
const { chromium } = require('playwright');
const path = require('path');
const OUT = '/home/z/my-project/scripts/mockup';

(async () => {
  const browser = await chromium.launch();

  // --- موبایل (نمای اندروید واقعی) ---
  const m = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'fa-IR',
  });
  const mp = await m.newPage();
  mp.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE_ERR:', msg.text().slice(0, 200)); });
  mp.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)));
  await mp.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await mp.evaluate(() => document.fonts.ready);
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: path.join(OUT, 'v21-mobile-1.png') });
  console.log('mobile-1 OK');

  // اسکرول به پایین فید
  await mp.evaluate(() => window.scrollBy(0, 900));
  await mp.waitForTimeout(700);
  await mp.screenshot({ path: path.join(OUT, 'v21-mobile-2.png') });
  console.log('mobile-2 OK');

  // --- دسکتاپ ---
  const d = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1.5,
    locale: 'fa-IR',
  });
  const dp = await d.newPage();
  await dp.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await dp.evaluate(() => document.fonts.ready);
  await dp.waitForTimeout(1500);
  await dp.screenshot({ path: path.join(OUT, 'v21-desktop-1.png') });
  console.log('desktop-1 OK');

  await browser.close();
  console.log('QA_DONE');
})();
