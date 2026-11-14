// یافتن خبرنگاران دارای خبر در سال جلالی ۱۴۰۵ (برای QA سالنامه)
import { PrismaClient } from '@prisma/client'
import { jalaliToDate } from '../src/lib/jalali'

const db = new PrismaClient()
const start = jalaliToDate(1405, 1, 1)
const end = jalaliToDate(1406, 1, 1)

const rows = await db.newsItem.findMany({
  where: {
    OR: [
      { preparedAt: { gte: start, lt: end } },
      { AND: [{ preparedAt: null }, { createdAt: { gte: start, lt: end } }] },
    ],
  },
  select: { reporterId: true, status: true },
})
const byUser = new Map()
for (const r of rows) {
  const e = byUser.get(r.reporterId) ?? { total: 0, approved: 0 }
  e.total++
  if (r.status === 'approved') e.approved++
  byUser.set(r.reporterId, e)
}
for (const [id, e] of byUser) {
  const u = await db.user.findUnique({ where: { id }, select: { fullName: true, phone: true, status: true } })
  console.log(u?.phone, '|', u?.fullName, '|', u?.status, '| 1405 total:', e.total, 'approved:', e.approved)
}
await db.$disconnect()
