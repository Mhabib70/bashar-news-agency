import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUser } from "@/lib/server/notify"
import { USER_REJECT_TITLES } from "@/lib/domain"

// مدیریت کاربران — فقط ادمین کل (معادل سناریوی ۱ ربات: لیست + تایید/رد عضویت با دلیل)
export async function GET(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("userId")
  const admin = await db.user.findUnique({ where: { id: adminId ?? "" } })
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }
  const users = await db.user.findMany({
    select: {
      id: true, fullName: true, username: true, role: true, status: true, rejectReason: true,
      district: true, base: true, phone: true, age: true, education: true,
      points: true, levelKey: true, currentStreak: true, createdAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // pending اول
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action, targetId, reason } = body ?? {}
    const admin = await db.user.findUnique({ where: { id: userId } })
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (target.id === admin.id) return NextResponse.json({ error: "تغییر وضعیت حساب خودتان ممکن نیست" }, { status: 400 })

    if (action === "approve") {
      if (target.status !== "pending") {
        return NextResponse.json({ error: "فقط درخواست‌های در انتظار تایید قابل تایید هستند" }, { status: 409 })
      }
      await db.user.update({ where: { id: target.id }, data: { status: "active", rejectReason: "" } })
      await notifyUser(target.id, "user_status", "✅ عضویت شما تایید شد", `${admin.fullName} درخواست عضویت شما را تایید کرد. از این پس می‌توانید خبر ارسال کنید.`, `user:${target.id}`, { force: true })
      return NextResponse.json({ ok: true, message: `عضویت ${target.fullName} تایید شد.` })
    }

    if (action === "reject") {
      if (target.status !== "pending") {
        return NextResponse.json({ error: "فقط درخواست‌های در انتظار قابل رد هستند" }, { status: 409 })
      }
      const reasonKey = reason && USER_REJECT_TITLES[reason] ? reason : "other"
      await db.user.update({ where: { id: target.id }, data: { status: "rejected", rejectReason: reasonKey } })
      await notifyUser(target.id, "user_status", "❌ درخواست عضویت شما رد شد", `دلیل: ${USER_REJECT_TITLES[reasonKey]} — در صورت نیاز می‌توانید مجدداً ثبت‌نام کنید.`, `user:${target.id}`, { force: true })
      return NextResponse.json({ ok: true, message: `درخواست ${target.fullName} رد شد (${USER_REJECT_TITLES[reasonKey]}).` })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت کاربران" }, { status: 500 })
  }
}
