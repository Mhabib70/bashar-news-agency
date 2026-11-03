import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ROLE_LABELS } from "@/lib/domain"

// تالار گفتگو — تاپیک‌ها و پیام‌ها (کلاس تصویری، هم‌فکری، اطلاع‌رسانی)
// GET (بدون topicId)  → فهرست تاپیک‌ها با آخرین پیام
// GET (با topicId)    → پیام‌های تاپیک
// POST actions:
//   topic    → ایجاد تاپیک { userId, title }
//   message  → ارسال پیام { userId, topicId, body, fileUrl? }
//   delete_topic / delete_message → حذف (نویسنده یا ادمین)
//   pin      → سنجاق/برداشتن تاپیک (ادمین)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get("userId")
  const topicId = sp.get("topicId")
  if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.status !== "active") return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })

  if (topicId) {
    const topic = await db.forumTopic.findUnique({
      where: { id: Number(topicId) },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })
    if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })
    return NextResponse.json({
      topic: { id: topic.id, title: topic.title, pinned: topic.pinned, createdBy: topic.createdBy, creatorName: topic.creatorName, createdAt: topic.createdAt.toISOString() },
      messages: topic.messages.map((m) => ({
        id: m.id, userId: m.userId, authorName: m.authorName, authorRole: m.authorRole,
        body: m.body, fileUrl: m.fileUrl, createdAt: m.createdAt.toISOString(),
      })),
    })
  }

  const topics = await db.forumTopic.findMany({
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 40,
  })
  const counts = await db.forumMessage.groupBy({ by: ["topicId"], _count: { _all: true } })
  const countMap = new Map(counts.map((c) => [c.topicId, c._count._all]))
  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id, title: t.title, pinned: t.pinned, createdBy: t.createdBy,
      creatorName: t.creatorName, createdAt: t.createdAt.toISOString(),
      replies: countMap.get(t.id) ?? 0,
      lastMessage: t.messages[0]
        ? { body: t.messages[0].body.slice(0, 90), authorName: t.messages[0].authorName, at: t.messages[0].createdAt.toISOString() }
        : null,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action } = body ?? {}
    const user = await db.user.findUnique({ where: { id: String(userId ?? "") } })
    if (!user || user.status !== "active") return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    const isAdmin = user.role === "admin"

    if (action === "topic") {
      const title = String(body.title ?? "").trim().slice(0, 150)
      if (title.length < 3) return NextResponse.json({ error: "عنوان تاپیک حداقل ۳ کاراکتر باشد" }, { status: 400 })
      const t = await db.forumTopic.create({
        data: { title, createdBy: user.id, creatorName: user.fullName },
      })
      return NextResponse.json({ ok: true, id: t.id, message: `تاپیک «${title}» ساخته شد.` })
    }

    if (action === "message") {
      const tid = Number(body.topicId)
      const text = String(body.body ?? "").trim()
      const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.startsWith("/uploads/") ? body.fileUrl : ""
      if (!text && !fileUrl) return NextResponse.json({ error: "متن یا فایل پیام خالی است" }, { status: 400 })
      const topic = await db.forumTopic.findUnique({ where: { id: tid } })
      if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })
      const m = await db.forumMessage.create({
        data: {
          topicId: tid, userId: user.id, authorName: user.fullName,
          authorRole: user.role, body: text.slice(0, 4000), fileUrl,
        },
      })
      return NextResponse.json({ ok: true, id: m.id })
    }

    if (action === "delete_topic") {
      const tid = Number(body.topicId)
      const topic = await db.forumTopic.findUnique({ where: { id: tid } })
      if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })
      if (!isAdmin && topic.createdBy !== user.id) {
        return NextResponse.json({ error: "فقط سازنده تاپیک یا ادمین می‌تواند حذف کند" }, { status: 403 })
      }
      await db.forumTopic.delete({ where: { id: tid } })
      return NextResponse.json({ ok: true, message: `تاپیک «${topic.title}» حذف شد.` })
    }

    if (action === "delete_message") {
      const mid = Number(body.messageId)
      const m = await db.forumMessage.findUnique({ where: { id: mid } })
      if (!m) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })
      if (!isAdmin && m.userId !== user.id) {
        return NextResponse.json({ error: "فقط نویسنده پیام یا ادمین می‌تواند حذف کند" }, { status: 403 })
      }
      await db.forumMessage.delete({ where: { id: mid } })
      return NextResponse.json({ ok: true, message: "پیام حذف شد." })
    }

    if (action === "pin") {
      if (!isAdmin) return NextResponse.json({ error: "فقط ادمین می‌تواند تاپیک را سنجاق کند" }, { status: 403 })
      const tid = Number(body.topicId)
      const topic = await db.forumTopic.findUnique({ where: { id: tid } })
      if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })
      await db.forumTopic.update({ where: { id: tid }, data: { pinned: !topic.pinned } })
      return NextResponse.json({ ok: true, message: topic.pinned ? "سنجاق برداشته شد." : "تاپیک سنجاق شد (بالای فهرست)." })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در تالار گفتگو" }, { status: 500 })
  }
}
