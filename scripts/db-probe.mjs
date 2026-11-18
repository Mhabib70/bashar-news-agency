import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const c = await db.user.count()
console.log('users:', c)
const phones = await db.user.findMany({ select: { phone: true, fullName: true, role: true, status: true }, take: 8 })
for (const u of phones) console.log(u.phone, '|', u.fullName, '|', u.role, u.status)
await db.$disconnect()
