import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
console.log('contacts:', await db.externalContact.count())
console.log('users:', await db.user.count())
await db.$disconnect()
