import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAppState } from "@/lib/server/state"

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId لازم است" }, { status: 400 })
  const state = await getAppState(userId)
  if (!state) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
  return NextResponse.json(state)
}
