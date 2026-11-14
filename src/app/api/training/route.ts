import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyActiveUsers } from "@/lib/server/notify"
import { activeUser } from "@/lib/server/session"

// بخش آموزش (آکادمی) v2 — دسته‌بندی، سطح، مدت مطالعه، بازدید و پیشرفت «خوانده شد»
// GET          → فهرست آموزش‌ها + پیشرفت کاربر (همه اعضای فعال)
// POST create  → افزودن (ادمین کل و مدیر حوزه) { userId, action:"create", title, body, kind, fileUrl, category, level, minutes } + اعلان همگانی
// POST delete  → حذف { userId, action:"delete", id }
// POST view    → ثبت بازدید { userId, action:"view", id }
// POST complete→ کلید خوانده‌شده { userId, action:"complete", id }

const CATEGORIES = ["writing", "photo", "reporting", "media", "tech"]
const LEVELS = ["beginner", "intermediate", "advanced"]

export async function GET(req: NextRequest) {
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
  const userId = user.id

  const rows = await db.training.findMany({
    orderBy: { createdAt: "desc" },
    include: { progress: { select: { userId: true } } },
  })
  const trainings = rows.map((t) => ({
    id: t.id, title: t.title, body: t.body, kind: t.kind, fileUrl: t.fileUrl,
    category: t.category, level: t.level, minutes: t.minutes, views: t.views,
    authorName: t.authorName, createdAt: t.createdAt.toISOString(),
    readers: t.progress.length,
    completed: t.progress.some((p) => p.userId === userId),
  }))
  return NextResponse.json({
    trainings,
    stats: {
      total: trainings.length,
      completed: trainings.filter((t) => t.completed).length,
      minutes: trainings.filter((t) => t.completed).reduce((s, t) => s + t.minutes, 0),
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body ?? {}
    const user = await activeUser(req)
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    if (action === "create") {
      if (!["admin", "district_manager"].includes(user.role)) {
        return NextResponse.json({ error: "افزودن آموزش فقط برای ادمین کل و مدیر حوزه مجاز است" }, { status: 403 })
      }
      const title = String(body.title ?? "").trim().slice(0, 150)
      const content = String(body.body ?? "").trim().slice(0, 8000)
      const kind = ["text", "file", "video"].includes(body.kind) ? body.kind : "text"
      const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.startsWith("/uploads/") ? body.fileUrl : ""
      const category = CATEGORIES.includes(body.category) ? body.category : "writing"
      const level = LEVELS.includes(body.level) ? body.level : "beginner"
      const minutes = Math.min(180, Math.max(1, Number(body.minutes) || 5))
      if (title.length < 3) return NextResponse.json({ error: "عنوان حداقل ۳ کاراکتر باشد" }, { status: 400 })
      if (kind !== "text" && !fileUrl) return NextResponse.json({ error: "برای آموزش فایل/ویدئو، ابتدا فایل را بارگذاری کنید" }, { status: 400 })
      const t = await db.training.create({
        data: { title, body: content, kind, fileUrl, category, level, minutes, authorId: user.id, authorName: user.fullName },
      })
      // اعلان همگانی انتشار آموزش (با احترام به تنظیمات و ساعت سکوت)
      const catLabel: Record<string, string> = { writing: "نگارش و لید", photo: "عکاسی خبری", reporting: "گزارشگری و مصاحبه", media: "رسانه و اخلاق", tech: "اپ و ابزار" }
      let sent = 0
      try {
        sent = await notifyActiveUsers(
          "broadcast",
          `🎓 آموزش جدید: ${title}`,
          `${user.fullName} یک آموزش در بخش «${catLabel[category]}» منتشر کرد. از بخش آموزش بخوانید.`,
          `training:${t.id}`,
        )
      } catch (e) {
        console.error("training notify failed", e)
      }
      return NextResponse.json({ ok: true, id: t.id, sent, message: `آموزش «${title}» منتشر شد${sent > 0 ? ` و برای ${sent} عضو اعلان رفت` : ""}.` })
    }

    if (action === "delete") {
      if (!["admin", "district_manager"].includes(user.role)) {
        return NextResponse.json({ error: "حذف آموزش فقط برای ادمین کل و مدیر حوزه مجاز است" }, { status: 403 })
      }
      const id = Number(body.id)
      const t = await db.training.findUnique({ where: { id } })
      if (!t) return NextResponse.json({ error: "آموزش یافت نشد" }, { status: 404 })
      await db.training.delete({ where: { id } })
      return NextResponse.json({ ok: true, message: `آموزش «${t.title}» حذف شد.` })
    }

    if (action === "view") {
      const id = Number(body.id)
      const t = await db.training.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => null)
      if (!t) return NextResponse.json({ error: "آموزش یافت نشد" }, { status: 404 })
      return NextResponse.json({ ok: true, views: t.views })
    }

    if (action === "complete") {
      const id = Number(body.id)
      const t = await db.training.findUnique({ where: { id }, include: { progress: { where: { userId: user.id } } } })
      if (!t) return NextResponse.json({ error: "آموزش یافت نشد" }, { status: 404 })
      if (t.progress.length > 0) {
        await db.trainingProgress.delete({ where: { id: t.progress[0].id } })
        return NextResponse.json({ ok: true, completed: false, message: "علامت «خوانده شد» برداشته شد." })
      }
      await db.trainingProgress.create({ data: { trainingId: id, userId: user.id } })
      return NextResponse.json({ ok: true, completed: true, message: "آفرین! این درس را خواندید ✓" })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت آموزش‌ها" }, { status: 500 })
  }
}
