"use client"


import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Megaphone, ArrowLeft, Newspaper, Timer, ShieldCheck, ClipboardCheck, MessagesSquare,
  GraduationCap, Trophy, Eye, Heart, Send, Hourglass, CheckCircle2, ShieldQuestion,
  FolderOpen, TrendingUp, Sparkles, BadgeCheck, Medal,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { SectionHeader, CountUp, Avatar } from "@/components/app/bits"
import { ComposerCard, FeedPost, type FeedNews } from "@/components/app/social"
import { NewsReaderDialog, type ReaderNews } from "@/components/app/news-reader"
import { faNum, fa, durFmt, untilFmt, relTime } from "@/lib/format"
import { CATEGORY_LABELS, DISTRICT_LABELS, LEVELS } from "@/lib/domain"
import { cn } from "@/lib/utils"

export function HomeScreen({
  onOpenNotifications,
  onQuickSubmit,
  onOpenChallenges,
  onOpenNews,
  onOpenMyNews,
  onGotoActivity,
  onGotoReview,
  onOpenAdmin,
  onOpenNewsDetail,
}: {
  onOpenNotifications: () => void
  onQuickSubmit: () => void
  onOpenChallenges: () => void
  onOpenNews: () => void
  onOpenMyNews?: () => void
  onGotoActivity: () => void
  onGotoReview: () => void
  onOpenAdmin: () => void
  onOpenNewsDetail?: (id: number) => void
}) {
  const router = useRouter()
  const { state, userId, viewNews } = useApp()
  // خوانندهٔ خبر — مطالعهٔ کامل خبر در همین صفحه خانه بدون تعویض تب
  const [reader, setReader] = useState<ReaderNews | null>(null)
  if (!state || !userId) return null
  const { user, stats, challenges, reviewQueue, news } = state

  const openReader = (n: ReaderNews) => {
    setReader(n)
    if (n.status === "approved" || !n.status) void viewNews(n.id) // شمارش بازدید
  }

  const isReporter = user.role === "reporter"
  const isReviewer = !isReporter
  const activeChallenge = challenges.find((c) => c.status === "active" && c.joined) ?? challenges.find((c) => c.status === "active")

  // ---- آمار نبض امروز (از اخبار من) ----
  const today = new Date()
  const isToday = (iso: string) => {
    const d = new Date(iso)
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }
  const sentToday = news.filter((n) => isToday(n.createdAt)).length
  const inReview = news.filter((n) => n.status === "pending").length
  const approvedCount = stats.totalApproved

  // ---- حلقه‌های کارنامه هفتگی ----
  const xpTarget = user.nextLevelMin ?? Math.max(user.points + 500, 1000)
  const xpPct = Math.min(user.points / xpTarget, 1)
  const approvedPct = news.length > 0 ? Math.min(stats.totalApproved / news.length, 1) : 0
  const ratePct = Math.min(stats.approveRate / 100, 1)
  const R = { outer: 42, mid: 32, inner: 22 }
  const circ = (r: number) => 2 * Math.PI * r

  const activeMine = news.filter((n) => n.status === "pending").length

  return (
    <div className="stage-enter mx-auto flex w-full flex-col gap-space-md px-3 pb-4 pt-4 lg:max-w-[680px] lg:px-0 lg:pt-2">
      {/* ===== سلام و بج سطح ===== */}
      <div className="flex items-center justify-between px-1 pt-space-xs">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-bold text-on-surface">سلام {user.fullName.split(" ")[0]} عزیز</span>
            <span className="text-lg">👋</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-on-surface-variant">
              {DISTRICT_LABELS[user.district] ?? "حوزه مرکزی"}{user.base ? ` · ${user.base}` : ""}
            </span>
            <span className="h-1 w-1 rounded-full bg-outline-variant" />
            <span className="inline-flex items-center rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-on-primary-fixed">
              {user.levelEmoji} {user.levelTitle} · سطح {fa(LEVELS.findIndex((l) => l.key === user.levelKey) + 1)}
            </span>
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-container-low text-primary shadow-[0_4px_16px_rgba(83,37,23,0.06)]">
          <BadgeCheck className="h-6 w-6" />
        </span>
      </div>

      {/* ===== تالار گفتگو و آموزش — میانبرهای بالای صفحه ===== */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => router.push("/forum")}
          className="candy-tile-red group relative overflow-hidden rounded-[22px] p-4 text-right shadow-[0_16px_34px_-16px_rgba(157,66,58,0.55)] transition-transform duration-200 active:scale-[0.98]"
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
          className="candy-tile-amber group relative overflow-hidden rounded-[22px] p-4 text-right shadow-[0_16px_34px_-16px_rgba(217,119,6,0.5)] transition-transform duration-200 active:scale-[0.98]"
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

      {/* ===== کارنامه عملکرد هفتگی — حلقه‌های سه‌گانه ===== */}
      <div className="relative w-full overflow-hidden rounded-3xl bg-surface-container-lowest p-space-md shadow-[0_10px_30px_-6px_rgba(83,37,23,0.06)]">
        <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative z-10 mb-space-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            <span className="text-[17px] font-bold text-on-surface">کارنامه عملکرد هفتگی</span>
          </div>
          <button
            onClick={onGotoActivity}
            className="flex items-center gap-1 rounded-full bg-secondary-fixed/60 px-2.5 py-1 text-on-secondary-fixed"
          >
            <span className="text-[11px] font-bold">🔥 {fa(user.currentStreak)} روز استریک</span>
          </button>
        </div>
        <div className="relative z-10 flex items-center gap-space-md">
          {/* حلقه‌های سه‌گانه */}
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r={R.outer} stroke="var(--surface-ctnr)" strokeWidth="6" />
              <circle cx="50" cy="50" fill="none" r={R.mid} stroke="var(--surface-ctnr)" strokeWidth="6" />
              <circle cx="50" cy="50" fill="none" r={R.inner} stroke="var(--surface-ctnr)" strokeWidth="6" />
              <circle className="ring-anim" cx="50" cy="50" fill="none" r={R.outer} stroke="var(--primary)" strokeDasharray={circ(R.outer)} strokeDashoffset={circ(R.outer) * (1 - xpPct)} strokeLinecap="round" strokeWidth="6" />
              <circle className="ring-anim" cx="50" cy="50" fill="none" r={R.mid} stroke="var(--secondary)" strokeDasharray={circ(R.mid)} strokeDashoffset={circ(R.mid) * (1 - approvedPct)} strokeLinecap="round" strokeWidth="6" />
              <circle className="ring-anim" cx="50" cy="50" fill="none" r={R.inner} stroke="var(--tertiary)" strokeDasharray={circ(R.inner)} strokeDashoffset={circ(R.inner) * (1 - ratePct)} strokeLinecap="round" strokeWidth="6" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[20px] font-bold leading-none text-on-surface">{fa(stats.approveRate)}٪</span>
              <span className="mt-0.5 text-[11px] font-medium text-on-surface-variant">شاخص کیفی</span>
            </div>
          </div>
          {/* ردیف تفکیک */}
          <div className="flex min-w-0 flex-1 flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span className="truncate text-[12.5px] text-on-surface-variant">امتیاز کل تجمیعی</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="text-[15px] font-bold text-on-surface">{faNum(user.points)}</span>
                <span className="text-[11px] font-medium text-outline">{user.nextLevelTitle ? `تا ${user.nextLevelTitle}` : "/ XP"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-secondary-container" />
                <span className="truncate text-[12.5px] text-on-surface-variant">اخبار نهایی شده</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="text-[15px] font-bold text-on-surface">{fa(stats.totalApproved)}</span>
                <span className="text-[11px] font-medium text-outline">از {fa(news.length)} خبر</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-tertiary-container" />
                <span className="truncate text-[12.5px] text-on-surface-variant">رتبه در خبرگزاری</span>
              </div>
              <span className="shrink-0 text-[15px] font-bold text-tertiary">{fa(stats.rank)} از {fa(stats.totalReporters)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== نبض امروز کارتابل ===== */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[17px] font-bold text-on-surface">نبض امروز کارتابل</span>
          <button onClick={onGotoActivity} className="cursor-pointer text-[11px] font-semibold text-primary">جزئیات آماری</button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <PulseCard
            icon={<Send className="h-4 w-4" />}
            iconCls="bg-primary-fixed/60 text-primary"
            badge={`+${fa(sentToday)}`}
            badgeCls="bg-tertiary-fixed/30 text-tertiary"
            value={sentToday}
            label="ارسالی امروز"
          />
          <PulseCard
            icon={<Hourglass className="h-4 w-4" />}
            iconCls="bg-secondary-fixed/50 text-secondary"
            badge={inReview > 0 ? "فعال" : "آرام"}
            badgeCls="bg-secondary-fixed/60 text-secondary"
            value={inReview}
            label="در دست بررسی"
          />
          <PulseCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            iconCls="bg-tertiary-fixed/50 text-tertiary"
            value={approvedCount}
            label="تایید نهایی"
          />
        </div>
      </div>

      {/* ===== بنر چالش ویژه (گرادیان قرمز) ===== */}
      {activeChallenge && (
        <button
          onClick={activeChallenge.joined ? onQuickSubmit : onOpenChallenges}
          className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-l from-primary-container via-primary to-primary p-space-md text-on-primary shadow-[0_12px_28px_-6px_rgba(157,66,58,0.4)]"
        >
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute left-10 top-2 h-16 w-16 rounded-full bg-secondary-container/20 blur-lg" />
          <div className="relative z-10 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-tertiary-fixed-dim" />
                <span>چالش ویژه تحریریه</span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-black/15 px-2 py-0.5 text-[11px] font-medium">
                <Timer className="h-3.5 w-3.5" />
                <span>{untilFmt(activeChallenge.deadlineAt)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-right">
                <h3 className="text-[18px] font-bold leading-snug">{activeChallenge.title}</h3>
                <p className="mt-1 text-[12px] text-primary-fixed">
                  {activeChallenge.description ? activeChallenge.description.slice(0, 70) : `${fa(activeChallenge.totalParticipants)} خبرنگار در این چالش شرکت کرده‌اند`}
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner backdrop-blur-md">
                <Megaphone className="h-6 w-6" />
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1 text-[12px] font-bold text-tertiary-fixed-dim">
                <Medal className="h-4 w-4" />
                رتبه شما: {activeChallenge.myRank ? fa(activeChallenge.myRank) : "—"} · {fa(activeChallenge.myCount)} خبر
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-4 py-2 text-[13px] font-bold text-primary shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform active:scale-95">
                {activeChallenge.joined ? "ارسال خبر چالش" : "شرکت در چالش"}
                <ArrowLeft className="h-4 w-4" />
              </span>
            </div>
          </div>
        </button>
      )}

      {/* ===== خبر هفته ===== */}
      {state.weekFeatured && (
        <button
          onClick={() => onOpenNewsDetail?.(state.weekFeatured!.id)}
          className="relative w-full overflow-hidden rounded-3xl bg-surface-container-lowest p-space-md text-right shadow-[0_10px_30px_-6px_rgba(83,37,23,0.06)] transition-transform active:scale-[0.99]"
        >
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-warn/10 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-warn">
              <Trophy className="h-4 w-4" />
              خبر هفته خبرگزاری
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warn/15 text-warn">
              <Trophy className="h-4.5 w-4.5" />
            </span>
          </div>
          <h3 className="relative z-10 mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-on-surface">{state.weekFeatured.title}</h3>
          <p className="relative z-10 mt-1 text-[11px] font-medium text-on-surface-variant">
            ✍️ {state.weekFeatured.reporterName} · {CATEGORY_LABELS[state.weekFeatured.category] ?? "خبر"}
          </p>
          <span className="relative z-10 mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-bold text-on-surface-variant">
              <Eye className="h-3.5 w-3.5" /> {faNum(state.weekFeatured.views)} بازدید
            </span>
            {state.weekFeatured.eitaaReactions > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-[11px] font-bold text-on-surface-variant">
                <Heart className="h-3.5 w-3.5" /> {faNum(state.weekFeatured.eitaaReactions)} واکنش
              </span>
            )}
          </span>
        </button>
      )}

      {/* ===== بنر صف بررسی (مدیران) ===== */}
      {isReviewer && reviewQueue.length > 0 && (
        <button
          onClick={onGotoReview}
          className="flex items-center justify-between rounded-3xl border border-primary/25 bg-primary-fixed/40 px-4 py-3.5 text-right transition-colors hover:bg-primary-fixed/60"
        >
          <span>
            <span className="block text-[13px] font-bold text-on-primary-fixed">{fa(reviewQueue.length)} خبر در انتظار بررسی شماست</span>
            <span className="mt-0.5 block text-[10.5px] text-on-surface-variant">بررسی سریع‌تر، چرخه خبر کند نمی‌شود</span>
          </span>
          <span className="v3-btn flex h-10 w-10 items-center justify-center">
            <ClipboardCheck className="h-5 w-5" />
          </span>
        </button>
      )}

      {/* ===== پنل مدیریت (ادمین) ===== */}
      {user.role === "admin" && (
        <button
          onClick={onOpenAdmin}
          className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)] flex w-full items-center justify-between px-4 py-3.5 text-right transition-transform hover:scale-[1.01]"
        >
          <span>
            <span className="flex items-center gap-2 text-[13px] font-bold text-on-surface">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              پنل مدیریت و پایش راهبردی
            </span>
            <span className="mt-0.5 block text-[10.5px] text-on-surface-variant">
              {state.pendingUsersCount > 0
                ? `${fa(state.pendingUsersCount)} درخواست عضویت در انتظار تایید`
                : "کاربران · پیام همگانی · چالش · خروجی CSV"}
            </span>
          </span>
          <span className="v3-btn relative flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
            {state.pendingUsersCount > 0 && (
              <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-black text-white">
                {fa(state.pendingUsersCount)}
              </span>
            )}
          </span>
        </button>
      )}

      {/* ===== آخرین اخبار ارسالی من — ردیاب چرخه سه‌مرحله‌ای ===== */}
      {news.length > 0 && (
        <div className="flex flex-col space-y-3 pt-space-xs">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-on-surface">آخرین اخبار ارسالی من</span>
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-bold text-on-surface-variant">
                {fa(activeMine)} خبر در جریان
              </span>
            </div>
            <button onClick={onOpenMyNews ?? onOpenNews} className="flex items-center gap-0.5 text-[11px] font-semibold text-primary">
              <span>مشاهده کارتابل</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
          {news.slice(0, 3).map((n) => (
            <MyNewsCard key={n.id} n={n} onOpen={() => openReader(n)} />
          ))}
        </div>
      )}

      {/* ===== جریان خبری خبرگزاری (کمپوزر + فید) ===== */}
      <ComposerCard
        user={user}
        isReporter={isReporter}
        queueCount={reviewQueue.length}
        onQuickSubmit={onQuickSubmit}
        onGotoReview={onGotoReview}
      />
      <FeedSection userId={userId} trigger={news.length + reviewQueue.length} onOpen={openReader} />

      {/* فعالیت سریع */}
      <div className="pt-1">
        <SectionHeader title="فعالیت من" action="کارنامه کامل" onAction={onGotoActivity} />
        <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)] grid grid-cols-3 gap-2.5 p-3">
          <MiniStat icon={<Newspaper className="h-4.5 w-4.5" />} value={stats.week.newsCount} label="خبرها" sub="این هفته" />
          <div className="w-px bg-outline-variant/40" />
          <MiniStat icon={<TrendingUp className="h-4.5 w-4.5" />} value={user.points} label="امتیاز" sub="کل" plain />
          <div className="w-px bg-outline-variant/40" />
          <MiniStat icon={<Timer className="h-4.5 w-4.5" />} label="زمان فعال" sub="این هفته" text={durFmt(stats.week.activeMin)} />
        </div>
      </div>

      {/* خوانندهٔ خبر — همان صفحه خانه */}
      <NewsReaderDialog news={reader} onClose={() => setReader(null)} />
    </div>
  )
}

/* ---------- کارت نبض امروز ---------- */
function PulseCard({
  icon, iconCls, badge, badgeCls, value, label,
}: {
  icon: React.ReactNode
  iconCls: string
  badge?: string
  badgeCls?: string
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-3 shadow-[0_6px_20px_-4px_rgba(83,37,23,0.05)]">
      <div className="flex items-center justify-between">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-xl", iconCls)}>{icon}</span>
        {badge && (
          <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold", badgeCls)}>
            {badge}
            <TrendingUp className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="mt-3">
        <span className="block text-[20px] font-bold leading-none text-on-surface">{fa(value)}</span>
        <span className="mt-1 block text-[11px] font-medium text-on-surface-variant">{label}</span>
      </div>
    </div>
  )
}

/* ---------- کارت خبر من با ردیاب چرخه ---------- */
function MyNewsCard({ n, onOpen }: { n: { id: number; code: string; title: string; status: string; reviewStage: string; rejectNote: string; rejectReason: string; createdAt: string; category: string }; onOpen: () => void }) {
  const stages = [
    { key: "district", label: "۱. مدیر حوزه" },
    { key: "specialist", label: "۲. کارشناس" },
    { key: "admin", label: "۳. ادمین کل" },
  ]
  const stageIdx = n.reviewStage === "" ? 3 : n.reviewStage === "district" ? 0 : n.reviewStage === "specialist" ? 1 : 2
  const isApproved = n.status === "approved"
  const isRejected = n.status === "rejected"
  const progress = isApproved ? 100 : isRejected ? 0 : Math.min((stageIdx / 3) * 100 + 16, 90)

  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col space-y-3 rounded-3xl border bg-surface-container-lowest p-space-md text-right shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)] transition-all",
        isApproved ? "border-tertiary-fixed/60 border-r-4 !border-r-tertiary"
          : isRejected ? "border-error-container/50 border-r-4 !border-r-error"
          : "border-outline-variant/60 border-r-4 !border-r-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-surface-container px-2 py-0.5 font-mono text-[11px] font-medium text-on-surface-variant">#{n.code}</span>
            <span className="text-[11px] font-medium text-outline">{relTime(n.createdAt)}</span>
          </div>
          <h4 className="line-clamp-2 text-[15px] font-bold leading-snug text-on-surface">{n.title}</h4>
        </div>
        {isApproved ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-tertiary-fixed px-2.5 py-1 text-[11px] font-bold text-on-tertiary-fixed">
            <CheckCircle2 className="h-3.5 w-3.5" />
            منتشر شده
          </span>
        ) : isRejected ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-error-container/30 px-2.5 py-1 text-[11px] font-bold text-on-error-container">
            <ShieldQuestion className="h-3.5 w-3.5" />
            نیازمند بازنگری
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-primary-fixed/50 px-2.5 py-1 text-[11px] font-bold text-on-primary-fixed">
            مرحله {fa(stageIdx + 1)} از ۳
          </span>
        )}
      </div>

      {/* ردیاب سه‌مرحله‌ای */}
      <div className="flex w-full flex-col space-y-2 rounded-2xl bg-surface-container-low/70 p-3">
        <div className="flex items-center justify-between text-[11px] font-medium">
          {stages.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "flex items-center gap-1",
                isRejected ? "text-outline"
                  : i < stageIdx || isApproved ? "font-bold text-tertiary"
                  : i === stageIdx ? "font-bold text-primary" : "text-outline",
              )}
            >
              {i < stageIdx || isApproved ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : i === stageIdx && !isRejected ? (
                <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              ) : null}
              {s.label}
            </span>
          ))}
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            className={cn("absolute right-0 top-0 h-full rounded-full bg-gradient-to-l", isRejected ? "from-error to-error-container" : "from-tertiary to-primary")}
            style={{ width: `${isRejected ? 8 : progress}%` }}
          />
        </div>
        {isRejected && n.rejectNote && (
          <span className="mt-0.5 text-[11px] text-on-surface-variant">
            یادداشت بازبین: «{n.rejectNote.slice(0, 60)}»
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-0.5 text-[11px] font-medium text-outline">
        <span className="flex items-center gap-1">
          <FolderOpen className="h-4 w-4" />
          {CATEGORY_LABELS[n.category] ?? "خبر"}
        </span>
        <span className="font-bold text-primary hover:underline">مشاهده جزییات گردش‌کار</span>
      </div>
    </button>
  )
}

/* ---------- فید: آخرین اخبار منتشرشدهٔ خبرگزاری ---------- */
function FeedSection({ userId, trigger, onOpen }: { userId: string; trigger: number; onOpen: (n: ReaderNews) => void }) {
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
          <div key={i} className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)] h-64 animate-pulse" />
        ))}
      </div>
    )
  }
  if (feed.length === 0) {
    return (
      <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)] border-dashed px-5 py-8 text-center">
        <p className="text-[13px] font-bold text-on-surface">هنوز خبری منتشر نشده است</p>
        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">اولین خبر تأییدشده، همین‌جا در جریان خبری خبرگزاری می‌درخشد.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3.5 pt-1">
      {feed.map((n) => (
        <FeedPost key={n.id} n={n} onOpen={onOpen} />
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed/50 text-primary">{icon}</span>
      <span className="font-black tracking-tight text-[16px] leading-none text-on-surface">
        {text ?? (plain ? faNum(value ?? 0) : <CountUp to={value ?? 0} fmt={faNum} />)}
      </span>
      <span className="text-[11px] font-semibold text-on-surface">{label}</span>
      <span className="text-[9.5px] text-on-surface-variant">{sub}</span>
    </div>
  )
}

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        status === "approved" ? "bg-tertiary text-on-tertiary" : status === "rejected" ? "bg-error-container/40 text-on-error-container" : "bg-warn/15 text-warn",
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
