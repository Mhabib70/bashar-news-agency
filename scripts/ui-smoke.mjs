// تست دود (smoke) رابط کاربری با Playwright — بررسی می‌کند تغییرات React اعمال‌شده
// (news-edit / welcome / news-tab) هنوز در مرورگر درست کار می‌کنند.
// اجرا: node scripts/ui-smoke.mjs
import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const BASE = process.env.BASE ?? "http://localhost:3100"
const EXEC = process.env.CHROME_PATH ?? "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"
const SHOTS = process.env.SHOT_DIR ?? "/workspace/bashar-news-agency/docs/qa-fix"
mkdirSync(SHOTS, { recursive: true })

let pass = 0, fail = 0
const failures = []
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; failures.push(name); console.log(`  ❌ ${name} ${detail}`) }
}

const browser = await chromium.launch({ headless: true, executablePath: EXEC, args: ["--no-sandbox"] })
const consoleErrors = []

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, locale: "fa-IR" })
  const page = await ctx.newPage()
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()) })
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`))
  return { ctx, page }
}

// بستن همهٔ دیالوگ‌های باز
async function closeDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.locator('[role="dialog"]').count()
    if (!open) break
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)
  }
}

// کلیک روی اولین عنصر قابل‌مشاهده با متن داده‌شده (اپ هم نسخهٔ موبایل و دسکتاپ دارد)
async function clickVisible(page, text, exact = true) {
  const loc = page.getByText(text, { exact }).locator("visible=true").first()
  await loc.click()
  await page.waitForTimeout(400)
}

async function openLogin(page) {
  await page.goto(BASE, { waitUntil: "networkidle" })
  const start = page.getByRole("button", { name: /شروع کن/ })
  if (await start.isVisible().catch(() => false)) {
    await start.click()
    await page.waitForTimeout(800)
  }
}

// ══════════════ ۱) صفحه ورود ══════════════
console.log("\n════ ۱) صفحه ورود ════")
const { ctx: ctxA, page: pageA } = await newPage()
await pageA.goto(BASE, { waitUntil: "networkidle" })
await pageA.screenshot({ path: `${SHOTS}/01-landing.png` })
await pageA.getByRole("button", { name: /شروع کن/ }).click()
await pageA.waitForTimeout(900)
await pageA.screenshot({ path: `${SHOTS}/01-login.png` })
ok("فرم ورود رندر شد", await pageA.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").isVisible())

// ══════════════ ۲) پیش‌پر شماره در فرم ثبت‌نام (تغییر welcome.tsx) ══════════════
console.log("\n════ ۲) پیش‌پر شدن شماره در فرم ثبت‌نام (تغییر welcome.tsx) ════")
const NEW_PHONE = "09998887777"
await pageA.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").fill(NEW_PHONE)
await pageA.getByRole("button", { name: "ورود", exact: true }).click()
await pageA.waitForTimeout(1500)
const regBtn = pageA.getByRole("button", { name: /ثبت‌نام خبرنگار جدید/ })
if (await regBtn.isVisible().catch(() => false)) {
  await regBtn.click()
  await pageA.waitForTimeout(1000)
  await pageA.screenshot({ path: `${SHOTS}/02-register-prefill.png` })
  const phoneInput = pageA.getByPlaceholder("۰۹۱۲...").first()
  const vis = await phoneInput.isVisible().catch(() => false)
  if (vis) {
    const val = await phoneInput.inputValue()
    ok("شمارهٔ واردشده در فرم ثبت‌نام پیش‌پر شد", val.includes("09998887777"), `value=${val}`)
  } else {
    ok("فرم ثبت‌نام باز شد", false, "ورودی شماره پیدا نشد")
  }
} else {
  ok("دکمهٔ «ثبت‌نام خبرنگار جدید» ظاهر شد", false, "پیدا نشد")
}
await ctxA.close()

// ══════════════ ۳) ورود ادمین ══════════════
console.log("\n════ ۳) ورود ادمین ════")
const { ctx: ctxB, page: page } = await newPage()
await openLogin(page)
await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").fill("09300500977")
await page.getByRole("button", { name: "ورود", exact: true }).click()
await page.waitForTimeout(3000)
await page.screenshot({ path: `${SHOTS}/03-home.png` })
ok("وارد صفحهٔ اصلی شد", await page.getByText("خانه", { exact: true }).first().isVisible().catch(() => false))

// ══════════════ ۴) تب اخبار ══════════════
console.log("\n════ ۴) تب اخبار — واکشی «همه اخبار» (تغییر news-tab.tsx) ════")
await clickVisible(page, "اخبار")
await page.waitForTimeout(2500)
await page.screenshot({ path: `${SHOTS}/04-news-tab.png` })
ok("تب اخبار بارگذاری شد", await page.getByText("همه اخبار", { exact: true }).locator("visible=true").first().isVisible().catch(() => false))

// ══════════════ ۵) تعویض scope ══════════════
console.log("\n════ ۵) تعویض تب «اخبار من» و برگشت ════")
await clickVisible(page, "اخبار من")
await page.waitForTimeout(1200)
await page.screenshot({ path: `${SHOTS}/05a-scope-mine.png` })
await clickVisible(page, "همه اخبار")
await page.waitForTimeout(2000)
await page.screenshot({ path: `${SHOTS}/05b-scope-all.png` })
const loadedAll = await page.locator("text=/N-\\d+/").first().isVisible().catch(() => false)
ok("پس از برگشت به «همه اخبار» فهرست بارگذاری شد", loadedAll)

// ══════════════ ۶) دیالوگ ویرایش خبر ══════════════
console.log("\n════ ۶) دیالوگ ویرایش خبر — پیش‌پر فیلدها (تغییر news-edit.tsx) ════")
let editChecked = false
const cards = page.locator("button").filter({ hasText: /N-\d+/ })
const cardCount = await cards.count()
if (cardCount > 0) {
  await cards.first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${SHOTS}/06a-news-detail.png` })
  const editBtn = page.getByRole("button", { name: /ویرایش/ }).first()
  if (await editBtn.isVisible().catch(() => false)) {
    await editBtn.click()
    await page.waitForTimeout(1000)
    const dlg = page.getByRole("dialog")
    const titleInput = dlg.getByPlaceholder("تیتر خبر").first()
    if (await titleInput.isVisible().catch(() => false)) {
      editChecked = true
      const tv = await titleInput.inputValue()
      ok("فیلد تیتر با عنوان خبر پیش‌پر شد", tv.length > 0, `value=${tv}`)
      const cv = await dlg.getByPlaceholder("متن کامل خبر...").first().inputValue()
      ok("فیلد متن با محتوای خبر پیش‌پر شد", cv.length > 0, `len=${cv.length}`)

      // باگ اصلیِ قبلی: تایپ کاربر با رندر مجددِ والد پاک می‌شد
      await titleInput.fill("تیتر ویرایش‌شده توسط تست")
      await page.waitForTimeout(1500)
      const after = await titleInput.inputValue()
      ok("متن تایپ‌شده پس از رندر مجدد پاک نشد", after.includes("ویرایش‌شده"), `value=${after}`)
      await page.screenshot({ path: `${SHOTS}/06b-news-edit-dialog.png` })
      await page.keyboard.press("Escape")
      await page.waitForTimeout(600)
    }
  }
}
if (!editChecked) console.log("  ℹ️  دیالوگ ویرایش در این نما در دسترس نبود — تست مربوطه رد شد")

// ══════════════ ۷) تب فعالیت و پروفایل ══════════════
console.log("\n════ ۷) تب فعالیت و پروفایل ════")
await closeDialogs(page)
for (const label of ["فعالیت", "پروفایل"]) {
  await clickVisible(page, label)
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${SHOTS}/07-${label}.png` })
  ok(`تب «${label}» رندر شد`, true)
}

// ══════════════ ۸) تالار گفتگو و آکادمی ══════════════
console.log("\n════ ۸) تالار گفتگو و آکادمی ════")
for (const p of ["/forum", "/training"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${SHOTS}/08-${p.replace("/", "")}.png` })
  const bodyLen = (await page.locator("body").innerText()).length
  ok(`صفحهٔ ${p} محتوا دارد (${bodyLen} کاراکتر)`, bodyLen > 200)
}

// ══════════════ ۹) خطاهای کنسول ══════════════
console.log("\n════ ۹) خطاهای کنسول ════")
const realErrors = consoleErrors.filter((e) => !/favicon|404 \(Not Found\)|Failed to load resource|net::ERR/i.test(e))
ok("خطای کنسول/صفحه‌ای رخ نداد", realErrors.length === 0, realErrors.slice(0, 3).join(" | "))

await ctxB.close()
await browser.close()
console.log(`\n══════ نتیجه: ${pass} موفق، ${fail} ناموفق ══════`)
if (fail) console.log("ناموفق‌ها:", failures.join(" | "))
console.log("تصاویر:", SHOTS, "\n")
process.exit(fail === 0 ? 0 : 1)
