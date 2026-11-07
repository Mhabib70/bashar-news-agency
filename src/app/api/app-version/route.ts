import { NextRequest, NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

// اطلاعات آخرین نسخه اپ — اپ اندروید و بنر وب از این endpoint چک می‌کنند.
// برای انتشار نسخه جدید فقط data/app-version.json را به‌روز کنید.
export const dynamic = "force-dynamic"

const FALLBACK = {
  versionCode: 12,
  versionName: "2.8.0",
  mandatory: true,
  apkUrl: "http://80.91.208.240/apk/BasijNews-v2.8.0.apk",
  notes:
    "به‌روزرسانی مهم: از این پس هر نسخه جدید، خودکار از داخل همین اپ نصب می‌شود — بدون نیاز به دریافت لینک جدید.",
}

export async function GET(req: NextRequest) {
  const current = Number(req.nextUrl.searchParams.get("current") || 0) || 0
  let info = FALLBACK
  try {
    info = JSON.parse(
      readFileSync(join(process.cwd(), "data", "app-version.json"), "utf8")
    )
  } catch {
    // فایل موجود نیست — از مقدار پیش‌فرض استفاده می‌شود
  }
  return NextResponse.json(
    { ...info, update: info.versionCode > current, current },
    { headers: { "Cache-Control": "no-store" } }
  )
}
