// بررسی سریع وضعیت دیتابیس و فید ادمین کل
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const newsTotal = await db.newsItem.count()
  const published = await db.newsItem.count({ where: { status: 'published' } })
  const pending = await db.newsItem.count({ where: { status: 'pending' } })
  const users = await db.user.count()
  const events = await db.event?.count?.() ?? await db.newsEvent.count()
  const topics = await db.forumTopic.count()
  const training = await db.training.count()
  console.log('news total:', newsTotal, '| published:', published, '| pending:', pending)
  console.log('users:', users, '| events:', events, '| forum topics:', topics, '| training:', training)
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e.message); process.exit(1) })
