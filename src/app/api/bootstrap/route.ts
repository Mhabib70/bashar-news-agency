import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// لیست حساب‌های دمو برای صفحه ورود
export async function GET() {
  const users = await db.user.findMany({
    select: { id: true, fullName: true, role: true, district: true, base: true, levelKey: true, points: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  })
  return NextResponse.json({ users })
}
