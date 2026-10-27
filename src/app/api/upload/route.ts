import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const ALLOWED: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
}
const MAX_SIZE = 5 * 1024 * 1024 // ۵ مگابایت

// آپلود واقعی رسانه خبر (عکس/ویدیو) — حداکثر ۵ مگابایت
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const userId = form.get("userId")
    const file = form.get("file")
    if (!userId || !(file instanceof File)) {
      return NextResponse.json({ error: "فایل ارسال نشده است" }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { id: String(userId) } })
    if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم فایل بیش از ۵ مگابایت است" }, { status: 413 })
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase()
    const mime = ALLOWED[ext] ?? file.type
    if (!Object.values(ALLOWED).includes(mime)) {
      return NextResponse.json({ error: "فرمت فایل مجاز نیست (عکس: jpg/png/webp/gif — ویدیو: mp4/mov/webm)" }, { status: 415 })
    }

    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    const name = `${randomUUID()}.${ext}`
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({ ok: true, url: `/uploads/${name}`, mediaType: mime.startsWith("video") ? "video" : "photo" })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 500 })
  }
}
