import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizePhone } from "@/lib/domain"
import { attachSession } from "@/lib/server/session"
import { verifyPin } from "@/lib/server/pin"

// مرحله دوم ورود برای حساب‌هایی که PIN (رمز دوم) دارند.
// پس از پاسخ درست، کوکی نشست صادر می‌شود.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const norm = normalizePhone(body?.phone ?? "")
    const pin = String(body?.pin ?? "").trim()
    if (norm.length !== 10 || !pin) {
      return NextResponse.json({ ok: false, error: "شماره یا PIN ناقص است" }, { status: 400 })
    }

    const users = await db.user.findMany({
      select: { id: true, fullName: true, phone: true, status: true, pinHash: true },
    })
    const u = users.find((x) => normalizePhone(x.phone) === norm)
    if (!u || !u.pinHash || u.status !== "active") {
      return NextResponse.json({ ok: false, error: "ورود با PIN ممکن نیست" }, { status: 403 })
    }
    if (!verifyPin(pin, u.pinHash)) {
      return NextResponse.json({ ok: false, error: "PIN اشتباه است" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true, userId: u.id, fullName: u.fullName })
    return attachSession(res, u.id, req)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: "خطا در ورود — دوباره تلاش کنید" }, { status: 500 })
  }
}
