import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { toJalali, jalaliMonthLength, jalaliToDate } from "@/lib/jalali"
import { tehranDayKey } from "@/lib/server/tz"
import { activeUser } from "@/lib/server/session"

// تقویم محتوا — اخبار هر روز ماه جلالی.
// پایه هر خبر: زمان تهیه (preparedAt) و اگر خالی بود، زمان ثبت (createdAt).
// پاسخ: items با ستاره روز جلالی (jd) برای همان ماه + شمارش کل.
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 3600 * 1000)

export async function GET(req: NextRequest) {
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })

  const now = new Date()
  let jy = Number(req.nextUrl.searchParams.get("jy")) || 0
  let jm = Number(req.nextUrl.searchParams.get("jm")) || 0
  if (!jy || !jm) {
    const j = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())
    jy = j.jy
    jm = j.jm
  }
  jm = Math.min(12, Math.max(1, jm))
  const mine = req.nextUrl.searchParams.get("mine") === "1"

  const monthStart = jalaliToDate(jy, jm, 1)
  const endJm = jm === 12 ? 1 : jm + 1
  const endJy = jm === 12 ? jy + 1 : jy
  const monthEnd = jalaliToDate(endJy, endJm, 1)
  // پنجره ±۱ روز برای پوشش اختلاف منطقه زمانی — فیلتر دقیق روز در ادامه با کلید تهران
  const from = addDays(monthStart, -1)
  const to = addDays(monthEnd, 1)

  const rows = await db.newsItem.findMany({
    where: {
      ...(mine ? { reporterId: user.id } : {}),
      OR: [
        { preparedAt: { gte: from, lt: to } },
        { AND: [{ preparedAt: null }, { createdAt: { gte: from, lt: to } }] },
      ],
    },
    include: { reporter: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  })

  const items = [] as {
    id: number; code: string; title: string; category: string; status: string
    reporterName: string; jd: number; time: string; prepared: boolean
  }[]
  for (const n of rows) {
    const base = n.preparedAt ?? n.createdAt
    const key = tehranDayKey(base) // YYYY-MM-DD میلادیِ روز تهران
    const [gy, gm, gd] = key.split("-").map(Number)
    const j = toJalali(gy, gm, gd)
    if (j.jy !== jy || j.jm !== jm) continue
    items.push({
      id: n.id,
      code: n.code,
      title: n.title,
      category: n.category,
      status: n.status,
      reporterName: n.reporter.fullName,
      jd: j.jd,
      time: new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(base),
      prepared: !!n.preparedAt,
    })
  }

  return NextResponse.json({ jy, jm, monthLength: jalaliMonthLength(jy, jm), items })
}
