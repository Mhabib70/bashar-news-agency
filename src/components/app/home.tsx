"use client"


import { useEffect, useState } from "react"
import { Megaphone, ArrowLeft, Flame, Newspaper, Timer, ShieldCheck, ClipboardCheck } from "lucide-react"
import { useApp } from "@/lib/store"
import { SectionHeader, CountUp, Avatar } from "@/components/app/bits"
import { StoryRow, ComposerCard, FeedPost, type FeedNews } from "@/components/app/social"
import { faNum, fa, durFmt, untilFmt } from "@/lib/format"
import { cn } from "@/lib/utils"

export function HomeScreen({
  onOpenNotifications,
  onQuickSubmit,
  onOpenChallenges,
  onOpenNews,
  onGotoActivity,
  onGotoReview,
  onOpenAdmin,
}: {
  onOpenNotifications: () => void
  onQuickSubmit: () => void
  onOpenChallenges: () => void
  onOpenNews: () => void
  onGotoActivity: () => void
  onGotoReview: () => void
  onOpenAdmin: () => void
}) {
  const { state, userId } = useApp()
  if (!state || !userId) return null
  const { user, stats, challenges, reviewQueue, news } = state

  const isReporter = user.role === "reporter"
  const isReviewer = !isReporter
  const activeChallenge = challenges.find((c) => c.status === "active" && c.joined) ?? challenges.find((c) => c.status === "active")
  const week = stats.week

  return (
    <div className="stage-enter flex flex-col gap-3.5 lg:max-w-[680px] lg:mx-auto lg:px-0 px-3 pb-4 pt-3.5 lg:px-0 lg:pt-1">
      {/* ردیف استوری‌ها */}
      <StoryRow user={user} leaders={state.leaderboard} onQuickSubmit={onQuickSubmit} />

      {/* کمپوزر */}
      <ComposerCard
        user={user}
        isReporter={isReporter}
        queueCount={reviewQueue.length}
        onQuickSubmit={onQuickSubmit}
        onGotoReview={onGotoReview}
      />

      {/* بنر صف بررسی (ارزیاب‌ها) */}
      {isReviewer && reviewQueue.length > 0 && (
        <button
          onClick={onGotoReview}
          className="flex items-center justify-between rounded-2xl border border-[var(--neon)]/35 bg-[var(--neon)]/8 px-4 py-3.5 text-right transition-colors hover:bg-[var(--neon)]/12"
        >
          <span>
            <span className="block text-[13px] font-bold text-ink">{fa(reviewQueue.length)} خبر در انتظار بررسی شماست</span>
            <span className="mt-0.5 block text-[10.5px] text-ink-muted">بررسی سریع‌تر، چرخه خبر کند نمی‌شود</span>
          </span>
          <span className="btn-glow flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--neon)] text-[var(--neon-foreground)]">
            <ClipboardCheck className="h-5 w-5" />
          </span>
        </button>
      )}

      {/* پنل مدیریت (ادمین) */}
      {user.role === "admin" && (
        <button
          onClick={onOpenAdmin}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 text-right transition-colors hover:bg-surface-2"
        >
          <span>
            <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <ShieldCheck className="h-4.5 w-4.5 text-[var(--neon)]" />
              پنل مدیریت
            </span>
            <span className="mt-0.5 block text-[10.5px] text-ink-muted">
              {state.pendingUsersCount > 0
                ? `${fa(state.pendingUsersCount)} درخواست عضویت در انتظار تایید`
                : "کاربران · پیام همگانی · چالش · خروجی CSV"}
            </span>
          </span>
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--neon)] text-[var(--neon-foreground)]">
            <ArrowLeft className="h-5 w-5" />
            {state.pendingUsersCount > 0 && (
              <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-black text-white">
                {fa(state.pendingUsersCount)}
              </span>
            )}
          </span>
        </button>
      )}

      {/* چالش فعال (کارت گرادیانی سبز) */}
      {activeChallenge && (
        <button onClick={onOpenChallenges} className="neon-card relative overflow-hidden rounded-2xl p-4 text-right">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold opacity-85">
              <Megaphone className="h-4 w-4" />
              چالش فعال
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Megaphone className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-1.5 text-[16px] font-black leading-7">{activeChallenge.title}</h3>
          <p className="mt-1 text-[11px] font-bold opacity-85">
            {fa(activeChallenge.myCount)} خبر ثبت‌شده · {untilFmt(activeChallenge.deadlineAt)}
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2.5 text-[12px] font-bold text-white transition-transform hover:scale-[1.03]">
            {activeChallenge.joined ? "ارسال خبر برای چالش" : "شرکت در چالش"}
            <ArrowLeft className="h-4 w-4" />
          </span>
        </button>
      )}

      {/* فید اجتماعی خبرگزاری */}
      <FeedSection userId={userId} trigger={news.length + reviewQueue.length} />

      {/* فعالیت من */}
      <div className="pt-1">
        <SectionHeader title="فعالیت من" action="کارنامه کامل" onAction={onGotoActivity} />
        <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-line bg-surface p-3">
          <MiniStat icon={<Newspaper className="h-4.5 w-4.5" />} value={week.newsCount} label="خبرها" sub="این هفته" />
          <div className="w-px bg-line" />
          <MiniStat icon={<Flame className="h-4.5 w-4.5" />} value={user.points} label="امتیاز" sub="کل" plain />
          <div className="w-px bg-line" />
          <MiniStat icon={<Timer className="h-4.5 w-4.5" />} label="زمان فعال" sub="این هفته" text={durFmt(week.activeMin)} />
        </div>
      </div>

      {/* اخبار من (با وضعیت چرخه بررسی) */}
      {news.length > 0 && (
        <div className="pt-1">
          <SectionHeader title="خبرهای من" action="همه" onAction={onOpenNews} />
          <div className="space-y-2.5">
            {news.slice(0, 3).map((n) => (
              <button key={n.id} onClick={onOpenNews} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-right transition-colors hover:bg-surface-2">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <img
                    src={n.mediaType === "photo" && n.mediaUrl ? n.mediaUrl : `/img/cat-${n.category === "none" ? "local" : n.category}.png`}
                    alt={n.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink">{n.title}</span>
                  <span className="mt-1 block text-[10.5px] text-ink-muted">
                    {n.code} · {durFmt(n.durationMin)} · {n.status === "approved" ? `+${faNum(25)} امتیاز` : n.status === "rejected" ? "بازگشت با دلیل" : "در چرخه بررسی"}
                  </span>
                </span>
                <StatusDot status={n.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- فید: آخرین اخبار منتشرشدهٔ خبرگزاری ---------- */
function FeedSection({ userId, trigger }: { userId: string; trigger: number }) {
  const [feed, setFeed] = useState<FeedNews[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/news/feed?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setFeed(d.news ?? [])
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [userId, trigger])

  if (failed) return null
  if (feed === null) {
    return (
      <div className="flex flex-col gap-3.5 pt-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
        ))}
      </div>
    )
  }
  if (feed.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-8 text-center">
        <p className="text-[13px] font-bold text-ink">هنوز خبری منتشر نشده است</p>
        <p className="mt-1 text-[11px] leading-5 text-ink-muted">اولین خبر تأییدشده، همین‌جا در جریان خبری خبرگزاری می‌درخشد.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3.5 pt-1">
      {feed.map((n) => (
        <FeedPost key={n.id} n={n} />
      ))}
    </div>
  )
}

function MiniStat({
  icon,
  value,
  label,
  sub,
  text,
  plain,
}: {
  icon: React.ReactNode
  value?: number
  label: string
  sub: string
  text?: string
  plain?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-1.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--neon)]/12 text-[var(--neon)]">{icon}</span>
      <span className="text-[16px] font-black leading-none text-ink">
        {text ?? (plain ? faNum(value ?? 0) : <CountUp to={value ?? 0} fmt={faNum} />)}
      </span>
      <span className="text-[11px] font-semibold text-ink">{label}</span>
      <span className="text-[9.5px] text-ink-muted">{sub}</span>
    </div>
  )
}

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        status === "approved" ? "bg-[var(--neon)] text-[var(--neon-foreground)]" : status === "rejected" ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn",
      )}
    >
      {status === "approved" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : status === "rejected" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}

export { Avatar }
