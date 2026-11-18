import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { toJalali, jalaliToDate, JALALI_MONTHS } from "@/lib/jalali"
import { activeUser } from "@/lib/server/session"

// سالنامهٔ خبرنگار — جمع‌بندی سال جلالی (معادل «پوشهٔ سالانه» ربات).
// پایهٔ زمانی هر خبر: preparedAt و اگر خالی بود createdAt.
// شامل: کل خبرها به تفکیک وضعیت، بازدید و واکنش ایتا، دقیقهٔ کار،
// ماهِ پرکار، روزهای فعال، نخستین خبر، پربازدیدترین خبر و امتیاز کسب‌شدهٔ سال.
export async function GET(req: NextRequest) {
  const user = await activeUser(req)
  if (!user) return NextResponse.json({ error: "نشست معتبر نیست — دوباره وارد شوید" }, { status: 401 })

  const now = new Date()
  const cj = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const jy = Number(req.nextUrl.searchParams.get("jy")) || cj.jy

  const yearStart = jalaliToDate(jy, 1, 1)
  const nextStart = jalaliToDate(jy + 1, 1, 1)

  const news = await db.newsItem.findMany({
    where: {
      reporterId: user.id,
      OR: [
        { preparedAt: { gte: yearStart, lt: nextStart } },
        { AND: [{ preparedAt: null }, { createdAt: { gte: yearStart, lt: nextStart } }] },
      ],
    },
    select: {
      code: true, title: true, status: true, views: true, eitaaReactions: true,
      durationMin: true, preparedAt: true, createdAt: true,
    },
  })

  let approved = 0, rejected = 0, pending = 0
  let views = 0, reactions = 0, minutes = 0
  const perMonth = new Array(12).fill(0) as number[]
  const activeDayKeys = new Set<string>()
  let first: { title: string; at: Date } | null = null
  let top: { code: string; title: string; views: number; reactions: number } | null = null

  for (const n of news) {
    const base = n.preparedAt ?? n.createdAt
    if (n.status === "approved") {
      approved++
      views += n.views
      reactions += n.eitaaReactions
      if (!top || n.views > top.views) top = { code: n.code, title: n.title, views: n.views, reactions: n.eitaaReactions }
      if (!first || base < first.at) first = { title: n.title, at: base }
    } else if (n.status === "rejected") rejected++
    else pending++
    minutes += n.durationMin

    const j = toJalali(base.getFullYear(), base.getMonth() + 1, base.getDate())
    if (j.jy === jy) {
      perMonth[j.jm - 1]++
      activeDayKeys.add(`${j.jm}-${j.jd}`)
    }
  }

  const bestMonthIdx = perMonth.indexOf(Math.max(...perMonth))
  const pointsAgg = await db.pointsLog.aggregate({
    _sum: { amount: true },
    where: { userId: user.id, createdAt: { gte: yearStart, lt: nextStart } },
  })

  return NextResponse.json({
    jy,
    yearLabel: `سالنامهٔ ${toFaDigits(jy)}`,
    totals: {
      all: news.length, approved, rejected, pending,
      views, reactions, minutes,
      activeDays: activeDayKeys.size,
      points: pointsAgg._sum.amount ?? 0,
    },
    perMonth,
    monthNames: JALALI_MONTHS,
    bestMonth: news.length ? { index: bestMonthIdx, name: JALALI_MONTHS[bestMonthIdx], count: perMonth[bestMonthIdx] } : null,
    firstNews: first ? { title: first.title, at: first.at.toISOString() } : null,
    topNews: top,
  })
}

// ارقام فارسی برای برچسب سال — بدون وابستگی به فرمت‌های سمت کلاینت
function toFaDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
}
