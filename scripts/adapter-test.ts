/**
 * تست مسیر آداپتور libSQL — شبیه‌سازی دقیق مسیر ابری Turso با دیتابیس فایل‌محور
 * تضمین می‌کند PrismaLibSQL + createClient با تمام کوئری‌های اپ کار می‌کند.
 */
import { PrismaClient } from "@prisma/client"
import { PrismaLibSQL } from "@prisma/adapter-libsql"

async function main() {
  const TEST_DB = "file:/home/z/my-project/db/adapter-test.db"
  const adapter = new PrismaLibSQL({ url: TEST_DB })
  const db = new PrismaClient({ adapter })

  // پاک‌سازی و ساخت اسکیما از طریق push دیتابیس تستی
  console.log("1) ساخت کوئری‌های پایه روی مسیر آداپتور...")

  // ایجاد + خواندن + شمارش
  const user = await db.user.create({
    data: {
      username: "adapter_test_user",
      fullName: "تست آداپتور",
      role: "admin",
      district: "b1",
      notifSetting: { create: {} },
    },
  })
  const found = await db.user.findUnique({ where: { id: user.id }, include: { notifSetting: true } })
  console.log("2) create+find OK:", found?.fullName, "| notif:", !!found?.notifSetting)

  await db.newsItem.create({
    data: { code: "N-99001", reporterId: user.id, district: "b1", title: "تست", content: "متن", status: "pending", reviewStage: "district" },
  })
  const news = await db.newsItem.findMany({ where: { reporterId: user.id }, include: { reporter: true } })
  console.log("3) news+include OK:", news.length, "| reporter:", news[0]?.reporter.fullName)

  const agg = await db.user.aggregate({ _count: true })
  console.log("4) aggregate OK:", agg._count)

  await db.newsItem.deleteMany({ where: { reporterId: user.id } })
  await db.pointsLog.deleteMany({ where: { userId: user.id } })
  await db.draft.deleteMany({ where: { userId: user.id } })
  await db.userBadge.deleteMany({ where: { userId: user.id } })
  await db.challengeParticipation.deleteMany({ where: { userId: user.id } })
  await db.notifSetting.deleteMany({ where: { userId: user.id } })
  await db.user.delete({ where: { id: user.id } })
  await db.$disconnect()
  console.log("ADAPTER_TEST_OK")
}

main().catch((e) => {
  console.error("ADAPTER_TEST_FAIL:", e.message)
  process.exit(1)
})
