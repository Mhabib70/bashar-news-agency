// تست صحت توابع تاریخ جلالی — اجرا: node --experimental-strip-types scripts/verify-jalali.ts
// مقادیر مرجع از کتابخانهٔ jalaali-js استخراج و تأیید شده‌اند.
// اگر jalaali-js نصب باشد، مقایسهٔ کامل و خودکار هم انجام می‌شود.
import {
  toJalaali,
  jalaliToDate,
  jalaliMonthStartWeekday,
  jalaliMonthLength,
  toJalali,
  toGregorian,
} from "../src/lib/jalali.ts"

let pass = 0
let fail = 0
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else {
    fail++
    console.log(`  ❌ ${name}\n      got  = ${JSON.stringify(got)}\n      want = ${JSON.stringify(want)}`)
  }
}

console.log("\n── تبدیل میلادی ↔ جلالی (مقادیر مرجع) ──")
check("toJalali(2024,3,20) = ۱ فروردین ۱۴۰۳", toJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 })
check("toGregorian(1403,1,1) = ۲۰ مارس ۲۰۲۴", toGregorian(1403, 1, 1), { gy: 2024, gm: 3, gd: 20 })
check("toJalali(2011,3,21) = ۱ فروردین ۱۳۹۰", toJalali(2011, 3, 21), { jy: 1390, jm: 1, jd: 1 })
check("toJalali(2024,3,31) = ۱۲ فروردین ۱۴۰۳", toJalali(2024, 3, 31), { jy: 1403, jm: 1, jd: 12 })
// ۱۴۰۳ سال کبیسه است → اسفند ۳۰ روز دارد و ۲۰ مارس ۲۰۲۵ = ۳۰ اسفند ۱۴۰۳
check("toJalali(2025,3,20) = ۳۰ اسفند ۱۴۰۳ (سال کبیسه)", toJalali(2025, 3, 20), { jy: 1403, jm: 12, jd: 30 })
check("toJalali(2025,3,21) = ۱ فروردین ۱۴۰۴", toJalali(2025, 3, 21), { jy: 1404, jm: 1, jd: 1 })

console.log("\n── رابط‌های Date ──")
check("toJalaali(new Date(2024,2,20))", toJalaali(new Date(2024, 2, 20)), { jy: 1403, jm: 1, jd: 1 })
const d = jalaliToDate(1403, 1, 1)
check("jalaliToDate(1403,1,1) → getFullYear", d.getFullYear(), 2024)
check("jalaliToDate(1403,1,1) → getMonth", d.getMonth(), 2)
check("jalaliToDate(1403,1,1) → getDate", d.getDate(), 20)

console.log("\n── طول ماه و سال کبیسه ──")
check("ماه‌های ۱ تا ۶ → ۳۱ روز", jalaliMonthLength(1403, 1), 31)
check("ماه‌های ۷ تا ۱۱ → ۳۰ روز", jalaliMonthLength(1403, 7), 30)
check("اسفند ۱۴۰۳ (کبیسه) → ۳۰ روز", jalaliMonthLength(1403, 12), 30)
check("اسفند ۱۴۰۴ (غیرکبیسه) → ۲۹ روز", jalaliMonthLength(1404, 12), 29)
check("اسفند ۱۳۹۹ (کبیسه) → ۳۰ روز", jalaliMonthLength(1399, 12), 30)

console.log("\n── روز هفتهٔ شروع ماه (شنبه = ۰) ──")
const WD = ["ش", "ی", "د", "س", "چ", "پ", "ج"]
check("۱ فروردین ۱۴۰۳ = چهارشنبه", jalaliMonthStartWeekday(1403, 1), 4)
check("نام روز", WD[jalaliMonthStartWeekday(1403, 1)], "چ")
check("۱ مهر ۱۴۰۳ = یکشنبه", jalaliMonthStartWeekday(1403, 7), 1)
check("نام روز", WD[jalaliMonthStartWeekday(1403, 7)], "ی")

console.log("\n── رفت‌وبرگشت کامل (۵ سال) ──")
let rtFail = 0
let cursor = new Date(2021, 0, 1)
const end = new Date(2026, 0, 1)
while (cursor < end) {
  const j = toJalaali(cursor)
  const back = jalaliToDate(j.jy, j.jm, j.jd)
  if (
    back.getFullYear() !== cursor.getFullYear() ||
    back.getMonth() !== cursor.getMonth() ||
    back.getDate() !== cursor.getDate()
  ) {
    rtFail++
    if (rtFail <= 3) console.log(`  ❌ ${cursor.toDateString()} → ${JSON.stringify(j)} → ${back.toDateString()}`)
  }
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
}
check("رفت‌وبرگشت همهٔ روزها", rtFail, 0)

// ── مقایسهٔ کامل با مرجع jalaali-js (اختیاری) ──
try {
  const { createRequire } = await import("node:module")
  const require = createRequire(import.meta.url)
  const ref = require("jalaali-js")
  let mism = 0
  let c = new Date(2000, 0, 1)
  while (c < new Date(2030, 0, 1)) {
    const mine = toJalaali(c)
    const theirs = ref.toJalaali(c.getFullYear(), c.getMonth() + 1, c.getDate())
    if (mine.jy !== theirs.jy || mine.jm !== theirs.jm || mine.jd !== theirs.jd) mism++
    c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 1)
  }
  check("مقایسه با مرجع jalaali-js (۳۰ سال)", mism, 0)
} catch {
  console.log("  ℹ️  مرجع jalaali-js نصب نیست — مقایسهٔ خودکار رد شد (مقادیر ثابت بالا معتبرند)")
}

console.log(`\n═══ نتیجه: ${pass} موفق، ${fail} ناموفق ═══\n`)
process.exit(fail === 0 ? 0 : 1)
