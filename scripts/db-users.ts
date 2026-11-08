// کمکی: چاپ شناسه‌ها و وضعیت کاربران از دیتابیس
import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, fullName: true, phone: true, role: true, status: true, points: true, levelKey: true } })
console.log(JSON.stringify(users, null, 1))
const news = await db.newsItem.findMany({ select: { id: true, code: true, title: true, status: true, reviewStage: true } })
console.log("NEWS:", JSON.stringify(news, null, 1))
await db.$disconnect()
