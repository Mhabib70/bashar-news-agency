// بازیابی کامل محلی: دیتابیس نو + seed دمو + آواتارها + حساب ادمین کل (شماره محافظت‌شده)
// اجرا: node scripts/recover-db.mjs
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const SUPER_ADMIN = { fullName: 'مدیر بسیج رشت', phone: '09300500977', username: 'user_00500977' }

const step = (m) => console.log('▶', m)

async function ensureSuperAdmin(db) {
  const existing = await db.user.findFirst({ where: { OR: [{ username: SUPER_ADMIN.username }, { phone: SUPER_ADMIN.phone }] } })
  if (existing) {
    // ترمیم نقش/وضعیت در صورت نیاز
    if (existing.role !== 'admin' || existing.status !== 'active') {
      await db.user.update({ where: { id: existing.id }, data: { role: 'admin', status: 'active' } })
      console.log('✦ نقش ادمین کل ترمیم شد:', existing.id)
    }
    console.log('✓ ادمین کل از قبل موجود است:', existing.id)
    return existing.id
  }
  const u = await db.user.create({
    data: {
      username: SUPER_ADMIN.username,
      fullName: SUPER_ADMIN.fullName,
      role: 'admin',
      status: 'active',
      district: '',
      base: '',
      phone: SUPER_ADMIN.phone,
      age: '',
      education: '',
      levelKey: 'rookie',
      notifSetting: { create: {} },
    },
  })
  console.log('✓ ادمین کل ساخته شد:', u.id)
  return u.id
}

async function main() {
  step('حذف دیتابیس آسیب‌دیده و ساخت مجدد اسکیما')
  execSync('rm -f db/custom.db && npx prisma db push --skip-generate', { stdio: 'inherit', cwd: '/home/z/my-project' })

  const db = new PrismaClient()

  step('seed دمو (کاربران، خبرها، رویدادها، چالش‌ها)')
  execSync('bun run scripts/seed-demo.mjs', { stdio: 'inherit', cwd: '/home/z/my-project' })

  step('آواتارها')
  execSync('bun run scripts/set-avatars.mjs', { stdio: 'inherit', cwd: '/home/z/my-project' })

  step('حساب ادمین کل (۰۹۳۰۰۵۰۰۹۷۷)')
  const uid = await ensureSuperAdmin(db)

  const [users, news, events] = [await db.user.count(), await db.newsItem.count(), await db.newsEvent.count()]
  console.log(`✓ وضعیت نهایی: ${users} کاربر · ${news} خبر · ${events} رویداد · ادمین کل = ${uid}`)
  await db.$disconnect()
}

main().catch((e) => { console.error('RECOVERY FAIL:', e.message); process.exit(1) })
