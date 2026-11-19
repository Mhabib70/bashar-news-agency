"use client"

import Image from "next/image"
import { useState } from "react"
import {
  Flame, Timer, FileText, MoreHorizontal, Trophy, CheckCircle2, XCircle, Gauge,
  Lock, Check, Gift, AlertTriangle, Medal, Send, Sparkles, Target, Hourglass,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { Ring, SectionHeader, StatCard, CountUp, Avatar } from "@/components/app/bits"
import { StatusDot } from "@/components/app/home"
import { NewsReaderDialog, type ReaderNews } from "@/components/app/news-reader"
import { fa, faNum, durFmt, jalaliDay, relTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LEVELS, BADGES, levelFor, levelIndex, nextLevel } from "@/lib/domain"

type RangeKey = "day" | "week" | "month"

const GOALS: Record<RangeKey, number> = { day: 100, week: 700, month: 3000 }
const RANGE_LABELS: Record<RangeKey, string> = { day: "امروز", week: "این هفته", month: "این ماه" }

// ── کارت پایهٔ Candy ──
const CARD = "rounded-3xl bg-surface-container-lowest shadow-[0_10px_30px_-6px_rgba(83,37,23,0.06)]"

export function ActivityScreen({
  onGotoNewsMine,
  onGotoProfile,
  onOpenChallenges,
  onQuickSubmit,
}: {
  onGotoNewsMine?: () => void
  onGotoProfile?: () => void
  onOpenChallenges?: () => void
  onQuickSubmit?: () => void
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
  const { user, stats, challenges, news, badges } = state
  const stat = stats[range]
  const goal = GOALS[range]
  const maxBar = Math.max(10, ...stats.weekSeries.map((w) => w.points))
  const todayIdx = stats.weekSeries.length - 1

  // ── سطح و پیشرفت ارتقا ──
  const lvl = levelFor(user.points)
  const next = nextLevel(user.levelKey)
  const target = user.nextLevelMin ?? (next ? next.min : Math.max(user.points + 100, 600))
  const base = lvl.min
  const lvlPct = Math.max(0, Math.min(1, (user.points - base) / Math.max(1, target - base)))
  const remaining = Math.max(0, target - user.points)

  // ── چالش فعال (اولویت: چالشِ عضو شده) ──
  const activeChallenge = challenges.find((c) => c.status === "active" && c.joined) ?? challenges.find((c) => c.status === "active")

  // ── استریک ──
  const isToday = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }
  const sentToday = news.filter((n) => isToday(n.createdAt)).length
  const streakAtRisk = user.currentStreak > 0 && sentToday === 0
  const unlockedBadges = badges.filter((b) => b.unlocked)

  return (
    <div className="stage-enter mx-auto flex w-full flex-col gap-space-md px-3 pb-4 pt-4 lg:max-w-[680px] lg:px-0 lg:pt-2">
      {/* ===== سربرگ ===== */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[22px] font-black text-on-surface">کارنامه و چالش‌ها</h1>
        <button
          onClick={onGotoProfile}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant transition-colors hover:text-on-surface"
          aria-label="بیشتر"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* ===== کارت کاربر — سطح و XP ===== */}
      <div className={cn(CARD, "flex items-center gap-space-md p-space-md")}>
        <div className="shrink-0">
          <Avatar name={user.fullName} src={user.avatar} size={56} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-on-surface">{user.fullName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-on-primary">
              {user.levelEmoji} {user.levelTitle}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant">
              {fa(stats.rank)} از {fa(stats.totalReporters)} در تحریریه
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-2xl bg-primary-fixed/50 px-3.5 py-2">
          <span className="v3-num text-[20px] font-black leading-none text-on-primary-fixed-variant">{faNum(user.points)}</span>
          <span className="mt-1 text-[10px] font-bold text-primary">امتیاز کل XP</span>
        </div>
      </div>

      {/* ===== ردیف سطوح ===== */}
      <div className={cn(CARD, "p-space-md")}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-bold text-on-surface">سطوح تحریریه</span>
          <span className="text-[10.5px] font-medium text-on-surface-variant">{lvl.emoji} سطح {fa(levelIndex(lvl.key) + 1)} از {fa(LEVELS.length)}</span>
        </div>
        <div className="flex items-start justify-between gap-1">
          {LEVELS.map((l, i) => {
            const idx = levelIndex(lvl.key)
            const done = i < idx
            const current = i === idx
            return (
              <div key={l.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-[15px] transition-colors",
                    current
                      ? "bg-primary text-on-primary shadow-[0_6px_16px_-4px_rgba(157,66,58,0.55)] ring-2 ring-primary-fixed-dim ring-offset-2 ring-offset-surface-container-lowest"
                      : done
                        ? "bg-primary-fixed text-on-primary-fixed-variant"
                        : "bg-surface-container text-on-surface-variant/50",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : current ? l.emoji : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className={cn("text-[10px] font-bold leading-none", current ? "text-primary" : done ? "text-on-surface" : "text-on-surface-variant/60")}>
                  {l.title}
                </span>
                <span className="text-[9px] text-outline">{faNum(l.min)}</span>
              </div>
            )
          })}
        </div>
        {/* نوار پیشرفت تا ارتقا */}
        <div className="mt-3 border-t border-outline-variant pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface">
              {next ? `پیشرفت تا ارتقا به «${next.title}»` : "بالاترین سطح تحریریه"}
            </span>
            <span className="text-[11px] font-black text-primary">{fa(Math.round(lvlPct * 100))}٪</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary to-primary-container transition-all duration-500"
              style={{ width: `${Math.max(4, lvlPct * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10.5px] font-medium text-on-surface-variant">
            {next ? `${faNum(remaining)} XP مانده تا سطح بعد` : "شما الگوی تحریریه هستید"}
          </p>
        </div>
      </div>

      {/* ===== استریک + رتبه ===== */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className={cn(CARD, "flex flex-col items-center gap-0.5 p-space-md text-center")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed/60 text-[18px]">🔥</span>
          <span className="v3-num mt-1 text-[22px] font-black leading-none text-on-surface">{fa(user.currentStreak)}</span>
          <span className="text-[10.5px] font-bold text-on-surface-variant">روز استریک فعال</span>
          <span className="mt-0.5 text-[9.5px] text-outline">رکورد: {fa(user.bestStreak)} روز</span>
        </div>
        <div className={cn(CARD, "flex flex-col items-center gap-0.5 p-space-md text-center")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-fixed/40 text-tertiary"><Medal className="h-5 w-5" /></span>
          <span className="v3-num mt-1 text-[22px] font-black leading-none text-on-surface">{fa(stats.rank)}</span>
          <span className="text-[10.5px] font-bold text-on-surface-variant">رتبه در تحریریه</span>
          <span className="mt-0.5 text-[9.5px] text-outline">نرخ تایید {fa(stats.approveRate)}٪</span>
        </div>
      </div>

      {/* ===== هشدار حفظ استریک ===== */}
      {streakAtRisk && (
        <div className="flex items-center gap-2.5 rounded-3xl bg-secondary-fixed/40 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-on-surface">هشدار حفظ استریک</p>
            <p className="mt-0.5 text-[11px] leading-5 text-on-surface-variant">
              امروز هنوز خبری ارسال نکرده‌ای؛ برای حفظ {fa(user.currentStreak)} روز متوالی، حداقل یک خبر بفرست.
            </p>
          </div>
          {onQuickSubmit && (
            <button
              onClick={onQuickSubmit}
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-[11px] font-bold text-on-primary"
            >
              <Send className="h-3.5 w-3.5" />
              ارسال
            </button>
          )}
        </div>
      )}

      {/* ===== چالش فعال ===== */}
      {activeChallenge ? (
        <button
          onClick={activeChallenge.joined ? onQuickSubmit : onOpenChallenges}
          className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-l from-primary-container via-primary to-primary p-space-md text-on-primary shadow-[0_12px_28px_-6px_rgba(157,66,58,0.4)]"
        >
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="relative z-10 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-tertiary-fixed-dim" />
                <span>چالش فعال تحریریه</span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-black/15 px-2 py-0.5 text-[11px] font-medium">
                <Hourglass className="h-3.5 w-3.5" />
                <span>{activeChallenge.reward ? `جایزه: ${activeChallenge.reward}` : "چالش ماهانه"}</span>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-[17px] font-bold leading-snug">{activeChallenge.title}</h3>
              {activeChallenge.description && (
                <p className="mt-1 text-[12px] leading-5 text-primary-fixed">{activeChallenge.description.slice(0, 90)}</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/15 pt-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1">
                  <Target className="h-3.5 w-3.5" />
                  {fa(activeChallenge.myCount)} گزارش من
                </span>
                {activeChallenge.joined && activeChallenge.myRank ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1">رتبه {fa(activeChallenge.myRank)}</span>
                ) : null}
              </div>
              <span className="flex items-center gap-1 rounded-full bg-on-primary px-3 py-1.5 text-[11.5px] font-black text-primary">
                {activeChallenge.joined ? "ارسال گزارش چالش" : "شرکت در چالش"}
              </span>
            </div>
          </div>
        </button>
      ) : (
        <button
          onClick={onOpenChallenges}
          className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-outline-variant bg-surface-container-low p-space-md text-right"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-primary"><Trophy className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-on-surface">چالش فعالی جریان ندارد</span>
            <span className="mt-0.5 block text-[11px] text-on-surface-variant">برای اطلاع از چالش‌های پیشین اینجا را لمس کن</span>
          </span>
        </button>
      )}

      {/* ===== آمار دوره‌ای — تب‌ها + حلقه ===== */}
      <div className={cn(CARD, "p-space-md")}>
        <div className="flex rounded-full bg-surface-container p-1">
          {(["day", "week", "month"] as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={cn(
                "flex-1 rounded-full py-2 text-[12.5px] font-bold transition-all",
                range === k
                  ? "bg-primary text-on-primary shadow-[0_6px_16px_-6px_rgba(157,66,58,0.6)]"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {k === "day" ? "روز" : k === "week" ? "هفته" : "ماه"}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-space-lg">
          <Ring value={stat.points} max={goal} size={130} stroke={11}>
            <span className="v3-num text-[26px] font-black leading-none text-on-surface">
              <CountUp key={range} to={stat.points} fmt={faNum} />
            </span>
            <span className="mt-1 text-[10px] font-medium text-on-surface-variant">از {faNum(goal)} امتیاز</span>
          </Ring>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="flex-1">{fa(stat.newsCount)} خبر در {RANGE_LABELS[range]}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
              <Timer className="h-4 w-4 shrink-0 text-secondary" />
              <span className="flex-1">{durFmt(stat.activeMin)} زمان فعال</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" />
              <span className="flex-1">{fa(stats.totalApproved)} تایید نهایی · {fa(stats.totalRejected)} بازگشتی</span>
            </div>
            {range !== "day" && (
              <div className="mt-1 flex h-14 items-end justify-between gap-1 border-t border-outline-variant pt-2">
                {stats.weekSeries.map((w, i) => (
                  <div key={w.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full max-w-[18px] rounded-full transition-all",
                        w.points > 0 ? (i === todayIdx ? "bg-primary" : "bg-primary/40") : "bg-surface-container",
                      )}
                      style={{ height: `${Math.max(3, (w.points / maxBar) * 34)}px` }}
                    />
                    <span className="text-[8px] text-outline">{jalaliDay(w.day + "T12:00:00")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== نشان‌های افتخار ===== */}
      <div className={cn(CARD, "p-space-md")}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-bold text-on-surface">نشان‌های افتخار</span>
          <span className="rounded-full bg-primary-fixed/50 px-2.5 py-1 text-[11px] font-bold text-on-primary-fixed-variant">
            {fa(unlockedBadges.length)} از {fa(badges.length)} دریافت شده
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {badges.map((b) => (
            <div
              key={b.key}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-2.5 text-center transition-colors",
                b.unlocked ? "border-primary/15 bg-surface-container-low" : "border-outline-variant/60 bg-surface-container/60",
              )}
            >
              <span className={cn("text-[20px] leading-none", !b.unlocked && "opacity-40 grayscale")}>{b.emoji}</span>
              <span className={cn("text-[10.5px] font-bold leading-tight", b.unlocked ? "text-on-surface" : "text-on-surface-variant/60")}>
                {b.title}
              </span>
              <span className="text-[9px] leading-3 text-outline">{b.desc}</span>
              {b.unlocked ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-fixed px-1.5 py-0.5 text-[8.5px] font-black text-on-primary-fixed-variant">
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                  فعال
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-container px-1.5 py-0.5 text-[8.5px] font-bold text-on-surface-variant/70">
                  <Lock className="h-2.5 w-2.5" />
                  قفل
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== جوایز برترین‌های ماه ===== */}
      <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-l from-secondary-container/60 via-surface-container-lowest to-surface-container-lowest p-space-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-on-surface">جوایز برترین‌های ماه</p>
          <p className="mt-0.5 text-[11px] leading-5 text-on-surface-variant">
            مقام‌های ۱ تا ۳ چالش‌ها: {fa(30)}، {fa(20)} و {fa(10)} امتیاز ویژه + تقدیر در جلسهٔ تحریریه
          </p>
        </div>
      </div>

      {/* ===== رتبه‌بندی تحریریه ===== */}
      <div>
        <SectionHeader title="رتبه‌بندی تحریریه" action="کارنامه من" onAction={onGotoProfile} />
        <div className={cn(CARD, "divide-y divide-outline-variant/60 overflow-hidden")}>
          {state.leaderboard.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                r.isMe && "bg-primary-fixed/25",
              )}
            >
              <div className="relative shrink-0">
                <Avatar name={r.fullName} src={r.avatar} size={40} />
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-black ring-2 ring-surface-container-lowest",
                    r.rank === 1
                      ? "bg-gradient-to-br from-primary-container to-primary text-on-primary"
                      : r.isMe
                        ? "bg-tertiary text-on-tertiary"
                        : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {fa(r.rank)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-on-surface">
                  {r.fullName} {r.isMe && <span className="text-[10px] font-bold text-primary">(شما)</span>}
                </p>
                <p className="text-[10.5px] text-on-surface-variant">{LEVELS.find((l) => l.key === r.levelKey)?.title}</p>
              </div>
              <span className="v3-num text-[13px] font-black text-primary">{faNum(r.points)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== آخرین اخبار من ===== */}
      <div>
        <SectionHeader title="آخرین اخبار من" action="مشاهده همه" onAction={onGotoNewsMine} />
        <div className="space-y-2.5">
          {news.slice(0, 5).map((n) => (
            <button
              key={n.id}
              onClick={() => openReader(n)}
              className={cn(CARD, "flex w-full items-center gap-3 p-3 text-right transition-transform hover:scale-[1.01]")}
            >
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
                <p className="truncate text-[13.5px] font-bold text-on-surface">{n.title}</p>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {durFmt(n.durationMin)} · {relTime(n.createdAt)}
                </p>
              </div>
              <StatusDot status={n.status} />
            </button>
          ))}
        </div>
      </div>

      {/* خوانندهٔ خبر — همان صفحه کارنامه */}
      <NewsReaderDialog news={reader} onClose={() => setReader(null)} />
    </div>
  )
}
