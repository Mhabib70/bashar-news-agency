import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// پیش‌نویس خبر (سناریوی ۸)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, category, title, content, draftId } = body ?? {}
    if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
    if (draftId) {
      const existing = await db.draft.findUnique({ where: { id: Number(draftId) } })
      if (!existing || existing.userId !== userId) return NextResponse.json({ error: "پیش‌نویس یافت نشد" }, { status: 404 })
      await db.draft.update({
        where: { id: existing.id },
        data: { category: category || existing.category, title: title ?? existing.title, content: content ?? existing.content, savedAt: new Date() },
      })
      return NextResponse.json({ ok: true, message: "پیش‌نویس به‌روزرسانی شد." })
    }
    const d = await db.draft.create({
      data: { userId, category: category || "none", title: (title ?? "").slice(0, 200), content: content ?? "" },
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
    const userId = req.nextUrl.searchParams.get("userId")
    if (!id || !userId) return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    const d = await db.draft.findUnique({ where: { id: Number(id) } })
    if (!d || d.userId !== userId) return NextResponse.json({ error: "پیش‌نویس یافت نشد" }, { status: 404 })
    await db.draft.delete({ where: { id: d.id } })
    return NextResponse.json({ ok: true, message: "پیش‌نویس حذف شد." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در حذف پیش‌نویس" }, { status: 500 })
  }
}
