import { NextRequest, NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { db } from "@/lib/db"

// آپلود رسانه خبر (عکس/ویدیو) — ذخیره در public/uploads و سرو از همان مسیر
// حجم مجاز: ۲۰ مگابایت (هماهنگ با client_max_body_size انجینکس)
const MAX_BYTES = 20 * 1024 * 1024
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const userId = String(fd.get("userId") ?? "")
    const file = fd.get("file")
    if (!userId || !(file instanceof File)) {
      return NextResponse.json({ error: "فایل ارسال نشده است" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }

    const ext = EXT_BY_TYPE[file.type] ?? path.extname(file.name).toLowerCase()
    const isVideo = file.type.startsWith("video/")
    if (!file.type.startsWith("image/") && !isVideo) {
      return NextResponse.json({ error: "فقط عکس یا ویدیو قابل ارسال است" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۲۰ مگابایت باشد" }, { status: 400 })
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
