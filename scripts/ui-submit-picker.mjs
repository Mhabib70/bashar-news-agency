// تست دود رابط کاربری — بخش ثبت خبر با انتخابگر تاریخ شمسی
// اجرا: BASE=http://localhost:3100 node scripts/ui-submit-picker.mjs
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3100"
const EXEC = process.env.CHROME_PATH ?? "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"
const SHOTS = "/workspace/bashar-news-agency/docs/qa-fix"
mkdirSync(SHOTS, { recursive: true })

let pass = 0, fail = 0
const failures = []
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; failures.push(name); console.log(`  ❌ ${name} ${detail}`) }
}

const browser = await chromium.launch({ headless: true, executablePath: EXEC, args: ["--no-sandbox"] })
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, locale: "fa-IR" })
const page = await ctx.newPage()
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })

// ── ورود ادمین ──
console.log("\n════ ۱) ورود ════")
await page.goto(BASE, { waitUntil: "networkidle" })
await page.getByRole("button", { name: /شروع کن/ }).click()
await page.waitForTimeout(800)
await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").fill("09300500977")
await page.getByRole("button", { name: "ورود", exact: true }).click()
await page.waitForTimeout(2500)
ok("وارد اپ شد", await page.getByText("خانه", { exact: true }).locator("visible=true").first().isVisible().catch(() => false))

// ── باز کردن فرم ارسال خبر ──
console.log("\n════ ۲) فرم ارسال خبر ════")
const quick = page.getByRole("button", { name: "ثبت خبر جدید" }).locator("visible=true").first()
await quick.click()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${SHOTS}/10-submit-step1.png` })
const dlg = page.getByRole("dialog")
ok("دیالوگ ارسال خبر باز شد", await dlg.isVisible().catch(() => false))

// رفتن به گام «محتوای خبر»
const nextBtn = dlg.getByRole("button").filter({ hasText: /بعدی|مرحله بعد|ادامه/ }).locator("visible=true").first()
if (await nextBtn.isVisible().catch(() => false)) {
  await nextBtn.click()
  await page.waitForTimeout(800)
}
await page.screenshot({ path: `${SHOTS}/11-submit-content.png` })

// ── انتخابگر تاریخ شمسی ──
console.log("\n════ ۳) انتخابگر تاریخ شمسی ════")
const pickerBtn = dlg.getByText(/تاریخ و ساعت تهیه خبر/).locator("visible=true").first()
const hasPicker = await pickerBtn.isVisible().catch(() => false)
ok("انتخابگر «تاریخ و ساعت تهیه خبر» در فرم هست", hasPicker)

if (hasPicker) {
  await pickerBtn.click()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${SHOTS}/12-jalali-picker.png` })
  const pickerDlg = page.getByRole("dialog").last()
  const weekdayHeader = await pickerDlg.getByText("ش", { exact: true }).first().isVisible().catch(() => false)
  ok("تقویم جلالی باز شد (سرستون روزهای هفته)", weekdayHeader)
  const monthLabel = await pickerDlg.getByText(/فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند/).first().isVisible().catch(() => false)
  ok("نام ماه شمسی نمایش داده شد", monthLabel)

  // ── بررسی دقیق جای روزها در شبکه (تقویم جلالی) ──
  const cells = await pickerDlg.locator(".grid.grid-cols-7 > *").all()
  const cellText = (await Promise.all(cells.map((c) => c.innerText()))).map((t) => t.trim())
  const head = cellText.slice(0, 7)
  console.log("  سرستون:", head.join(" "))
  for (let r = 0; r < 5; r++) {
    console.log(`  سطر ${r + 1}:`, cellText.slice(7 + r * 7, 14 + r * 7).map((t) => t || "·").join(" "))
  }
  // «امروز» باید زیر ستون درست روز هفته باشد (شنبه = ۰)
  // ساعت/تاریخ مرجع را از خود مرورگر بگیر (همان TZ دستگاه)
  const gDow = await page.evaluate(() => (new Date().getDay() + 1) % 7) // ۰ = شنبه
  const todayCell = pickerDlg.locator(".grid.grid-cols-7 button.border-neon\\/40").first()
  const todayVisible = await todayCell.isVisible().catch(() => false)
  ok("روز امروز در تقویم مشخص شده است", todayVisible)
  if (todayVisible) {
    // شمارهٔ ستون روز امروز: اندیس در آرایهٔ سلول‌ها منهای ۷ (سرستون)
    const idx = await todayCell.evaluate((el) => {
      const grid = el.closest(".grid")
      return Array.from(grid.children).indexOf(el)
    })
    const col = (idx - 7) % 7
    ok("امروز زیر ستون روز هفتهٔ درست قرار گرفت", col === gDow, `col=${col} expected=${gDow}`)
  }

  // انتخاب روز
  const dayBtn = pickerDlg.getByRole("button").filter({ hasText: /^[۰-۹]{1,2}$/ }).locator("visible=true").first()
  if (await dayBtn.isVisible().catch(() => false)) {
    await dayBtn.click()
    await page.waitForTimeout(400)
    const confirm = pickerDlg.getByRole("button").filter({ hasText: /تایید تاریخ/ }).locator("visible=true").first()
    await confirm.click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${SHOTS}/13-picker-selected.png` })
    const chosen = await dlg.getByText(/تاریخ و ساعت تهیه خبر/).locator("visible=true").first().isVisible()
    ok("پس از تایید، تاریخ در فرم ثبت شد", chosen)
    // مقدار نباید «انتخاب کنید» بماند
    const placeholder = await dlg.getByText("انتخاب کنید").locator("visible=true").count()
    ok("مقدار تاریخ دیگر خالی نیست", placeholder === 0, `count=${placeholder}`)
  } else {
    ok("روزهای تقویم قابل کلیک بودند", false)
  }
}

// ── خطاهای کنسول ──
console.log("\n════ ۴) خطاهای کنسول ════")
const real = errors.filter((e) => !/favicon|404 \(Not Found\)|Failed to load resource/i.test(e))
ok("خطای کنسول رخ نداد", real.length === 0, real.slice(0, 2).join(" | "))

await browser.close()
console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`)
if (fail) console.log("ناموفق‌ها:", failures.join(" | "))
console.log("")
process.exit(fail === 0 ? 0 : 1)
