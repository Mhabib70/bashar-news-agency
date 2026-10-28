// فهرست کاربران دیتابیس محلی برای بازبینی دستی
import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, fullName: true, role: true, status: true, avatar: true, phone: true }, orderBy: { id: "asc" } })
console.log("total:", users.length)
for (const u of users) console.log(`${u.id.padEnd(14)} ${u.role.padEnd(17)} ${u.status.padEnd(9)} avatar=${u.avatar ? "YES" : "no "} ${u.fullName}`)
await db.$disconnect()
