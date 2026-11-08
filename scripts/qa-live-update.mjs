// QA زنده روی سرور اصلی — بنر برای اپ قدیمی، عدم بنر برای اپ جدید، APK و API
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://80.91.208.240";
mkdirSync("/tmp/render", { recursive: true });

const run = async () => {
  // ۱) API زنده
  const r = await fetch(BASE + "/api/app-version?current=11", { cache: "no-store" });
  const j = await r.json();
  console.log("LIVE_API_UPDATE:", j.update, "| ver:", j.versionName, "| apk:", j.apkUrl.slice(0, 45) + "…");

  // ۲) APK زنده — هدر و سایز
  const apk = await fetch(j.apkUrl, { method: "GET", headers: { Range: "bytes=0-1023" } });
  console.log("LIVE_APK_STATUS:", apk.status, "| type:", apk.headers.get("content-type"));

  const browser = await chromium.launch();

  // ۳) اپ قدیمی (WebView بدون مارکر) روی سرور زنده → بنر
  const ctxOld = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SKQ1.211001.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36",
    viewport: { width: 400, height: 800 },
  });
  const p1 = await ctxOld.newPage();
  await p1.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await p1.waitForTimeout(4000);
  const bannerOld = await p1.locator("text=نسخه جدید 2.8.0 منتشر شد").count();
  console.log("LIVE_OLD_APP_BANNER:", bannerOld > 0);
  await p1.screenshot({ path: "/tmp/render/live-banner-old.png" });
  await ctxOld.close();

  // ۴) اپ جدید ۲.۸.۰ روی سرور زنده → بدون بنر
  const ctxNew = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SKQ1.211001.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 BasijNews/2.8.0 (12)",
    viewport: { width: 400, height: 800 },
  });
  const p2 = await ctxNew.newPage();
  await p2.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await p2.waitForTimeout(3000);
  const bannerNew = await p2.locator("text=نسخه جدید 2.8.0 منتشر شد").count();
  console.log("LIVE_NEW_APP_BANNER_HIDDEN:", bannerNew === 0);
  await ctxNew.close();

  await browser.close();
  const ok = j.update && apk.status === 206 && bannerOld > 0 && bannerNew === 0;
  console.log(ok ? "LIVE_QA_ALL_PASS ✅" : "LIVE_QA_FAIL ❌");
  process.exit(ok ? 0 : 1);
};

run().catch((e) => { console.error(e); process.exit(1); });
