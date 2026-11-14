import { NextRequest, NextResponse } from "next/server"
import { clearSession } from "@/lib/server/session"

// خروج — حذف کوکی نشست از سمت سرور
export async function POST(req: NextRequest) {
  return clearSession(NextResponse.json({ ok: true }), req)
}
