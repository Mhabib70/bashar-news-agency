"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, Eye, Heart, Loader2 } from "lucide-react"
import { toJalaali, jalaliToDate, jalaliMonthLength, jalaliMonthStartWeekday, jalaliToday, JALALI_MONTHS, JALALI_WEEKDAYS } from "@/lib/jalali"
import { fa } from "@/lib/format"
import { CATEGORY_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"

// تقویم محتوا — نمای ماهانه جلالی از خبرهای در راه و ثبت‌شده
// پایه هر خبر: «زمان تهیه» (انتخاب خبرنگار) و در نبودش، زمان ثبت
type CalendarItem = {
  id: number
  code: string
  title: string
  category: string
  status: string
  reporterName: string
  jd: number
  time: string
  prepared: boolean
}

const STATUS_DOT: Record<string, string> = {
  approved: "bg-[var(--v3-azure)]",
  rejected: "bg-red-500",
  pending: "bg-[var(--v3-amber)]",
}

const STATUS_LABEL: Record<string, string> = {
  approved: "منتشر شده",
  rejected: "رد شده",
  pending: "در بررسی",
}

export function ContentCalendar({ mine, onOpenNews }: { mine?: boolean; onOpenNews: (id: number) => void }) {
  const todayJ = jalaliToday()
  const [jy, setJy] = useState(todayJ.jy)
  const [jm, setJm] = useState(todayJ.jm)
  const [selJd, setSelJd] = useState<number | null>(todayJ.jd)
  const [items, setItems] = useState<CalendarItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/news/calendar?jy=${jy}&jm=${jm}${mine ? "&mine=1" : ""}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setItems(Array.isArray(d.items) ? d.items : [])
      })
      .catch(() => {
        if (alive) setItems([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [jy, jm, mine])

  const len = jalaliMonthLength(jy, jm)
  const offset = jalaliMonthStartWeekday(jy, jm)
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const byDay = new Map<number, CalendarItem[]>()
  for (const it of items ?? []) {
    const list = byDay.get(it.jd) ?? []
    list.push(it)
    byDay.set(it.jd, list)
  }
  const selItems = selJd ? byDay.get(selJd) ?? [] : []
  const monthTotal = items?.length ?? 0

  return (
    <div className="space-y-3">
      {/* ناوبری ماه */}
      <div className="flex items-center justify-between rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] px-2 py-1.5">
        <button
          onClick={() => (jm === 12 ? (setJy(jy + 1), setJm(1)) : setJm(jm + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--v3-ink-2)] transition-colors hover:bg-[var(--v3-card-2)] hover:text-[var(--v3-ink)]"
          aria-label="ماه بعد"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-1.5 text-[14.5px] font-black text-[var(--v3-ink)]">
          <CalendarDays className="h-4.5 w-4.5 text-[var(--v3-azure)]" />
          {JALALI_MONTHS[jm - 1]} {fa(jy)}
          <span className="text-[10.5px] font-bold text-[var(--v3-ink-2)]">· {fa(monthTotal)} خبر</span>
        </span>
        <button
          onClick={() => (jm === 1 ? (setJy(jy - 1), setJm(12)) : setJm(jm - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--v3-ink-2)] transition-colors hover:bg-[var(--v3-card-2)] hover:text-[var(--v3-ink)]"
          aria-label="ماه قبل"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* شبکه ماه */}
      <div className="v3-card p-3">
        <div className="grid grid-cols-7 gap-1 text-center">
          {JALALI_WEEKDAYS.map((w) => (
            <span key={w} className="py-1 text-[10.5px] font-bold text-[var(--v3-ink-2)]">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />
            const dayItems = byDay.get(d) ?? []
            const isToday = todayJ.jy === jy && todayJ.jm === jm && todayJ.jd === d
            const isSel = selJd === d
            return (
              <button
                key={d}
                onClick={() => setSelJd(isSel ? null : d)}
                className={cn(
                  "relative flex h-11 flex-col items-center justify-center rounded-xl text-[12px] font-bold transition-colors",
                  isSel
                    ? "bg-gradient-to-b from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.6)]"
                    : isToday
                      ? "border border-[var(--v3-azure)]/45 text-[var(--v3-azure)]"
                      : dayItems.length
                        ? "bg-[var(--v3-azure-soft)]/60 text-[var(--v3-ink)] hover:bg-[var(--v3-azure-soft)]"
                        : "text-[var(--v3-ink-2)] hover:bg-[var(--v3-card-2)]",
                )}
              >
                {fa(d)}
                {dayItems.length > 0 && (
                  <span className={cn("mt-0.5 flex items-center gap-0.5", isSel && "opacity-90")}>
                    {dayItems.slice(0, 3).map((it, k) => (
                      <span key={k} className={cn("h-1.5 w-1.5 rounded-full", isSel ? "bg-white" : STATUS_DOT[it.status] ?? "bg-[var(--v3-azure)]")} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {loading && (
          <p className="flex items-center justify-center gap-2 py-3 text-[11px] text-[var(--v3-ink-2)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال دریافت تقویم...
          </p>
        )}
      </div>

      {/* خبرهای روز انتخاب‌شده */}
      {selJd !== null && (
        <div className="space-y-2">
          <p className="text-[12.5px] font-black text-[var(--v3-ink)]">
            {fa(selJd)} {JALALI_MONTHS[jm - 1]} — {selItems.length > 0 ? `${fa(selItems.length)} خبر` : "بدون خبر"}
          </p>
          {selItems.map((it) => (
            <button
              key={it.id}
              onClick={() => onOpenNews(it.id)}
              className="v3-card flex w-full items-center gap-3 p-3 text-right transition-transform hover:scale-[1.01]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--v3-card-2)] text-[10px] font-black text-[var(--v3-ink-2)]">
                {it.prepared ? "ساعت" : "ثبت"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-[var(--v3-ink)]">{it.title}</span>
                <span className="mt-0.5 block text-[10px] text-[var(--v3-ink-2)]">
                  {it.code} · {it.time} · {it.reporterName} · {CATEGORY_LABELS[it.category] ?? "بدون دسته"}
                </span>
              </span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-black", it.status === "approved" ? "bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#93c5fd]" : it.status === "rejected" ? "bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-400" : "bg-[var(--v3-amber-soft)] text-amber-600 dark:text-amber-400")}>
                {STATUS_LABEL[it.status] ?? it.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* راهنما */}
      <p className="flex flex-wrap items-center gap-3 px-1 text-[10px] text-[var(--v3-ink-2)]">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[var(--v3-amber)]" /> در بررسی</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[var(--v3-azure)]" /> منتشر شده</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> رد شده</span>
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> پایه روز: زمان تهیه یا ثبت خبر</span>
        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> برای دیدن خبر، روی روز و سپس کارت بزنید</span>
      </p>
    </div>
  )
}
