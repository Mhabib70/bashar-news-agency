import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// پیش‌نویس خبر (سناریوی ۸) — کامل با رسانه، زمان صرف‌شده و زمان تهیه
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, title, content, mediaType, mediaUrl, durationMin, preparedAt, draftId } = body ?? {}
    const user = await activeUser(req)
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
    const userId = user.id
    const patch = {
      category: category || "none",
      title: typeof title === "string" ? title.slice(0, 200) : undefined,
      content: typeof content === "string" ? content : undefined,
      mediaType: ["photo", "video", "none"].includes(mediaType) ? mediaType : undefined,
      mediaUrl: typeof mediaUrl === "string" && mediaUrl.startsWith("/uploads/") ? mediaUrl : undefined,
      durationMin: Number.isFinite(Number(durationMin)) ? Math.max(0, Math.min(600, Number(durationMin))) : undefined,
      preparedAt: preparedAt ? new Date(String(preparedAt)) : undefined,
      savedAt: new Date(),
    }
    if (draftId) {
      const existing = await db.draft.findUnique({ where: { id: Number(draftId) } })
      if (!existing || existing.userId !== userId) return NextResponse.json({ error: "پیش‌نویس یافت نشد" }, { status: 404 })
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
      await db.draft.update({ where: { id: existing.id }, data: clean })
      return NextResponse.json({ ok: true, id: existing.id, message: "پیش‌نویس به‌روزرسانی شد." })
    }
    const d = await db.draft.create({
      data: {
        userId,
        category: patch.category,
        title: patch.title ?? "",
        content: patch.content ?? "",
        mediaType: patch.mediaType ?? "none",
        mediaUrl: patch.mediaUrl ?? "",
        durationMin: patch.durationMin ?? 0,
        ...(patch.preparedAt ? { preparedAt: patch.preparedAt } : {}),
      },
    })
    return NextResponse.json({ ok: true, id: d.id, message: "پیش‌نویس ذخیره شد." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ذخیره پیش‌نویس" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    const user = await activeUser(req)
    if (!id || !user) return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    const userId = user.id
    const d = await db.draft.findUnique({ where: { id: Number(id) } })
    if (!d || d.userId !== userId) return NextResponse.json({ error: "پیش‌نویس یافت نشد" }, { status: 404 })
    await db.draft.delete({ where: { id: d.id } })
    return NextResponse.json({ ok: true, message: "پیش‌نویس حذف شد." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در حذف پیش‌نویس" }, { status: 500 })
  }
}
