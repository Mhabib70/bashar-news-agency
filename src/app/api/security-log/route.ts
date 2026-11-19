import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activeUser } from "@/lib/server/session"

// لاگ زندهٔ رویدادهای امنیتی — فقط ادمین کل
export async function GET(req: NextRequest) {
  const admin = await activeUser(req)
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 30), 100)
  const logs = await db.securityLog.findMany({ orderBy: { createdAt: "desc" }, take })
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      kind: l.kind,
      title: l.title,
      detail: l.detail,
      actorName: l.actorName,
      phone: l.phone,
      severity: l.severity,
      at: l.createdAt.toISOString(),
    })),
  })
}
