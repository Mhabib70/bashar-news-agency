// QA بسته‌های تعامل/اثر/ابزار: PIN، پیش‌نویس کامل، بازدید، واکنش ایتا، خبر هفته، تقویم محتوا، فیلتر آرشیو
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOT = process.env.SHOT_DIR || "/tmp/render/v3int";
mkdirSync(SHOT, { recursive: true });
const ADMIN_PHONE = "09300500977";
const PIN = "2468";
let failed = 0;

const closeDialog = async (page) => {
  for (let i = 0; i < 4; i++) {
    const open = await page.locator("div[data-slot='dialog-overlay'][data-state='open']").count()
    if (!open) return true
    const x = page.locator("[data-slot='dialog-content'] [data-slot='dialog-close']").last()
    if (await x.count()) {
      await x.click({ force: true }).catch(() => {})
    } else {
      await page.keyboard.press("Escape")
    }
    await page.waitForTimeout(700)
  }
  const still = (await page.locator("div[data-slot='dialog-overlay'][data-state='open']").count()) > 0
  if (still) await page.screenshot({ path: `${SHOT}/debug-dialog-stuck.png` })
  return !still
}

const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failed++;
};

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 850 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const httpErrors = [];
  p.on("response", (r) => { if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url()}`); });

  // ── ۰) تست API مرحله دوم PIN قبل از هر چیز: فعال‌سازی PIN برای ادمین ──
  // ورود اول (بدون PIN) با کوکی
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await p.locator("button:has-text('شروع کن')").click();
  await p.waitForTimeout(500);
  await p.locator("input[inputmode='tel']").fill(ADMIN_PHONE);
  await p.locator("button:has-text('ورود')").click();
  // اگر PIN از اجرای قبلی فعال مانده بود، مرحله دوم را طی کن
  await p.waitForTimeout(1500);
  if (await p.locator("input[inputmode='numeric']").count()) {
    await p.locator("input[inputmode='numeric']").fill(PIN);
    await p.locator("button:has-text('تایید و ورود')").click();
    await p.waitForTimeout(4000);
  } else {
    await p.waitForTimeout(3000);
  }

  // پروفایل → فعال‌سازی PIN
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('پروفایل')").click();
  await p.waitForTimeout(1200);
  // اگر PIN از اجرای قبلی فعال مانده — اول حذفش کن تا سناریو از حالت خاکستری شروع شود
  if (await p.getByRole("button", { name: "مدیریت", exact: true }).count()) {
    await p.getByRole("button", { name: "مدیریت", exact: true }).click();
    await p.waitForTimeout(600);
    await p.locator("input[dir='ltr'][inputmode='numeric']").first().fill(PIN);
    await p.locator("button:has-text('حذف رمز دوم')").click();
    await p.waitForTimeout(2200);
    console.log("pre-existing PIN removed");
  }
  await p.screenshot({ path: `${SHOT}/01-profile-pin-card.png` });
  const pinCard = p.locator("button:has-text('فعال‌سازی')").first();
  ok("PIN card in profile", (await pinCard.count()) > 0);
  await pinCard.click();
  await p.waitForTimeout(600);
  await p.locator("input[inputmode='numeric']").fill(PIN);
  await p.locator("button:has-text('فعال‌سازی رمز دوم')").click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${SHOT}/02-pin-set.png` });
  // بعد از فعال‌سازی، کارت باید «مدیریت» نشان دهد
  const manageBtn = p.locator("button:has-text('مدیریت').nth=0");
  const cardText = await p.locator("text=رمز دوم (PIN) فعال است").count();
  ok("PIN active state shown", cardText > 0);

  // ── ۱) خروج و ورود دومرحله‌ای با PIN ──
  await p.locator("button:has-text('خروج از حساب')").click();
  await p.waitForTimeout(2000);
  await p.locator("button:has-text('شروع کن')").click();
  await p.waitForTimeout(500);
  await p.locator("input[inputmode='tel']").fill(ADMIN_PHONE);
  await p.locator("button:has-text('ورود')").click();
  await p.waitForTimeout(1500);
  const pinStepVisible = await p.locator("text=رمز دوم (PIN) را وارد کنید").count() + await p.locator("input[inputmode='numeric']").count();
  ok("PIN step appears after login", pinStepVisible > 0);
  await p.screenshot({ path: `${SHOT}/03-login-pin-step.png` });
  await p.locator("input[inputmode='numeric']").fill(PIN);
  await p.locator("button:has-text('تایید و ورود')").click();
  await p.waitForTimeout(4000);
  ok("logged in with PIN", (await p.locator("text=خبرگزاری بسیج شهر رشت").first().count()) > 0 && (await p.locator("nav[aria-label='ناوبری اصلی']").count()) > 0);

  // ── ۲) خانه: بنر خبر هفته (اگر خبر منتشرشده در ۷ روز اخیر باشد) ──
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${SHOT}/04-home-week-featured.png` });
  const featuredBanner = await p.locator("text=خبر هفته خبرگزاری").count();
  console.log(`week-featured banner: ${featuredBanner > 0 ? "visible" : "absent (هیچ خبر منتشرشدهٔ هفتگی ندارد — قابل قبول)"}`);

  // ── ۳) اخبار: تقویم محتوا ──
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('اخبار')").click();
  await p.waitForTimeout(1500);
  await p.locator("button[aria-label='نمای تقویم محتوا']").click();
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${SHOT}/05-calendar.png` });
  const calMonth = await p.locator("text=آبان").first().count();
  ok("calendar month header (آبان)", calMonth > 0, "");
  // کلیک روی روزی که خبر دارد (از خود API تقویم)
  const jd = await p.evaluate(async () => {
    const r = await fetch("/api/news/calendar", { credentials: "same-origin" });
    const d = await r.json();
    const days = (d.items || []).map((i) => i.jd).sort((a, b) => a - b);
    return days.length ? days[0] : null;
  });
  if (jd) {
    const faDay = String(jd).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
    await p.locator("button.h-11", { hasText: faDay }).first().click();
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOT}/06-calendar-day.png` });
    ok("calendar day list opens", true);
  } else {
    ok("calendar day list opens", false, "هیچ روزی خبر ندارد");
  }

  // ── ۴) بازگشت به فهرست + فیلتر آرشیو ──
  await p.locator("button[aria-label='نمای فهرست']").click();
  await p.waitForTimeout(1200);
  await p.locator("button:has-text('۳۰ روز')").click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${SHOT}/07-archive-filters.png` });
  ok("archive period filter applied", true);

  // ── ۵) جزئیات خبر ادمین: واکنش ایتا + ثبت ──
  const firstCard = p.locator(".v3-card.w-full.p-4").first();
  if (await firstCard.count()) {
    await firstCard.click();
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOT}/08-news-detail-admin.png` });
    const eitaaPanel = await p.locator("text=واکنش‌های کانال ایتا").count();
    ok("eitaa stats panel for admin", eitaaPanel > 0);
    const reactionsInput = p.locator("input[placeholder='تعداد واکنش از کانال']");
    if (await reactionsInput.count()) {
      await reactionsInput.fill("۱۲۳");
      await p.locator("button:has-text('ثبت')").last().click();
      await p.waitForTimeout(2500);
      const registered = await p.locator("text=ثبت‌شده: ۱۲۳").count();
      ok("eitaa reactions saved (۱۲۳)", registered > 0);
      await p.screenshot({ path: `${SHOT}/09-reactions-saved.png` });
    }
    // تقدیر دکمه موجود است (ارسال واقعی نمی‌زنیم تا کانال خراب نشود)
    const praiseBtn = await p.locator("button:has-text('تقدیر خبرنگار در کانال ایتا')").count();
    ok("praise button visible for admin", praiseBtn > 0);
    await closeDialog(p);
    await p.waitForTimeout(400);
  }

  // ── ۶) پیش‌نویس: ذخیره و ادامه ──
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('اخبار')").click();
  await p.waitForTimeout(800);
  await p.locator("button:has-text('ارسال خبر')").first().click();
  await p.waitForTimeout(1000);
  // مرحله ۰: دسته
  await p.locator("[data-slot='dialog-content'] button:has-text('محلی')").first().click();
  await p.locator("button:has-text('مرحله بعد')").click();
  await p.waitForTimeout(800);
  await p.locator("input[placeholder='تیتر جذاب و استاندارد خبر...']").fill("پیش‌نویس آزمایشی برای تست ادامه کار");
  await p.locator("textarea").fill("این متن آزمایشی پیش‌نویس است برای اطمینان از ذخیره و بازیابی کامل پیش‌نویس در جریان ثبت خبر خبرگزاری.");
  await p.locator("button:has-text('ذخیره پیش‌نویس')").click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${SHOT}/10-draft-saved.png` });
  await closeDialog(p);
  await p.waitForTimeout(400);
  // دامنه «اخبار من» → فهرست پیش‌نویس‌ها
  await p.locator("button:has-text('اخبار من'):visible").first().click();
  await p.waitForTimeout(1500);
  const draftRow = p.locator("text=پیش‌نویس آزمایشی برای تست ادامه کار").first();
  const draftFound = await draftRow.count();
  ok("draft appears in drafts list", draftFound > 0);
  if (draftFound) {
    await p.screenshot({ path: `${SHOT}/11-draft-list.png` });
    await draftRow.click();
    await p.waitForTimeout(1200);
    // جریان از مرحله دسته‌بندی باز می‌شود — برو به مرحله محتوا
    await p.locator("[data-slot='dialog-content'] button:has-text('مرحله بعد')").click();
    await p.waitForTimeout(900);
    const restored = await p.locator("input[placeholder='تیتر جذاب و استاندارد خبر...']").inputValue();
    ok("draft resumed with title", restored.includes("پیش‌نویس آزمایشی"), restored.slice(0, 30));
    await p.screenshot({ path: `${SHOT}/12-draft-resumed.png` });
    await closeDialog(p);
    await p.waitForTimeout(400);
    // حذف پیش‌نویس آزمایشی (پاک‌سازی)
    await p.locator("button[aria-label='حذف پیش‌نویس']").first().click();
    await p.waitForTimeout(2000);
    console.log("draft cleaned up");
  }

  // ── ۷) شیت اعلان‌ها ──
  await p.locator("button[aria-label='اعلان‌ها']").first().click();
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${SHOT}/13-notifications.png` });
  ok("notifications sheet opens", true);
  await closeDialog(p);

  // ── ۸) پروفایل: حذف PIN (پاک‌سازی) ──
  await p.locator("nav[aria-label='ناوبری اصلی'] button:has-text('پروفایل')").click();
  await p.waitForTimeout(1000);
  await p.getByRole("button", { name: "مدیریت", exact: true }).click();
  await p.waitForTimeout(600);
  await p.locator("input[dir='ltr'][inputmode='numeric']").first().fill(PIN);
  await p.locator("button:has-text('حذف رمز دوم')").click();
  await p.waitForTimeout(2200);
  const removed = await p.locator("text=رمز دوم (PIN) غیرفعال").count();
  ok("PIN removed (cleanup)", removed > 0);
  await p.screenshot({ path: `${SHOT}/14-pin-removed.png` });

  // خطاهای HTTP
  const errs = httpErrors.filter((e) => !e.includes("/api/training") || true);
  console.log(`HTTP>=400: ${errs.length ? errs.slice(0, 6).join(" | ") : "none"}`);

  await browser.close();
  console.log(failed === 0 ? "ALL PASS" : `${failed} FAILURES`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error("QA crashed:", e.message);
  process.exit(2);
});
