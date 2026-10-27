import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { CATEGORY_LABELS, DISTRICT_LABELS, LEVELS, ROLE_LABELS, statusLabel } from "@/lib/domain"

// خروجی CSV (exporter.py ربات — UTF-8 با BOM برای نمایش صحیح فارسی در اکسل)
function csv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))]
  return "\ufeff" + lines.join("\r\n")
}

function faDate(d: Date | null): string {
  if (!d) return "—"
  const date = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(d)
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(d)
  return `${date} - ${time}`
}

const NEWS_HEADERS = ["کد", "عنوان", "دسته", "خبرنگار", "حوزه", "وضعیت", "دلیل رد", "تاریخ ارسال"]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const type = searchParams.get("type") ?? "report"
    if (!userId) return NextResponse.json({ error: "پارامتر ناقص" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

    let body = ""
    let filename = ""

    if (type === "report") {
      // کارنامه فردی: همه اخبار خود کاربر
      const rows = await db.newsItem.findMany({ where: { reporterId: user.id }, include: { reporter: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } })
      body = csv(
        NEWS_HEADERS,
        rows.map((n) => [n.code, n.title, CATEGORY_LABELS[n.category] ?? n.category, n.reporter.fullName, DISTRICT_LABELS[n.district] ?? n.district, statusLabel(n.status), n.rejectReason || "", faDate(n.createdAt)]),
      )
      filename = "karname-man.csv"
    } else if (type === "news") {
      if (user.role === "reporter") return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
      const rows = await db.newsItem.findMany({
        where: user.role === "district_manager" ? { district: user.district } : {},
        include: { reporter: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      })
      body = csv(
        NEWS_HEADERS,
        rows.map((n) => [n.code, n.title, CATEGORY_LABELS[n.category] ?? n.category, n.reporter.fullName, DISTRICT_LABELS[n.district] ?? n.district, statusLabel(n.status), n.rejectReason || "", faDate(n.createdAt)]),
      )
      filename = user.role === "district_manager" ? "gozaresh-hoze.csv" : "akhbar.csv"
    } else if (type === "users") {
      if (user.role !== "admin") return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
      const users = await db.user.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] })
      body = csv(
        ["نام", "نقش", "حوزه", "پایگاه", "شماره تماس", "وضعیت", "امتیاز", "سطح", "تاریخ عضویت"],
        users.map((u) => [
          u.fullName,
          ROLE_LABELS[u.role] ?? u.role,
          DISTRICT_LABELS[u.district] ?? u.district,
          u.base,
          u.phone,
          u.status === "active" ? "فعال" : u.status === "pending" ? "در انتظار تایید" : "رد شده",
          u.points,
          LEVELS.find((l) => l.key === u.levelKey)?.title ?? u.levelKey,
          faDate(u.createdAt),
        ]),
      )
      filename = "karbaran.csv"
    } else {
      return NextResponse.json({ error: "نوع خروجی نامعتبر" }, { status: 400 })
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در تولید خروجی" }, { status: 500 })
  }
}
