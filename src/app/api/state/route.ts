import { NextRequest, NextResponse } from "next/server"
import { getAppState } from "@/lib/server/state"
import { activeUser } from "@/lib/server/session"

export async function GET(req: NextRequest) {
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })
  const state = await getAppState(user.id)
  if (!state) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
  return NextResponse.json(state)
}
