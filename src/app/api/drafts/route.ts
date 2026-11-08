import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// پیش‌نویس خبر (سناریوی ۸)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, title, content, draftId } = body ?? {}
    const user = await activeUser(req)
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
    const userId = user.id
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
