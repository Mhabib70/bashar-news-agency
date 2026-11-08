// QA بنر به‌روزرسانی: UA اپ قدیمی → بنر باید بیاید | UA اپ جدید → بنر نباید بیاید
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOT = "/tmp/render";
import { mkdirSync } from "fs";
mkdirSync(SHOT, { recursive: true });

const run = async () => {
  const browser = await chromium.launch();

  // ۱) اپ قدیمی (بدون مارکر نسخه در UA — مثل نسخه‌های قبل از ۲.۸)
  const ctxOld = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SKQ1.211001.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 400, height: 800 },
  });
  const p1 = await ctxOld.newPage();
  await p1.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p1.waitForTimeout(3500);
  const bannerOld = await p1.locator("text=نسخه جدید 2.8.0 منتشر شد").count();
  console.log("OLD_APP_BANNER_VISIBLE:", bannerOld > 0);
  await p1.screenshot({ path: SHOT + "/banner-old-app.png" });
  await ctxOld.close();

  // ۲) اپ جدید ۲.۸.۰ (مارکر در UA) → بنر نباید بیاید
  const ctxNew = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SKQ1.211001.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 BasijNews/2.8.0 (12)",
    viewport: { width: 400, height: 800 },
  });
  const p2 = await ctxNew.newPage();
  await p2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(3000);
  const bannerNew = await p2.locator("text=نسخه جدید 2.8.0 منتشر شد").count();
  console.log("NEW_APP_BANNER_HIDDEN:", bannerNew === 0);
  await p2.screenshot({ path: SHOT + "/banner-new-app.png" });
  await ctxNew.close();

  // ۳) دسکتاپ → بنر نباید بیاید
  const ctxDesk = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const p3 = await ctxDesk.newPage();
  await p3.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p3.waitForTimeout(2500);
  const bannerDesk = await p3.locator("text=نسخه جدید 2.8.0 منتشر شد").count();
  console.log("DESKTOP_BANNER_HIDDEN:", bannerDesk === 0);
  await ctxDesk.close();

  await browser.close();
  const allOk = bannerOld > 0 && bannerNew === 0 && bannerDesk === 0;
  console.log(allOk ? "QA_ALL_PASS ✅" : "QA_FAIL ❌");
  process.exit(allOk ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
