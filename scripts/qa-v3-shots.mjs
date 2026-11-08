// QA بصری بازطراحی v3: همه تب‌ها + اثبات دست‌نخوردگی تالار/آکادمی
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
mkdirSync("/tmp/render/v3", { recursive: true });
const ADMIN_PHONE = "09300500977";

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 400, height: 850 },
    deviceScaleFactor: 2,
  });
  const p = await ctx.newPage();

  // ۱) صفحه ورود
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "/tmp/render/v3/01-welcome.png" });
  console.log("welcome shot ✓");

  // ۲) ورود با ادمین
  await p.locator("button:has-text('شروع کن')").click();
  await p.waitForTimeout(600);
  await p.locator("input[inputmode='tel']").fill(ADMIN_PHONE);
  await p.locator("button:has-text('ورود')").click();
  await p.waitForTimeout(4500);

  // ۳) خانه
  await p.screenshot({ path: "/tmp/render/v3/02-home.png" });
  console.log("home shot ✓");

  // ۴) اخبار
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('اخبار')").click();
  await p.waitForTimeout(1800);
  await p.screenshot({ path: "/tmp/render/v3/03-news.png" });
  console.log("news shot ✓");

  // ۵) فعالیت
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('فعالیت')").click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "/tmp/render/v3/04-activity.png" });
  console.log("activity shot ✓");

  // ۶) پروفایل
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('پروفایل')").click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "/tmp/render/v3/05-profile.png" });
  console.log("profile shot ✓");

  // ۷) دیالوگ ارسال خبر
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('خانه')").click();
  await p.waitForTimeout(1000);
  const submitBtn = p.locator("button:has-text('ثبت خبر')").first();
  if (await submitBtn.count()) {
    await submitBtn.click();
    await p.waitForTimeout(1200);
    await p.screenshot({ path: "/tmp/render/v3/06-submit.png" });
    console.log("submit shot ✓");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
  }

  // ۸) صف بررسی (ادمین)
  const reviewBtn = p.locator("nav[aria-label='ناوبری اصلی'] button[aria-label='صف بررسی']");
  if (await reviewBtn.count()) {
    await reviewBtn.click();
    await p.waitForTimeout(1800);
    await p.screenshot({ path: "/tmp/render/v3/07-review.png" });
    console.log("review shot ✓");
  }

  // ۹+۱۰) اثبات دست‌نخوردگی تالار و آکادمی
  await p.goto(BASE + "/forum", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "/tmp/render/v3/08-forum-unchanged.png" });
  console.log("forum shot ✓");
  await p.goto(BASE + "/training", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "/tmp/render/v3/09-training-unchanged.png" });
  console.log("training shot ✓");

  await browser.close();
  console.log("QA_SHOTS_DONE");
};

run().catch((e) => { console.error(e); process.exit(1); });
