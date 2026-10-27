import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// لیست حساب‌های فعال برای صفحه ورود (کاربران در انتظار/ردشده وارد نمی‌شوند)
export async function GET() {
  const users = await db.user.findMany({
    where: { status: "active" },
    select: { id: true, fullName: true, role: true, district: true, base: true, levelKey: true, points: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  })
  return NextResponse.json({ users })
}
