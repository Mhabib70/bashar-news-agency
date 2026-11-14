// QA فلوی ارسال خبر: تقویم جلالی در گام محتوا + ردیابی 401
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
mkdirSync("/tmp/render/v3", { recursive: true });
const ADMIN_PHONE = "09300500977";

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 850 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("response", (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().replace(BASE, "")}`); });

  // ورود
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await p.locator("button:has-text('شروع کن')").click();
  await p.waitForTimeout(500);
  await p.locator("input[inputmode='tel']").fill(ADMIN_PHONE);
  await p.locator("button:has-text('ورود')").click();
  await p.waitForTimeout(4000);

  // تب اخبار → ارسال خبر
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('اخبار')").click();
  await p.waitForTimeout(1500);
  await p.locator("button:has-text('ارسال خبر')").first().click();
  await p.waitForTimeout(1000);

  // گام ۱: دسته
  await p.locator("button:has-text('مرحله بعد')").click();
  await p.waitForTimeout(700);

  // گام ۲: عنوان + متن + تقویم جلالی (همین گام)
  await p.locator("input[placeholder='تیتر جذاب و استاندارد خبر...']").fill("آزمون ادغام v3 و تقویم جلالی");
  await p.locator("textarea[placeholder*='لید: مهم‌ترین بخش خبر']").fill("این یک خبر آزمونی برای اطمینان از سلامت فلوی ارسال پس از ادغام دو خط توسعه است و بیش از سی کاراکتر دارد.");
  await p.waitForTimeout(500);
  const jalali = await p.locator("text=تاریخ و ساعت تهیه خبر").count();
  console.log(jalali > 0 ? "JalaliPicker در گام محتوا ✓" : "JalaliPicker MISSING ✗");
  await p.screenshot({ path: "/tmp/render/v3/11-submit-content-jalali.png" });

  if (jalali > 0) {
    await p.locator("text=تاریخ و ساعت تهیه خبر").first().click();
    await p.waitForTimeout(900);
    await p.screenshot({ path: "/tmp/render/v3/12-jalali-open.png" });
    console.log("jalali opened ✓");
  }

  // بستن تقویم قبل از ادامه
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await p.locator("button:has-text('مرحله بعد')").click({ timeout: 8000 }).catch(async () => {
    await p.locator("h2, [data-slot='dialog-title']").first().click({ timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(300);
    await p.locator("button:has-text('مرحله بعد')").click({ timeout: 8000 });
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: "/tmp/render/v3/13-media-step.png" });
  console.log("media step ✓");

  // گام بازبینی
  await p.locator("button:has-text('مرحله بعد')").click();
  await p.waitForTimeout(800);
  await p.screenshot({ path: "/tmp/render/v3/14-submit-review.png" });
  console.log("review step ✓ — بدون ثبت نهایی");

  if (errors.length) {
    console.log("--- HTTP/JS ISSUES ---");
    [...new Set(errors)].slice(0, 8).forEach((e) => console.log(e));
  } else {
    console.log("no JS/HTTP errors ✓");
  }
  await browser.close();
  console.log("SUBMIT_QA_DONE");
};

run().catch((e) => { console.error("FAIL:", e.message.slice(0, 300)); process.exit(1); });
