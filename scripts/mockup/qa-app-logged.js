// QA اسکرین‌شات اپ اصلی پس از ورود — موبایل و دسکتاپ، چند تب
const { chromium } = require('playwright');
const path = require('path');
const OUT = '/home/z/my-project/scripts/mockup';

(async () => {
  const browser = await chromium.launch();

  // --- موبایل 412x915 (نمای اندروید واقعی) ---
  const m = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'fa-IR',
  });
  const mp = await m.newPage();
  mp.on('pageerror', (e) => console.log('PAGE_ERR:', String(e).slice(0, 300)));
  await mp.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await mp.evaluate(() => localStorage.setItem('newsapp_uid', 'u_admin'));
  await mp.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await mp.evaluate(() => document.fonts.ready);
  await mp.waitForTimeout(2000);
  await mp.screenshot({ path: path.join(OUT, 'v21-m-home.png') });
  console.log('m-home OK');

  // تب اخبار از منوی پایین
  const nav = await mp.$('nav');
  if (nav) {
    const btns = await mp.$$('nav button');
    console.log('nav buttons:', btns.length);
    for (let i = 0; i < btns.length; i++) {
      const t = (await btns[i].innerText()).trim().replace(/\n/g, ' ');
      console.log(`  [${i}] ${t}`);
    }
  }
  await mp.screenshot({ path: path.join(OUT, 'v21-m-full.png'), fullPage: false });

  // --- دسکتاپ 1600x1000 ---
  const d = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, locale: 'fa-IR' });
  const dp = await d.newPage();
  dp.on('pageerror', (e) => console.log('PAGE_ERR desktop:', String(e).slice(0, 300)));
  await dp.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dp.evaluate(() => localStorage.setItem('newsapp_uid', 'u_admin'));
  await dp.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await dp.evaluate(() => document.fonts.ready);
  await dp.waitForTimeout(2000);
  await dp.screenshot({ path: path.join(OUT, 'v21-d-home.png') });
  console.log('d-home OK');

  await mp.evaluate(() => window.scrollTo(0, 0));
  await browser.close();
  console.log('QA_DONE');
})();
