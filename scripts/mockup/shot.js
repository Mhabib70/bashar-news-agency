const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  });
  await page.goto('file:///home/z/my-project/scripts/mockup/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: process.argv[2] || '/home/z/my-project/scripts/mockup/preview.png' });
  await browser.close();
  console.log('screenshot done');
})();
