import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

const MAX_AVATAR_LEN = 400_000 // حدود ۳۰۰KB باینری بعد از base64
const AVATAR_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/

// ذخیره عکس پروفایل کاربر (data URL تغییر اندازه‌یافته در سمت کلاینت)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, avatar } = body ?? {}
    if (!userId) return NextResponse.json({ error: "کاربر مشخص نیست" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    if (avatar === "" || avatar === null || avatar === undefined) {
      await db.user.update({ where: { id: user.id }, data: { avatar: "" } })
      return NextResponse.json({ ok: true, message: "عکس پروفایل حذف شد." })
    }
    if (typeof avatar !== "string" || !AVATAR_RE.test(avatar)) {
      return NextResponse.json({ error: "فرمت عکس معتبر نیست (فقط PNG/JPG/WebP)" }, { status: 400 })
    }
    if (avatar.length > MAX_AVATAR_LEN) {
      return NextResponse.json({ error: "حجم عکس زیاد است — عکس کوچک‌تری انتخاب کنید" }, { status: 413 })
    }
    await db.user.update({ where: { id: user.id }, data: { avatar } })
    return NextResponse.json({ ok: true, message: "عکس پروفایل به‌روزرسانی شد." })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ذخیره عکس پروفایل" }, { status: 500 })
  }
}
