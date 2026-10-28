import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { CATEGORY_LABELS, DISTRICT_LABELS, ROLE_LABELS, EDUCATION_LABELS, LEVELS, levelFor } from "@/lib/domain"

function csv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n")
}

function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

const jalaliDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeZone: "Asia/Tehran" }).format(d) : ""

// خروجی CSV — کاربران/اخبار/گزارش حوزه‌ها (ادمین) و کارت خبرنگاری (خود کاربر یا ادمین)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const type = sp.get("type") ?? "users"
  const requester = await db.user.findUnique({ where: { id: sp.get("userId") ?? "" } })
  if (!requester || requester.status !== "active") {
    return new Response(JSON.stringify({ error: "دسترسی مجاز نیست" }), { status: 403 })
  }
  const isAdmin = requester.role === "admin"

  if (type === "users") {
    if (!isAdmin) return new Response(JSON.stringify({ error: "فقط ادمین" }), { status: 403 })
    const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { points: "desc" }] })
    const rows: (string | number)[][] = [
      ["نام و نام خانوادگی", "نام کاربری", "نقش", "وضعیت", "حوزه", "پایگاه", "تلفن", "سن", "تحصیلات", "امتیاز", "سطح", "استریک فعلی", "تاریخ عضویت"],
      ...users.map((u) => [
        u.fullName, u.username, ROLE_LABELS[u.role] ?? u.role,
        u.status === "active" ? "فعال" : u.status === "pending" ? "در انتظار تایید" : "رد شده",
        DISTRICT_LABELS[u.district] ?? u.district, u.base, u.phone, u.age,
        EDUCATION_LABELS[u.education] ?? u.education, u.points,
        levelFor(u.points).title, u.currentStreak, jalaliDate(u.createdAt),
      ]),
    ]
    return csvResponse(csv(rows), "basij-users.csv")
  }

  if (type === "news") {
    if (!isAdmin) return new Response(JSON.stringify({ error: "فقط ادمین" }), { status: 403 })
    const news = await db.newsItem.findMany({ include: { reporter: { select: { fullName: true, district: true } } }, orderBy: { id: "desc" } })
    const stageLabel: Record<string, string> = { district: "مدیر حوزه", specialist: "کارشناس", admin: "ادمین کل" }
    const rows: (string | number)[][] = [
      ["کد پیگیری", "تیتر", "دسته", "خبرنگار", "حوزه", "وضعیت", "مرحله فعلی", "رسانه", "زمان تهیه (دقیقه)", "چالش", "تاریخ ثبت", "بررسی‌کننده"],
      ...news.map((n) => [
        n.code, n.title, CATEGORY_LABELS[n.category] ?? n.category, n.reporter.fullName,
        DISTRICT_LABELS[n.district] ?? n.district,
        n.status === "approved" ? "تایید شده" : n.status === "rejected" ? "رد شده" : "در انتظار بررسی",
        n.status === "pending" ? (stageLabel[n.reviewStage] ?? "") : "",
        n.mediaType === "photo" ? "عکس" : n.mediaType === "video" ? "ویدیو" : "بدون رسانه",
        n.durationMin, n.challengeId ?? "", jalaliDate(n.createdAt), n.reviewedBy,
      ]),
    ]
    return csvResponse(csv(rows), "basij-news.csv")
  }

  if (type === "districts") {
    if (!isAdmin) return new Response(JSON.stringify({ error: "فقط ادمین" }), { status: 403 })
    const districts = Object.keys(DISTRICT_LABELS)
    const users = await db.user.findMany({ select: { district: true, points: true, role: true } })
    const news = await db.newsItem.findMany({ select: { district: true, status: true } })
    const rows: (string | number)[][] = [["حوزه", "اعضا", "خبرنگار", "کل اخبار", "تاییدشده", "ردشده", "در بررسی", "مجموع امتیاز اعضا"]]
    for (const d of districts) {
      const du = users.filter((u) => u.district === d)
      const dn = news.filter((n) => n.district === d)
      rows.push([
        DISTRICT_LABELS[d], du.length, du.filter((u) => u.role === "reporter").length,
        dn.length, dn.filter((n) => n.status === "approved").length,
        dn.filter((n) => n.status === "rejected").length, dn.filter((n) => n.status === "pending").length,
        du.reduce((s, u) => s + u.points, 0),
      ])
    }
    return csvResponse(csv(rows), "basij-districts.csv")
  }

  if (type === "presscard") {
    const targetId = sp.get("targetId") || requester.id
    if (targetId !== requester.id && !isAdmin) return new Response(JSON.stringify({ error: "فقط ادمین" }), { status: 403 })
    const u = await db.user.findUnique({ where: { id: targetId } })
    if (!u) return new Response(JSON.stringify({ error: "کاربر یافت نشد" }), { status: 404 })
    const [approved, rejected, badges] = await Promise.all([
      db.newsItem.count({ where: { reporterId: u.id, status: "approved" } }),
      db.newsItem.count({ where: { reporterId: u.id, status: "rejected" } }),
      db.userBadge.findMany({ where: { userId: u.id } }),
    ])
    const total = approved + rejected
    const rows: (string | number)[][] = [
      ["کارت خبرنگاری دیجیتال — خبرگزاری بسیج شهر رشت"],
      ["نام و نام خانوادگی", u.fullName],
      ["نام کاربری", u.username],
      ["نقش", ROLE_LABELS[u.role] ?? u.role],
      ["حوزه", DISTRICT_LABELS[u.district] ?? u.district],
      ["پایگاه", u.base],
      ["تلفن", u.phone],
      ["تحصیلات", EDUCATION_LABELS[u.education] ?? u.education],
      ["سطح", `${levelFor(u.points).title} (${levelFor(u.points).emoji})`],
      ["امتیاز کل", u.points],
      ["بهترین استریک", `${u.bestStreak} روز`],
      ["اخبار تاییدشده", approved],
      ["اخبار ردشده", rejected],
      ["نرخ تایید", total ? `${Math.round((approved / total) * 100)}٪` : "—"],
      ["نشان‌ها", badges.map((b) => b.badgeKey).join(" | ")],
      ["تاریخ عضویت", jalaliDate(u.createdAt)],
    ]
    return csvResponse(csv(rows), `basij-presscard-${u.username}.csv`)
  }

  return new Response(JSON.stringify({ error: "نوع خروجی نامعتبر" }), { status: 400 })
}
