"use client"

import Image from "next/image"
import { useState } from "react"
import { Flame, Timer, FileText, MoreHorizontal, Trophy, CheckCircle2, XCircle, Gauge } from "lucide-react"
import { useApp } from "@/lib/store"
import { Ring, SectionHeader, StatCard, CountUp, Avatar } from "@/components/app/bits"
import { StatusDot } from "@/components/app/home"
import { NewsReaderDialog, type ReaderNews } from "@/components/app/news-reader"
import { fa, faNum, durFmt, jalali, jalaliDay, relTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LEVELS } from "@/lib/domain"

type RangeKey = "day" | "week" | "month"

const GOALS: Record<RangeKey, number> = { day: 100, week: 700, month: 3000 }
const RANGE_LABELS: Record<RangeKey, string> = { day: "امروز", week: "این هفته", month: "این ماه" }

export function ActivityScreen({
  onGotoNewsMine,
  onGotoProfile,
}: {
  onGotoNewsMine?: () => void
  onGotoProfile?: () => void
} = {}) {
  const { state, viewNews } = useApp()
  const [range, setRange] = useState<RangeKey>("day")
  // خوانندهٔ خبر — مطالعه در همین صفحه
  const [reader, setReader] = useState<ReaderNews | null>(null)
  const openReader = (n: ReaderNews) => {
    setReader(n)
    if (n.status === "approved" || !n.status) void viewNews(n.id)
  }
  if (!state) return null
  const stat = state.stats[range]
  const goal = GOALS[range]
  const maxBar = Math.max(10, ...state.stats.weekSeries.map((w) => w.points))
  const todayIdx = state.stats.weekSeries.length - 1

  return (
    <div className="stage-enter flex flex-col gap-5 px-5 pb-4 pt-6">
      {/* سربرگ */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-black text-[var(--v3-ink)]">فعالیت</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] text-[var(--v3-ink-2)] transition-colors hover:text-[var(--v3-ink)]" aria-label="بیشتر">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* تب‌ها — سگمنت قرصی */}
      <div className="flex rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] p-1">
        {(["day", "week", "month"] as RangeKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-[13px] font-bold transition-all",
              range === k
                ? "bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.65)]"
                : "text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
            )}
          >
            {k === "day" ? "روز" : k === "week" ? "هفته" : "ماه"}
          </button>
        ))}
      </div>

      {/* حلقه امتیاز */}
      <div className="flex flex-col items-center pt-1">
        <Ring value={stat.points} max={goal} size={190} stroke={13}>
          <span className="text-[12px] text-[var(--v3-ink-2)]">{RANGE_LABELS[range]}</span>
          <span className="v3-num mt-0.5 text-[38px] font-black leading-none text-[var(--v3-ink)]">
            <CountUp key={range} to={stat.points} fmt={faNum} />
          </span>
          <span className="mt-1 text-[11.5px] text-[var(--v3-ink-2)]">امتیاز</span>
        </Ring>
        <span className="mt-3 rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] px-4 py-1.5 text-[11.5px] font-bold text-[var(--v3-ink-2)]">
          هدف: {faNum(goal)} امتیاز
        </span>
      </div>

      {/* کارت‌های آمار */}
      <div className="flex gap-2.5">
        <StatCard icon={<Flame className="h-4.5 w-4.5" />} value={faNum(stat.points)} label="امتیاز" sub={RANGE_LABELS[range]} />
        <StatCard icon={<Timer className="h-4.5 w-4.5" />} value={durFmt(stat.activeMin)} label="زمان فعال" sub={RANGE_LABELS[range]} />
        <StatCard icon={<FileText className="h-4.5 w-4.5" />} value={fa(stat.newsCount)} label="خبر" sub={RANGE_LABELS[range]} />
      </div>

      {/* نمودار هفتگی */}
      {range !== "day" && (
        <div className="v3-card p-4">
          <SectionHeader title="روند امتیاز" />
          <div className="flex h-28 items-end justify-between gap-2">
            {state.stats.weekSeries.map((w, i) => (
              <div key={w.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold text-[var(--v3-ink-2)]">{w.points > 0 ? fa(w.points) : ""}</span>
                <div
                  className={cn(
                    "w-full max-w-[26px] rounded-t-full transition-all",
                    w.points > 0
                      ? i === todayIdx
                        ? "bg-gradient-to-t from-[var(--v3-amber)] to-[var(--v3-amber-2)]"
                        : "bg-gradient-to-t from-[var(--v3-azure-deep)] to-[var(--v3-azure-2)]"
                      : "bg-[var(--v3-card-2)]",
                  )}
                  style={{ height: `${Math.max(4, (w.points / maxBar) * 84)}px` }}
                />
                <span className="text-[9px] text-[var(--v3-ink-2)]">{jalaliDay(w.day + "T12:00:00")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* کارنامه من — آمار واقعی فردی (رتبه، نرخ تایید، تراز تایید/رد) */}
      <div className="v3-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[var(--v3-azure)]/12 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--v3-ink-2)]">
              <Gauge className="h-4 w-4 text-[var(--v3-azure)]" />
              کارنامه من
            </p>
            <h3 className="mt-1 text-[18px] font-black text-[var(--v3-ink)]">
              رتبه {fa(state.stats.rank || 0)} از {fa(state.stats.totalReporters)} خبرنگار
            </h3>
            <p className="mt-1 text-[11.5px] font-semibold text-[var(--v3-azure)]">نرخ تایید: {fa(state.stats.approveRate)}٪</p>
          </div>
          <button
            onClick={onGotoProfile}
            className="rounded-full border border-[var(--v3-azure)]/40 bg-[var(--v3-azure-soft)] px-3.5 py-2 text-[11px] font-bold text-[var(--v3-azure-deep)] transition-opacity hover:opacity-85 dark:text-[#93c5fd]"
          >
            جزئیات کامل در پروفایل
          </button>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-[var(--v3-line)] pt-4 text-center">
          <div>
            <p className="flex items-center justify-center gap-1 text-[15px] font-black text-[var(--v3-azure)]">
              <CheckCircle2 className="h-4 w-4" /> {fa(state.stats.totalApproved)}
            </p>
            <p className="mt-0.5 text-[9.5px] text-[var(--v3-ink-2)]">تاییدشده</p>
          </div>
          <div className="border-x border-[var(--v3-line)]">
            <p className="flex items-center justify-center gap-1 text-[15px] font-black text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" /> {fa(state.stats.totalRejected)}
            </p>
            <p className="mt-0.5 text-[9.5px] text-[var(--v3-ink-2)]">بازگشتی</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-[15px] font-black text-[var(--v3-amber)]">
              <Trophy className="h-4 w-4" /> {faNum(state.user.points)}
            </p>
            <p className="mt-0.5 text-[9.5px] text-[var(--v3-ink-2)]">امتیاز کل</p>
          </div>
        </div>
      </div>

      {/* رتبه‌بندی */}
      <div>
        <SectionHeader title="برترین خبرنگاران" action="کارنامه من" onAction={onGotoProfile} />
        <div className="space-y-2">
          {state.leaderboard.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-[18px] border px-4 py-3",
                r.isMe ? "border-[var(--v3-azure)]/40 bg-[var(--v3-azure-soft)]" : "border-[var(--v3-line)] bg-[var(--v3-card)]",
              )}
            >
              <div className="relative shrink-0">
                <Avatar name={r.fullName} src={r.avatar} size={40} />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-black ring-2 ring-[var(--v3-page)]",
                    r.rank === 1
                      ? "bg-gradient-to-br from-[var(--v3-amber-2)] to-[var(--v3-amber)] text-[#42290a]"
                      : r.isMe
                        ? "bg-[var(--v3-azure)] text-white"
                        : "bg-[var(--v3-card-2)] text-[var(--v3-ink-2)]",
                  )}
                >
                  {fa(r.rank)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-[var(--v3-ink)]">
                  {r.fullName} {r.isMe && <span className="text-[10px] font-bold text-[var(--v3-azure)]">(شما)</span>}
                </p>
                <p className="text-[10.5px] text-[var(--v3-ink-2)]">{LEVELS.find((l) => l.key === r.levelKey)?.title}</p>
              </div>
              <span className="v3-num text-[13px] font-black text-[var(--v3-azure)]">{faNum(r.points)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* آخرین اخبار — هر خبر با یک لمس باز و مطالعه می‌شود */}
      <div>
        <SectionHeader title="آخرین اخبار من" action="مشاهده همه" onAction={onGotoNewsMine} />
        <div className="space-y-2.5">
          {state.news.slice(0, 5).map((n) => (
            <button
              key={n.id}
              onClick={() => openReader(n)}
              className="v3-card flex w-full items-center gap-3 p-3 text-right transition-transform hover:scale-[1.01]"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px]">
                <Image
                  src={`/img/cat-${n.category === "none" ? "local" : n.category}.png`}
                  alt={n.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-[var(--v3-ink)]">{n.title}</p>
                <p className="mt-1 text-[11px] text-[var(--v3-ink-2)]">
                  {durFmt(n.durationMin)} · {relTime(n.createdAt)}
                </p>
              </div>
              <StatusDot status={n.status} />
            </button>
          ))}
        </div>
      </div>

      {/* خوانندهٔ خبر — همان صفحه فعالیت */}
      <NewsReaderDialog news={reader} onClose={() => setReader(null)} />
    </div>
  )
}
