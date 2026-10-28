// انتساب آواتار فیک به همهٔ کاربران دیتابیس محلی — جنسیت‌همخوان با نام‌ها، چرخش قطعی
// اجرا: bun run scripts/set-avatars.mjs
import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

const A = (k) => `/img/avatars/${k}.jpg`

// ترتیب چرخش: تصاویر پشت‌سرهم تکراری نمی‌شوند (در فهرست‌ها و لیدربورد دیده نمی‌شود)
const M_CYCLE = ["m4", "m7", "m2", "m9", "m5", "m1", "m8", "m3", "m10", "m6"]
const F_CYCLE = ["f3", "f6", "f1", "f7", "f4", "f2", "f8", "f5"]

// نقشهٔ اختصاصی: هر کاربر که با کدام تصویر دیده شود
const FIXED = {
  u_admin: "m1", // حسین رحیمی — ادمین کل (چهرهٔ مدیریتی ۴۰ ساله)
  u_dm_b1: "m2", u_dm_b2: "m3", u_dm_b3: "m4", u_dm_b4: "m5", u_dm_b5: "m6", u_dm_b6: "m7",
  u_dm_s1: "f1", u_dm_s2: "f2", u_dm_s3: "f3", u_dm_s4: "f4", u_dm_s5: "f5", u_dm_s6: "f6",
  u_spec1: "m8", u_spec2: "f7", u_spec3: "m9",
}

// جنسیت بر اساس نام (m = مرد، f = زن)
const GENDER = {
  u_pend1: "m", u_pend2: "f", u_pend3: "m", u_rej1: "m",
  u_rep01: "m", u_rep02: "f", u_rep03: "m", u_rep04: "m", u_rep05: "f", u_rep06: "m",
  u_rep07: "m", u_rep08: "f", u_rep09: "m", u_rep10: "m", u_rep11: "f", u_rep12: "m",
  u_rep13: "m", u_rep14: "f", u_rep15: "m", u_rep16: "f", u_rep17: "f", u_rep18: "m",
  u_rep19: "f", u_rep20: "m", u_rep21: "f", u_rep22: "m", u_rep23: "f", u_rep24: "f",
}

const users = await db.user.findMany({ select: { id: true } })
let mi = 0, fi = 0
const usedM = new Set(Object.values(FIXED).filter((k) => k.startsWith("m")))
const usedF = new Set(Object.values(FIXED).filter((k) => k.startsWith("f")))
// برای خبرنگارها از تصاویری شروع می‌کنیم که کمتر استفاده شده تا لیدربورد تنوع داشته باشد
M_CYCLE.sort((a, b) => (usedM.has(a) ? 1 : 0) - (usedM.has(b) ? 1 : 0))
F_CYCLE.sort((a, b) => (usedF.has(a) ? 1 : 0) - (usedF.has(b) ? 1 : 0))

for (const u of users) {
  let key = FIXED[u.id]
  if (!key) {
    const g = GENDER[u.id] ?? (u.id.endsWith("1") ? "m" : "f")
    if (g === "m") key = M_CYCLE[mi++ % M_CYCLE.length]
    else key = F_CYCLE[fi++ % F_CYCLE.length]
  }
  await db.user.update({ where: { id: u.id }, data: { avatar: A(key) } })
  console.log(`${u.id.padEnd(14)} -> ${key}`)
}
console.log(`assigned ${users.length} avatars`)
await db.$disconnect()
