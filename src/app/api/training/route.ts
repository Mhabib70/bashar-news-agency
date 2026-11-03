import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// بخش آموزش — محتوای آموزشی برای خبرنگاران (متن/فایل/ویدئو)
// GET          → فهرست آموزش‌ها (همه اعضای فعال)
// POST create  → افزودن (ادمین کل و مدیر حوزه) { userId, action:"create", title, body, kind, fileUrl }
// POST delete  → حذف { userId, action:"delete", id }
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.status !== "active") return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })

  const rows = await db.training.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({
    trainings: rows.map((t) => ({
      id: t.id, title: t.title, body: t.body, kind: t.kind, fileUrl: t.fileUrl,
      authorName: t.authorName, createdAt: t.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action } = body ?? {}
    const user = await db.user.findUnique({ where: { id: String(userId ?? "") } })
    if (!user || !["admin", "district_manager"].includes(user.role) || user.status !== "active") {
      return NextResponse.json({ error: "افزودن آموزش فقط برای ادمین کل و مدیر حوزه مجاز است" }, { status: 403 })
    }

    if (action === "create") {
      const title = String(body.title ?? "").trim().slice(0, 150)
      const content = String(body.body ?? "").trim()
      const kind = ["text", "file", "video"].includes(body.kind) ? body.kind : "text"
      const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.startsWith("/uploads/") ? body.fileUrl : ""
      if (title.length < 3) return NextResponse.json({ error: "عنوان حداقل ۳ کاراکتر باشد" }, { status: 400 })
      if (kind !== "text" && !fileUrl) return NextResponse.json({ error: "برای آموزش فایل/ویدئو، ابتدا فایل را بارگذاری کنید" }, { status: 400 })
      const t = await db.training.create({
        data: { title, body: content, kind, fileUrl, authorId: user.id, authorName: user.fullName },
      })
      return NextResponse.json({ ok: true, id: t.id, message: `آموزش «${title}» منتشر شد.` })
    }

    if (action === "delete") {
      const id = Number(body.id)
      const t = await db.training.findUnique({ where: { id } })
      if (!t) return NextResponse.json({ error: "آموزش یافت نشد" }, { status: 404 })
      await db.training.delete({ where: { id } })
      return NextResponse.json({ ok: true, message: `آموزش «${t.title}» حذف شد.` })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت آموزش‌ها" }, { status: 500 })
  }
}
