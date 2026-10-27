import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"

const MAX_PHOTO = 5 * 1024 * 1024 // ۵ مگابایت
const MAX_VIDEO = 25 * 1024 * 1024 // ۲۵ مگابایت

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
}

// آپلود واقعی رسانه (عکس ≤۵MB / ویدیو ≤۲۵MB) → public/uploads
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const userId = String(form.get("userId") ?? "")
    const file = form.get("file")
    if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 })

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.status !== "active") return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })

    const kind = file.type.startsWith("image/") ? "photo" : file.type.startsWith("video/") ? "video" : null
    if (!kind || !EXT[file.type]) {
      return NextResponse.json({ error: "فرمت فایل پشتیبانی نمی‌شود (JPG/PNG/WebP یا MP4/WebM/MOV)" }, { status: 415 })
    }
    const max = kind === "photo" ? MAX_PHOTO : MAX_VIDEO
    if (file.size > max) {
      return NextResponse.json({ error: `حجم فایل بیش از حد مجاز است (حداکثر ${kind === "photo" ? "۵" : "۲۵"} مگابایت)` }, { status: 413 })
    }

    const ext = EXT[file.type]
    const name = `${kind}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`
    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, name), buf)

    return NextResponse.json({
      ok: true,
      url: `/uploads/${name}`,
      mediaType: kind,
      message: kind === "photo" ? "عکس بارگذاری شد" : "ویدیو بارگذاری شد",
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در بارگذاری فایل" }, { status: 500 })
  }
}
