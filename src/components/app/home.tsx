"use client"


import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, ArrowLeft, Flame, Newspaper, Timer, ShieldCheck, ClipboardCheck, MessagesSquare, GraduationCap, Trophy, Eye, Heart } from "lucide-react"
import { useApp } from "@/lib/store"
import { SectionHeader, CountUp, Avatar } from "@/components/app/bits"
import { StoryRow, ComposerCard, FeedPost, type FeedNews } from "@/components/app/social"
import { faNum, fa, durFmt, untilFmt } from "@/lib/format"
import { CATEGORY_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"

export function HomeScreen({
  onOpenNotifications,
  onQuickSubmit,
  onOpenChallenges,
  onOpenNews,
  onGotoActivity,
  onGotoReview,
  onOpenAdmin,
  onOpenNewsDetail,
}: {
  onOpenNotifications: () => void
  onQuickSubmit: () => void
  onOpenChallenges: () => void
  onOpenNews: () => void
  onGotoActivity: () => void
  onGotoReview: () => void
  onOpenAdmin: () => void
  onOpenNewsDetail?: (id: number) => void
}) {
  const router = useRouter()
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

      {/* تالار گفتگو و آموزش — تایل‌های گرادیانی (سبک Running/Cycling) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => router.push("/forum")}
          className="v3-tile-blue group relative overflow-hidden rounded-[22px] p-4 text-right shadow-[0_16px_34px_-16px_rgba(37,99,235,0.65)] transition-transform duration-200 active:scale-[0.98]"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <MessagesSquare className="h-5 w-5" />
          </span>
          <span className="relative mt-3 block text-[15px] font-black">تالار گفتگو</span>
          <span className="relative mt-1 block text-[10.5px] leading-4 text-white/80">تجربه‌ها، پرسش‌ها و هم‌فکری خبرنگارها</span>
          <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
            ورود
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </span>
        </button>
        <button
          onClick={() => router.push("/training")}
          className="v3-tile-amber group relative overflow-hidden rounded-[22px] p-4 text-right shadow-[0_16px_34px_-16px_rgba(245,158,11,0.6)] transition-transform duration-200 active:scale-[0.98]"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="relative mt-3 block text-[15px] font-black">آموزش</span>
          <span className="relative mt-1 block text-[10.5px] leading-4 text-white/85">راهنمای گام‌به‌گام خبرنگاری و رشد</span>
          <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm">
            شروع
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* بنر صف بررسی (ارزیاب‌ها) */}
      {isReviewer && reviewQueue.length > 0 && (
        <button
          onClick={onGotoReview}
          className="flex items-center justify-between rounded-[22px] border border-[var(--v3-azure)]/30 bg-[var(--v3-azure-soft)] px-4 py-3.5 text-right transition-colors hover:bg-[var(--v3-azure)]/25"
        >
          <span>
            <span className="block text-[13px] font-bold text-[var(--v3-ink)]">{fa(reviewQueue.length)} خبر در انتظار بررسی شماست</span>
            <span className="mt-0.5 block text-[10.5px] text-[var(--v3-ink-2)]">بررسی سریع‌تر، چرخه خبر کند نمی‌شود</span>
          </span>
          <span className="v3-btn flex h-10 w-10 items-center justify-center">
            <ClipboardCheck className="h-5 w-5" />
          </span>
        </button>
      )}

      {/* پنل مدیریت (ادمین) */}
      {user.role === "admin" && (
        <button
          onClick={onOpenAdmin}
          className="v3-card flex w-full items-center justify-between px-4 py-3.5 text-right transition-transform hover:scale-[1.01]"
        >
          <span>
            <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--v3-ink)]">
              <ShieldCheck className="h-4.5 w-4.5 text-[var(--v3-azure)]" />
              پنل مدیریت
            </span>
            <span className="mt-0.5 block text-[10.5px] text-[var(--v3-ink-2)]">
              {state.pendingUsersCount > 0
                ? `${fa(state.pendingUsersCount)} درخواست عضویت در انتظار تایید`
                : "کاربران · پیام همگانی · چالش · خروجی CSV"}
            </span>
          </span>
          <span className="v3-btn relative flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
            {state.pendingUsersCount > 0 && (
              <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-black text-white">
                {fa(state.pendingUsersCount)}
              </span>
            )}
          </span>
        </button>
      )}

      {/* چالش فعال (کارت گرادیانی آبی) */}
      {activeChallenge && (
        <button onClick={onOpenChallenges} className="v3-tile-blue relative overflow-hidden rounded-[22px] p-4 text-right shadow-[0_18px_40px_-18px_rgba(37,99,235,0.7)]">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold opacity-90">
              <Megaphone className="h-4 w-4" />
              چالش فعال
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/18">
              <Megaphone className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-1.5 text-[16px] font-black leading-7">{activeChallenge.title}</h3>
          <p className="mt-1 text-[11px] font-bold opacity-90">
            {fa(activeChallenge.myCount)} خبر ثبت‌شده · {untilFmt(activeChallenge.deadlineAt)}
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2.5 text-[12px] font-bold text-white transition-transform hover:scale-[1.03]">
            {activeChallenge.joined ? "ارسال خبر برای چالش" : "شرکت در چالش"}
            <ArrowLeft className="h-4 w-4" />
          </span>
        </button>
      )}

      {/* خبر هفته — پربازدیدترین خبر منتشرشدهٔ هفته (بستن حلقه اثرگذاری) */}
      {state.weekFeatured && (
        <button
          onClick={() => onOpenNewsDetail?.(state.weekFeatured!.id)}
          className="v3-tile-amber relative overflow-hidden rounded-[22px] p-4 text-right shadow-[0_18px_40px_-18px_rgba(245,158,11,0.65)] transition-transform active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold opacity-95">
              <Trophy className="h-4 w-4" />
              خبر هفته خبرگزاری
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/22">
              <Trophy className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-7">{state.weekFeatured.title}</h3>
          <p className="mt-1 text-[11px] font-bold opacity-95">
            ✍️ {state.weekFeatured.reporterName} · {CATEGORY_LABELS[state.weekFeatured.category] ?? "خبر"}
          </p>
          <span className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/22 px-3 py-1.5 text-[11px] font-bold text-white">
              <Eye className="h-3.5 w-3.5" /> {faNum(state.weekFeatured.views)} بازدید
            </span>
            {state.weekFeatured.eitaaReactions > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/22 px-3 py-1.5 text-[11px] font-bold text-white">
                <Heart className="h-3.5 w-3.5" /> {faNum(state.weekFeatured.eitaaReactions)} واکنش
              </span>
            )}
          </span>
        </button>
      )}

      {/* فید اجتماعی خبرگزاری */}
      <FeedSection userId={userId} trigger={news.length + reviewQueue.length} />

      {/* فعالیت من */}
      <div className="pt-1">
        <SectionHeader title="فعالیت من" action="کارنامه کامل" onAction={onGotoActivity} />
        <div className="v3-card grid grid-cols-3 gap-2.5 p-3">
          <MiniStat icon={<Newspaper className="h-4.5 w-4.5" />} value={week.newsCount} label="خبرها" sub="این هفته" />
          <div className="w-px bg-[var(--v3-line)]" />
          <MiniStat icon={<Flame className="h-4.5 w-4.5" />} value={user.points} label="امتیاز" sub="کل" plain />
          <div className="w-px bg-[var(--v3-line)]" />
          <MiniStat icon={<Timer className="h-4.5 w-4.5" />} label="زمان فعال" sub="این هفته" text={durFmt(week.activeMin)} />
        </div>
      </div>

      {/* اخبار من (با وضعیت چرخه بررسی) */}
      {news.length > 0 && (
        <div className="pt-1">
          <SectionHeader title="خبرهای من" action="همه" onAction={onOpenNews} />
          <div className="space-y-2.5">
            {news.slice(0, 3).map((n) => (
              <button key={n.id} onClick={onOpenNews} className="v3-card flex w-full items-center gap-3 p-3 text-right transition-transform hover:scale-[1.01]">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px]">
                  <img
                    src={n.mediaType === "photo" && n.mediaUrl ? n.mediaUrl : `/img/cat-${n.category === "none" ? "local" : n.category}.png`}
                    alt={n.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[var(--v3-ink)]">{n.title}</span>
                  <span className="mt-1 block text-[10.5px] text-[var(--v3-ink-2)]">
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
          <div key={i} className="v3-card h-64 animate-pulse" />
        ))}
      </div>
    )
  }
  if (feed.length === 0) {
    return (
      <div className="v3-card border-dashed px-5 py-8 text-center">
        <p className="text-[13px] font-bold text-[var(--v3-ink)]">هنوز خبری منتشر نشده است</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--v3-ink-2)]">اولین خبر تأییدشده، همین‌جا در جریان خبری خبرگزاری می‌درخشد.</p>
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--v3-azure-soft)] text-[var(--v3-azure)]">{icon}</span>
      <span className="v3-num text-[16px] leading-none text-[var(--v3-ink)]">
        {text ?? (plain ? faNum(value ?? 0) : <CountUp to={value ?? 0} fmt={faNum} />)}
      </span>
      <span className="text-[11px] font-semibold text-[var(--v3-ink)]">{label}</span>
      <span className="text-[9.5px] text-[var(--v3-ink-2)]">{sub}</span>
    </div>
  )
}

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        status === "approved" ? "bg-[var(--v3-azure)] text-white" : status === "rejected" ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-[var(--v3-amber-soft)] text-amber-600 dark:text-amber-400",
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
