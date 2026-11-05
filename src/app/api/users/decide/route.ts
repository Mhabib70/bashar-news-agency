import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { USER_REJECT_TITLES } from "@/lib/domain"

// تایید یا رد درخواست عضویت (_decide_user ربات) — ادمین کل یا مدیر حوزه همان حوزه
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, targetId, action, reason } = body ?? {}
    if (!userId || !targetId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "پارامترهای ناقص" }, { status: 400 })
    }
    const actor = await db.user.findUnique({ where: { id: userId } })
    if (!actor || !["admin", "district_manager"].includes(actor.role)) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (target.status !== "pending") {
      return NextResponse.json({ error: "این کاربر در انتظار بررسی نیست" }, { status: 409 })
    }
    if (actor.role === "district_manager" && (target.district !== actor.district || target.role !== "reporter")) {
      return NextResponse.json({ error: "فقط درخواست‌های حوزه خودتان در اختیار شماست" }, { status: 403 })
    }

    if (action === "approve") {
      await db.user.update({ where: { id: target.id }, data: { status: "active" } })
      return NextResponse.json({ ok: true, message: `عضویت ${target.fullName} تایید و فعال شد.` })
    }

    // رد با دلیل (پیش‌فرض ربات یا متن دلخواه)
    let reasonText = ""
    if (reason && USER_REJECT_TITLES[reason]) reasonText = USER_REJECT_TITLES[reason]
    else reasonText = String(reason ?? "").trim().slice(0, 100) || "بدون دلیل"
    await db.user.update({
      where: { id: target.id },
      data: { status: "rejected", rejectReason: reasonText },
    })
    return NextResponse.json({ ok: true, message: `درخواست ${target.fullName} با دلیل «${reasonText}» رد شد.` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در بررسی درخواست" }, { status: 500 })
  }
}
