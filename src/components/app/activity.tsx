"use client"

import Image from "next/image"
import { useState } from "react"
import { Flame, Timer, FileText, MoreHorizontal } from "lucide-react"
import { useApp } from "@/lib/store"
import { Ring, SectionHeader, StatCard, CountUp, Avatar } from "@/components/app/bits"
import { StatusDot } from "@/components/app/home"
import { fa, faNum, durFmt, jalali, jalaliDay, relTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LEVELS } from "@/lib/domain"

type RangeKey = "day" | "week" | "month"

const GOALS: Record<RangeKey, number> = { day: 100, week: 700, month: 3000 }
const RANGE_LABELS: Record<RangeKey, string> = { day: "امروز", week: "این هفته", month: "این ماه" }

export function ActivityScreen() {
  const { state } = useApp()
  const [range, setRange] = useState<RangeKey>("day")
  if (!state) return null
  const stat = state.stats[range]
  const goal = GOALS[range]
  const maxBar = Math.max(10, ...state.stats.weekSeries.map((w) => w.points))

  return (
    <div className="stage-enter flex flex-col gap-5 px-5 pb-4 pt-6">
      {/* سربرگ */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-black text-ink">فعالیت</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-muted" aria-label="بیشتر">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* تب‌ها */}
      <div className="flex rounded-full border border-line bg-surface p-1">
        {(["day", "week", "month"] as RangeKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setRange(k)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-[13px] font-bold transition-all",
              range === k ? "bg-neon text-neon-foreground btn-glow" : "text-ink-muted hover:text-ink",
            )}
          >
            {k === "day" ? "روز" : k === "week" ? "هفته" : "ماه"}
          </button>
        ))}
      </div>

      {/* حلقه امتیاز */}
      <div className="flex flex-col items-center pt-1">
        <Ring value={stat.points} max={goal} size={190} stroke={13}>
          <span className="text-[12px] text-ink-muted">{RANGE_LABELS[range]}</span>
          <span className="mt-0.5 text-[38px] font-black leading-none text-white">
            <CountUp key={range} to={stat.points} fmt={faNum} />
          </span>
          <span className="mt-1 text-[11.5px] text-ink-muted">امتیاز</span>
        </Ring>
        <span className="mt-3 rounded-full border border-line bg-surface px-4 py-1.5 text-[11.5px] font-bold text-ink-muted">
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
        <div className="rounded-[26px] border border-line bg-surface p-4">
          <SectionHeader title="روند امتیاز" />
          <div className="flex h-28 items-end justify-between gap-2">
            {state.stats.weekSeries.map((w) => (
              <div key={w.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold text-ink-muted">{w.points > 0 ? fa(w.points) : ""}</span>
                <div
                  className={cn("w-full max-w-[26px] rounded-t-lg transition-all", w.points > 0 ? "bg-gradient-to-t from-neon/55 to-neon" : "bg-surface-2")}
                  style={{ height: `${Math.max(4, (w.points / maxBar) * 84)}px` }}
                />
                <span className="text-[9px] text-ink-muted">{jalaliDay(w.day + "T12:00:00")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* رتبه‌بندی */}
      <div>
        <SectionHeader title="برترین خبرنگاران" action="کارنامه من" />
        <div className="space-y-2">
          {state.leaderboard.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-3xl border px-4 py-3",
                r.isMe ? "border-neon/40 bg-neon/8" : "border-line bg-surface",
              )}
            >
              <div className="relative shrink-0">
                <Avatar name={r.fullName} src={r.avatar} size={40} />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-black ring-2 ring-background",
                    r.rank === 1 ? "bg-neon text-neon-foreground" : r.isMe ? "bg-neon/25 text-neon" : "bg-surface-2 text-ink-muted",
                  )}
                >
                  {fa(r.rank)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">
                  {r.fullName} {r.isMe && <span className="text-[10px] font-bold text-neon">(شما)</span>}
                </p>
                <p className="text-[10.5px] text-ink-muted">{LEVELS.find((l) => l.key === r.levelKey)?.title}</p>
              </div>
              <span className="text-[13px] font-black text-neon">{faNum(r.points)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* آخرین اخبار */}
      <div>
        <SectionHeader title="آخرین اخبار" action="مشاهده همه" />
        <div className="space-y-2.5">
          {state.news.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                <Image
                  src={`/img/cat-${n.category === "none" ? "local" : n.category}.png`}
                  alt={n.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{n.title}</p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {durFmt(n.durationMin)} · {relTime(n.createdAt)}
                </p>
              </div>
              <StatusDot status={n.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
