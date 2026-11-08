import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { levelFor, FORUM_POINTS } from "@/lib/domain"
import { addForumPoints } from "@/lib/server/state"
import { notifyUser } from "@/lib/server/notify"
import type { Prisma } from "@prisma/client"
import { activeUser } from "@/lib/server/session"

// تالار گفتگو v3 — سبک تلگرامی + امتیاز تالار + تخته افتخار هفته + نشان‌ها + سوال هفته ادمین
// GET (بدون topicId)  → فهرست تاپیک‌ها + اعضا + تخته افتخار هفته + سوال هفته + آمار من
// GET (با topicId)    → پیام‌ها (متادیتای نویسنده، واکنش‌ها، نقل‌قول) + نظرسنجی‌ها + اعضا
// POST actions:
//   topic           → ایجاد تاپیک { userId, title, type } (+۵ امتیاز)
//   message         → ارسال پیام { userId, topicId, body, fileUrl?, replyToId? } (+۲ امتیاز، اعلان منشن/پاسخ)
//   react           → toggle واکنش { userId, messageId, emoji } (+۱ امتیاز به نویسنده پیام)
//   poll_create     → نظرسنجی جدید { userId, topicId, question, options[] } (ادمین/مدیر حوزه)
//   poll_vote       → رأی { userId, pollId, optionIndex } (قابل تغییر)
//   poll_delete     → حذف نظرسنجی { userId, pollId } (ادمین/سازنده)
//   weekly_question → سوال هفته { userId, question } (ادمین) — تاپیک سنجاق‌شده + اعلان به همه
//   delete_topic / delete_message / pin → مانند قبل

const ONLINE_WINDOW_MS = 5 * 60 * 1000
const WEEK_MS = 7 * 24 * 3600 * 1000
const REACTION_EMOJIS = ["😍", "👍", "🔥", "💡"] as const
const TOPIC_TYPES = ["class", "brainstorm", "announce", "challenge"] as const

type PollVotes = Record<string, number>

function serializePoll(p: { id: number; question: string; options: unknown; votes: unknown; createdBy: string; createdAt: Date }) {
  const options = Array.isArray(p.options) ? (p.options as string[]) : []
  const votes = (p.votes && typeof p.votes === "object" && !Array.isArray(p.votes) ? p.votes : {}) as PollVotes
  const counts = options.map((_, i) => Object.values(votes).filter((v) => v === i).length)
  return {
    id: p.id, question: p.question, options, votes,
    counts, totalVotes: Object.keys(votes).length,
    createdBy: p.createdBy, createdAt: p.createdAt.toISOString(),
  }
}

// ── نشان‌های تالار (محاسباتی): کل پیام/پاسخ/تاپیک/واکنش‌دریافتی هر کاربر ──
type ForumAgg = { msgs: Map<string, number>; replies: Map<string, number>; topics: Map<string, number>; rxGot: Map<string, number> }

async function forumAggregates(): Promise<ForumAgg> {
  const [msgs, replies, topics, rx] = await Promise.all([
    db.forumMessage.groupBy({ by: ["userId"], _count: { _all: true } }),
    db.forumMessage.groupBy({ by: ["userId"], where: { replyToId: { not: null } }, _count: { _all: true } }),
    db.forumTopic.groupBy({ by: ["createdBy"], _count: { _all: true } }),
    db.forumReaction.findMany({ select: { message: { select: { userId: true } } } }),
  ])
  const agg: ForumAgg = { msgs: new Map(), replies: new Map(), topics: new Map(), rxGot: new Map() }
  for (const r of msgs) agg.msgs.set(r.userId, r._count._all)
  for (const r of replies) agg.replies.set(r.userId, r._count._all)
  for (const r of topics) agg.topics.set(r.createdBy, r._count._all)
  for (const r of rx) {
    const uid = r.message.userId
    agg.rxGot.set(uid, (agg.rxGot.get(uid) ?? 0) + 1)
  }
  return agg
}

function badgesFor(agg: ForumAgg, userId: string, starWeek: boolean): string[] {
  const out: string[] = []
  if (starWeek) out.push("star_week")
  if ((agg.rxGot.get(userId) ?? 0) >= 10) out.push("hot_chat")
  if ((agg.msgs.get(userId) ?? 0) >= 20) out.push("talkative")
  if ((agg.replies.get(userId) ?? 0) >= 10) out.push("helper")
  if ((agg.topics.get(userId) ?? 0) >= 3) out.push("starter")
  return out
}

// ── تخته افتخار هفته: فعالیت ۷ روز اخیر = پیام×۲ + واکنش‌دریافتی×۱ + تاپیک×۵ ──
type HonorRow = { id: string; fullName: string; avatar: string; role: string; levelEmoji: string; weeklyScore: number; messages: number; badges: string[] }

async function honorBoard(since: Date): Promise<{ rows: HonorRow[]; weekly: Map<string, { score: number; msgs: number }> }> {
  const [wMsgs, wTopics, wRx] = await Promise.all([
    db.forumMessage.findMany({ where: { createdAt: { gte: since } }, select: { userId: true } }),
    db.forumTopic.findMany({ where: { createdAt: { gte: since } }, select: { createdBy: true } }),
    db.forumReaction.findMany({ where: { createdAt: { gte: since } }, select: { message: { select: { userId: true } } } }),
  ])
  const weekly = new Map<string, { score: number; msgs: number }>()
  const bump = (uid: string, score: number, msg = 0) => {
    const cur = weekly.get(uid) ?? { score: 0, msgs: 0 }
    cur.score += score
    cur.msgs += msg
    weekly.set(uid, cur)
  }
  for (const m of wMsgs) bump(m.userId, FORUM_POINTS.MESSAGE, 1)
  for (const t of wTopics) bump(t.createdBy, FORUM_POINTS.TOPIC)
  for (const r of wRx) bump(r.message.userId, FORUM_POINTS.REACTION_RECEIVED)

  const top = [...weekly.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, 5)
  if (top.length === 0) return { rows: [], weekly }
  const users = await db.user.findMany({
    where: { id: { in: top.map(([id]) => id) } },
    select: { id: true, fullName: true, avatar: true, role: true, points: true },
  })
  const uMap = new Map(users.map((u) => [u.id, u]))
  const agg = await forumAggregates()
  const rows: HonorRow[] = top.map(([id, v], i) => {
    const u = uMap.get(id)
    return {
      id, fullName: u?.fullName ?? "عضو", avatar: u?.avatar ?? "", role: u?.role ?? "reporter",
      levelEmoji: levelFor(u?.points ?? 0).emoji,
      weeklyScore: v.score, messages: v.msgs,
      badges: badgesFor(agg, id, i === 0 && v.score > 0),
    }
  })
  return { rows, weekly }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const topicId = sp.get("topicId")
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
  const userId = user.id
  // ضربان حضور: هر تماس تالار = آنلاین
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {})

  const members = await db.user.findMany({
    where: { status: "active" },
    select: { id: true, fullName: true, avatar: true, role: true, points: true, forumPoints: true, levelKey: true, lastSeenAt: true },
    orderBy: { fullName: "asc" },
  })
  const membersPayload = members.map((m) => ({
    id: m.id, fullName: m.fullName, avatar: m.avatar, role: m.role,
    online: Date.now() - m.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
    forumPoints: m.forumPoints,
    levelEmoji: levelFor(m.points).emoji,
  }))

  if (topicId) {
    const topic = await db.forumTopic.findUnique({
      where: { id: Number(topicId) },
      include: {
        messages: { orderBy: { createdAt: "asc" }, include: { replyTo: { select: { id: true, body: true, authorName: true } } } },
        polls: { orderBy: { createdAt: "asc" } },
      },
    })
    if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })

    const authorIds = [...new Set(topic.messages.map((m) => m.userId))]
    const authors = await db.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, avatar: true, points: true, levelKey: true, lastSeenAt: true },
    })
    const authorMap = new Map(
      authors.map((a) => [
        a.id,
        {
          avatar: a.avatar,
          levelEmoji: levelFor(a.points).emoji,
          online: Date.now() - a.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
        },
      ]),
    )

    const msgIds = topic.messages.map((m) => m.id)
    const reactions = msgIds.length
      ? await db.forumReaction.findMany({ where: { messageId: { in: msgIds } }, orderBy: { createdAt: "asc" } })
      : []
    const reactionMap = new Map<number, { emoji: string; count: number; users: { id: string; name: string; avatar: string }[]; mine: boolean }[]>()
    for (const r of reactions) {
      const list = reactionMap.get(r.messageId) ?? []
      const existing = list.find((x) => x.emoji === r.emoji)
      if (existing) {
        existing.count++
        if (existing.users.length < 3) existing.users.push({ id: r.userId, name: "", avatar: "" })
        if (r.userId === user.id) existing.mine = true
      } else {
        list.push({
          emoji: r.emoji, count: 1, mine: r.userId === user.id,
          users: [{ id: r.userId, name: "", avatar: "" }],
        })
      }
      reactionMap.set(r.messageId, list)
    }
    // پرکردن آواتار واکنش‌دهنده‌ها (حداکثر ۳ نفر) از داده کاربران
    const reactorIds = [...new Set(reactions.map((r) => r.userId))]
    const reactors = await db.user.findMany({ where: { id: { in: reactorIds } }, select: { id: true, fullName: true, avatar: true } })
    const reactorMap = new Map(reactors.map((r) => [r.id, r]))
    for (const [, list] of reactionMap) {
      for (const g of list) {
        for (const u of g.users) {
          const found = reactorMap.get(u.id)
          if (found) { u.name = found.fullName; u.avatar = found.avatar }
        }
      }
    }

    const participants = new Set(topic.messages.map((m) => m.userId)).size
    const lastMsg = topic.messages[topic.messages.length - 1]

    return NextResponse.json({
      topic: {
        id: topic.id, title: topic.title, type: topic.type, pinned: topic.pinned,
        createdBy: topic.createdBy, creatorName: topic.creatorName, createdAt: topic.createdAt.toISOString(),
        participants, lastActivity: (lastMsg?.createdAt ?? topic.createdAt).toISOString(),
      },
      messages: topic.messages.map((m) => ({
        id: m.id, userId: m.userId, authorName: m.authorName, authorRole: m.authorRole,
        body: m.body, fileUrl: m.fileUrl, createdAt: m.createdAt.toISOString(),
        replyTo: m.replyTo ? { id: m.replyTo.id, body: m.replyTo.body.slice(0, 140), authorName: m.replyTo.authorName } : null,
        reactions: reactionMap.get(m.id) ?? [],
        authorAvatar: authorMap.get(m.userId)?.avatar ?? "",
        authorLevelEmoji: authorMap.get(m.userId)?.levelEmoji ?? "🌱",
        authorOnline: authorMap.get(m.userId)?.online ?? false,
      })),
      polls: topic.polls.map(serializePoll),
      members: membersPayload,
      viewer: { id: user.id, role: user.role },
    })
  }

  // ── فهرست تاپیک‌ها + افتخارات + سوال هفته ──
  const [topics, counts, participantRows, honor, wq] = await Promise.all([
    db.forumTopic.findMany({
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
    db.forumMessage.groupBy({ by: ["topicId"], _count: { _all: true } }),
    db.forumMessage.groupBy({ by: ["topicId", "userId"] }),
    honorBoard(new Date(Date.now() - WEEK_MS)),
    db.forumWeeklyQuestion.findFirst({ orderBy: { createdAt: "desc" } }),
  ])
  const countMap = new Map(counts.map((c) => [c.topicId, c._count._all]))
  const participantMap = new Map<number, number>()
  for (const row of participantRows) participantMap.set(row.topicId, (participantMap.get(row.topicId) ?? 0) + 1)

  // آمار و رتبه خودم در این هفته
  const myWeek = honor.weekly.get(user.id) ?? { score: 0, msgs: 0 }
  const ranked = [...honor.weekly.entries()].sort((a, b) => b[1].score - a[1].score)
  const myRank = ranked.findIndex(([id, v]) => id === user.id && v.score > 0)
  const agg = await forumAggregates()
  const myBadges = badgesFor(agg, user.id, ranked.length > 0 && ranked[0][0] === user.id && ranked[0][1].score > 0)

  let weeklyQuestion: { id: number; question: string; topicId: number; topicTitle: string; creatorName: string; createdAt: string } | null = null
  if (wq) {
    const wTopic = await db.forumTopic.findUnique({ where: { id: wq.topicId }, select: { title: true, creatorName: true } })
    weeklyQuestion = {
      id: wq.id, question: wq.question, topicId: wq.topicId,
      topicTitle: wTopic?.title ?? "", creatorName: wTopic?.creatorName ?? "",
      createdAt: wq.createdAt.toISOString(),
    }
  }

  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id, title: t.title, type: t.type, pinned: t.pinned, createdBy: t.createdBy,
      creatorName: t.creatorName, createdAt: t.createdAt.toISOString(),
      replies: countMap.get(t.id) ?? 0,
      participants: participantMap.get(t.id) ?? 0,
      lastMessage: t.messages[0]
        ? { body: t.messages[0].body.slice(0, 90), authorName: t.messages[0].authorName, at: t.messages[0].createdAt.toISOString() }
        : null,
    })),
    members: membersPayload,
    viewer: { id: user.id, role: user.role },
    honorBoard: honor.rows,
    viewerStats: {
      weeklyScore: myWeek.score, weeklyMessages: myWeek.msgs,
      rank: myRank >= 0 ? myRank + 1 : null,
      totalForumPoints: user.forumPoints,
      badges: myBadges,
    },
    weeklyQuestion,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body ?? {}
    const user = await activeUser(req)
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
    const isAdmin = user.role === "admin"
    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {})

    if (action === "topic") {
      const title = String(body.title ?? "").trim().slice(0, 150)
      const type = TOPIC_TYPES.includes(body.type) ? body.type : "class"
      if (title.length < 3) return NextResponse.json({ error: "عنوان تاپیک حداقل ۳ کاراکتر باشد" }, { status: 400 })
      const t = await db.forumTopic.create({ data: { title, type, createdBy: user.id, creatorName: user.fullName } })
      await addForumPoints(user.id, FORUM_POINTS.TOPIC, "تاپیک جدید در تالار گفتگو", `forum-topic:${t.id}`)
      return NextResponse.json({ ok: true, id: t.id, message: `تاپیک «${title}» ساخته شد · +${FORUM_POINTS.TOPIC} امتیاز تالار` })
    }

    if (action === "message") {
      const tid = Number(body.topicId)
      const text = String(body.body ?? "").trim()
      const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.startsWith("/uploads/") ? body.fileUrl : ""
      const replyToId = Number(body.replyToId) > 0 ? Number(body.replyToId) : null
      if (!text && !fileUrl) return NextResponse.json({ error: "متن یا فایل پیام خالی است" }, { status: 400 })
      const topic = await db.forumTopic.findUnique({ where: { id: tid } })
      if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })

      let replyTo: { id: number; userId: string } | null = null
      if (replyToId) {
        const parent = await db.forumMessage.findUnique({ where: { id: replyToId } })
        if (parent && parent.topicId === tid) replyTo = { id: parent.id, userId: parent.userId }
      }

      const m = await db.forumMessage.create({
        data: {
          topicId: tid, userId: user.id, authorName: user.fullName,
          authorRole: user.role, body: text.slice(0, 4000), fileUrl,
          replyToId: replyTo?.id ?? null,
        },
      })
      await addForumPoints(user.id, FORUM_POINTS.MESSAGE, "پیام در تالار گفتگو", `forum-msg:${m.id}`)

      // اعلان‌ها: پاسخ به پیام + منشن‌های @نام (بدون تکرار، بدون اعلان به خود)
      const notified = new Set<string>([user.id])
      if (replyTo && replyTo.userId !== user.id) {
        notified.add(replyTo.userId)
        await notifyUser(
          replyTo.userId, "forum", "پاسخ به پیام شما در تالار",
          `${user.fullName} به پیام شما در تاپیک «${topic.title}» پاسخ داد.`,
          `forum-topic:${topic.id}`,
        ).catch(() => {})
      }
      if (text) {
        const members = await db.user.findMany({
          where: { status: "active", id: { not: { in: [...notified] } } },
          select: { id: true, fullName: true },
        })
        // نام‌های بلندتر اول — تا @مهدی محمدی قبل از @مهدی تطبیق شود
        for (const mem of [...members].sort((a, b) => b.fullName.length - a.fullName.length)) {
          if (text.includes(`@${mem.fullName}`) && !notified.has(mem.id)) {
            notified.add(mem.id)
            await notifyUser(
              mem.id, "forum", "اشاره به شما در تالار گفتگو",
              `${user.fullName} در تاپیک «${topic.title}» به شما اشاره کرد.`,
              `forum-topic:${topic.id}`,
            ).catch(() => {})
          }
        }
      }

      return NextResponse.json({ ok: true, id: m.id, message: `پیام ارسال شد · +${FORUM_POINTS.MESSAGE} امتیاز` })
    }

    if (action === "react") {
      const mid = Number(body.messageId)
      const emoji = String(body.emoji ?? "")
      if (!REACTION_EMOJIS.includes(emoji as (typeof REACTION_EMOJIS)[number])) {
        return NextResponse.json({ error: "واکنش نامعتبر است" }, { status: 400 })
      }
      const m = await db.forumMessage.findUnique({ where: { id: mid } })
      if (!m) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })
      const existing = await db.forumReaction.findUnique({
        where: { messageId_userId_emoji: { messageId: mid, userId: user.id, emoji } },
      })
      if (existing) {
        await db.forumReaction.delete({ where: { id: existing.id } })
        return NextResponse.json({ ok: true, active: false, message: "واکنش برداشته شد" })
      }
      await db.forumReaction.create({ data: { messageId: mid, userId: user.id, emoji } })
      if (m.userId !== user.id) {
        await addForumPoints(m.userId, FORUM_POINTS.REACTION_RECEIVED, "واکنش به پیام شما در تالار", `forum-msg:${m.id}`)
      }
      return NextResponse.json({ ok: true, active: true, message: "واکنش ثبت شد" })
    }

    if (action === "poll_create") {
      if (!isAdmin && user.role !== "district_manager") {
        return NextResponse.json({ error: "فقط ادمین و مدیر حوزه می‌توانند نظرسنجی بسازند" }, { status: 403 })
      }
      const tid = Number(body.topicId)
      const question = String(body.question ?? "").trim().slice(0, 200)
      const rawOptions = Array.isArray(body.options) ? body.options : []
      const options = rawOptions.map((o: unknown) => String(o ?? "").trim()).filter((o: string) => o.length > 0).slice(0, 5)
      if (question.length < 3) return NextResponse.json({ error: "متن سوال حداقل ۳ کاراکتر باشد" }, { status: 400 })
      if (options.length < 2) return NextResponse.json({ error: "حداقل ۲ گزینه لازم است" }, { status: 400 })
      if (options.some((o: string) => o.length > 80)) return NextResponse.json({ error: "هر گزینه حداکثر ۸۰ کاراکتر" }, { status: 400 })
      const topic = await db.forumTopic.findUnique({ where: { id: tid } })
      if (!topic) return NextResponse.json({ error: "تاپیک یافت نشد" }, { status: 404 })
      const votes: PollVotes = {}
      const p = await db.forumPoll.create({
        data: { topicId: tid, question, options: options as unknown as Prisma.InputJsonValue, votes: votes as unknown as Prisma.InputJsonValue, createdBy: user.id },
      })
      return NextResponse.json({ ok: true, id: p.id, message: "نظرسنجی ساخته شد." })
    }

    if (action === "poll_vote") {
      const pid = Number(body.pollId)
      const idx = Number(body.optionIndex)
      const poll = await db.forumPoll.findUnique({ where: { id: pid } })
      if (!poll) return NextResponse.json({ error: "نظرسنجی یافت نشد" }, { status: 404 })
      const options = Array.isArray(poll.options) ? (poll.options as string[]) : []
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
        return NextResponse.json({ error: "گزینه نامعتبر است" }, { status: 400 })
      }
      const votes = (poll.votes && typeof poll.votes === "object" && !Array.isArray(poll.votes) ? poll.votes : {}) as PollVotes
      votes[user.id] = idx
      await db.forumPoll.update({ where: { id: pid }, data: { votes: votes as unknown as Prisma.InputJsonValue } })
      return NextResponse.json({ ok: true, message: "رأی شما ثبت شد" })
    }

    if (action === "poll_delete") {
      const pid = Number(body.pollId)
      const poll = await db.forumPoll.findUnique({ where: { id: pid } })
      if (!poll) return NextResponse.json({ error: "نظرسنجی یافت نشد" }, { status: 404 })
      if (!isAdmin && poll.createdBy !== user.id) {
        return NextResponse.json({ error: "فقط سازنده یا ادمین می‌تواند نظرسنجی را حذف کند" }, { status: 403 })
      }
      await db.forumPoll.delete({ where: { id: pid } })
      return NextResponse.json({ ok: true, message: "نظرسنجی حذف شد." })
    }

    if (action === "weekly_question") {
      if (!isAdmin) return NextResponse.json({ error: "فقط ادمین کل می‌تواند سوال هفته بگذارد" }, { status: 403 })
      const question = String(body.question ?? "").trim().slice(0, 300)
      if (question.length < 5) return NextResponse.json({ error: "متن سوال حداقل ۵ کاراکتر باشد" }, { status: 400 })
      // تاپیک گفتگو برای این سوال — سنجاق‌شده و بالای فهرست
      const t = await db.forumTopic.create({
        data: { title: `❓ سوال هفته: ${question.slice(0, 110)}`, type: "brainstorm", pinned: true, createdBy: user.id, creatorName: user.fullName },
      })
      const wq = await db.forumWeeklyQuestion.create({ data: { question, topicId: t.id, createdBy: user.id } })
      // اعلان به همه اعضای فعال
      const members = await db.user.findMany({ where: { status: "active", id: { not: user.id } }, select: { id: true } })
      for (const mem of members) {
        await notifyUser(
          mem.id, "forum", "❓ سوال هفته ادمین",
          `${user.fullName} سوال هفته را مطرح کرد: ${question.slice(0, 120)}`,
          `forum-topic:${t.id}`,
          { force: true },
        ).catch(() => {})
      }
      return NextResponse.json({ ok: true, id: wq.id, topicId: t.id, message: "سوال هفته ثبت شد و به همه اطلاع‌رسانی شد." })
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
