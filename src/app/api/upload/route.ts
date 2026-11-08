import { NextRequest, NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// آپلود رسانه (عکس/ویدیو/فایل آموزش) — ذخیره در public/uploads و سرو از همان مسیر
// سقف عکس ۳۰MB و ویدیو ۳۰MB (انجینکس 64m است تا multipart بدون خطای 413 رد شود)
const MAX_BYTES = 30 * 1024 * 1024
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/bmp": ".bmp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "application/pdf": ".pdf",
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const user = await activeUser(req)
    const userId = user?.id ?? ""
    const file = fd.get("file")
    if (!user || !(file instanceof File)) {
      return NextResponse.json({ error: "فایل ارسال نشده است" }, { status: 400 })
    }

    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    const ext = EXT_BY_TYPE[file.type] ?? path.extname(file.name).toLowerCase()
    const isVideo = file.type.startsWith("video/")
    const isDoc = file.type === "application/pdf"
    if (!file.type.startsWith("image/") && !isVideo && !isDoc) {
      return NextResponse.json({ error: "فرمت پشتیبانی نمی‌شود — عکس، ویدیو یا PDF ارسال کنید" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۳۰ مگابایت باشد" }, { status: 400 })
    }

    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || (isVideo ? ".mp4" : ".jpg")}`
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, name), buf)

    return NextResponse.json({
      ok: true,
      url: `/uploads/${name}`,
      mediaType: isVideo ? "video" : "photo",
      message: "فایل بارگذاری شد",
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "بارگذاری فایل ناموفق بود" }, { status: 500 })
  }
}
