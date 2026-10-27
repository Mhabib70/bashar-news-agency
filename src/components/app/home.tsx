"use client"

import Image from "next/image"
import { Bell, Plus, Megaphone, FileCheck2, ArrowLeft, ClipboardList, Flame, Newspaper, Timer, ChevronLeft, Users2, Radio, Trophy, FileDown } from "lucide-react"
import { useApp } from "@/lib/store"
import { SectionHeader, CountUp, Avatar } from "@/components/app/bits"
import { faNum, fa, durFmt, untilFmt } from "@/lib/format"
import { ROLE_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"

export function HomeScreen({
  onOpenNotifications,
  onQuickSubmit,
  onOpenChallenges,
  onOpenNews,
  onGotoActivity,
  onGotoReview,
  onOpenUsers,
  onOpenCreateChallenge,
  onOpenBroadcast,
}: {
  onOpenNotifications: () => void
  onQuickSubmit: () => void
  onOpenChallenges: () => void
  onOpenNews: () => void
  onGotoActivity: () => void
  onGotoReview: () => void
  onOpenUsers: () => void
  onOpenCreateChallenge: () => void
  onOpenBroadcast: () => void
}) {
  const { state, setTab } = useApp()
  if (!state) return null
  const { user, stats, challenges, reviewQueue } = state
  const userId = user.id
  const isAdmin = user.role === "admin"
  const isManager = user.role === "admin" || user.role === "district_manager"

  const activeChallenge = challenges.find((c) => c.status === "active" && c.joined) ?? challenges.find((c) => c.status === "active")
  const week = stats.week

  return (
    <div className="stage-enter flex flex-col gap-5 px-5 pb-4 pt-6">
      {/* سربرگ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-black leading-8 text-ink">
            سلام {user.fullName.split(" ")[0]} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">آماده‌ای امروز به هدفت برسی؟</p>
          <p className="mt-1.5 text-[11px] font-semibold text-neon">
            {ROLE_LABELS[user.role]} · {user.levelEmoji} سطح {user.levelTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNotifications}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2"
            aria-label="اعلان‌ها"
          >
            <Bell className="h-5 w-5" />
            {state.notifications.length > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-neon pulse-soft" />}
          </button>
          {user.role === "reporter" ? (
            <button
              onClick={onQuickSubmit}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-neon text-neon-foreground shadow-[0_10px_26px_-8px_rgba(201,247,58,0.6)] transition-transform hover:scale-105 active:scale-95"
              aria-label="ارسال خبر"
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onGotoReview}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-neon text-neon-foreground shadow-[0_10px_26px_-8px_rgba(201,247,58,0.6)] transition-transform hover:scale-105 active:scale-95"
              aria-label="صف بررسی"
            >
              <ClipboardList className="h-5 w-5" />
              {reviewQueue.length > 0 && (
                <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5c5c] px-1 text-[10px] font-black text-white">
                  {fa(reviewQueue.length)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* صف بررسی برای نقش‌های ارزیاب */}
      {user.role !== "reporter" && reviewQueue.length > 0 && (
        <button
          onClick={onGotoReview}
          className="flex items-center justify-between rounded-3xl border border-neon/35 bg-neon/8 px-5 py-4 text-right transition-colors hover:bg-neon/12"
        >
          <span>
            <span className="block text-[14.5px] font-bold text-ink">{fa(reviewQueue.length)} خبر در انتظار بررسی شماست</span>
            <span className="mt-0.5 block text-[11.5px] text-ink-muted">بررسی سریع‌تر، چرخه خبر کند نمی‌شود</span>
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neon text-neon-foreground">
            <ArrowLeft className="h-5 w-5" />
          </span>
        </button>
      )}

      {/* کارت چالش (سبز نئونی) */}
      <div className="relative">
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">
          {activeChallenge ? (
            <button
              onClick={onOpenChallenges}
              className="neon-card relative w-[78%] shrink-0 snap-start overflow-hidden rounded-[30px] p-5 text-right"
            >
              <div className="flex items-start justify-between">
                <span className="text-[12.5px] font-bold opacity-80">چالش فعال</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/15">
                  <Megaphone className="h-6 w-6" />
                </span>
              </div>
              <h3 className="mt-2 max-w-[90%] text-[22px] font-black leading-8">{activeChallenge.title}</h3>
              <p className="mt-2 text-[12.5px] font-bold opacity-80">
                {fa(activeChallenge.myCount)} خبر ثبت‌شده · {untilFmt(activeChallenge.deadlineAt)}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#141604] px-5 py-3 text-[13.5px] font-bold text-neon transition-transform hover:scale-[1.03]">
                {activeChallenge.joined ? "ارسال خبر برای چالش" : "شرکت در چالش"}
                <ArrowLeft className="h-4 w-4" />
              </span>
            </button>
          ) : (
            <div className="neon-card w-full rounded-[30px] p-6">
              <h3 className="text-[18px] font-black">فعلاً چالش فعالی نیست</h3>
              <p className="mt-1 text-[12.5px] font-semibold opacity-80">به‌محض باز شدن چالش جدید، همین‌جا خبرت می‌کنیم.</p>
            </div>
          )}

          {/* کارت کارنامه تیره */}
          <button
            onClick={onGotoActivity}
            className="w-[62%] shrink-0 snap-start rounded-[30px] border border-line bg-surface-2 p-5 text-right"
          >
            <div className="flex items-start justify-between">
              <span className="text-[12.5px] font-bold text-ink-muted">کارنامه تو</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/12 text-neon">
                <FileCheck2 className="h-6 w-6" />
              </span>
            </div>
            <h3 className="mt-2 text-[20px] font-black leading-7 text-ink">{fa(stats.totalApproved)} خبر تاییدشده</h3>
            <p className="mt-2 text-[12px] font-bold text-ink-muted">
              نرخ تایید {fa(stats.approveRate)}٪ · رتبه {fa(stats.rank)} از {fa(stats.totalReporters)}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-neon">
              گزارش کامل
              <ChevronLeft className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      {/* پنل مدیریت (ادمین کل / مدیر حوزه) */}
      {isManager && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[15px] font-bold text-ink">مدیریت</p>
            {state.pendingUsersCount > 0 && (
              <span className="rounded-full bg-warn/12 px-2.5 py-1 text-[10px] font-bold text-warn">
                {fa(state.pendingUsersCount)} درخواست عضویت در انتظار
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 rounded-[26px] border border-line bg-surface p-3">
            <ManagerBtn icon={<Users2 className="h-4.5 w-4.5" />} label="کاربران" badge={state.pendingUsersCount} onClick={onOpenUsers} />
            {isAdmin ? (
              <>
                <ManagerBtn icon={<Trophy className="h-4.5 w-4.5" />} label="چالش جدید" onClick={onOpenCreateChallenge} />
                <ManagerBtn icon={<Radio className="h-4.5 w-4.5" />} label="اطلاع‌رسانی" onClick={onOpenBroadcast} />
                <a
                  href={`/api/export?userId=${encodeURIComponent(userId)}&type=users`}
                  className="flex flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">
                    <FileDown className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-[10.5px] font-bold text-ink">CSV کاربران</span>
                </a>
              </>
            ) : (
              <a
                href={`/api/export?userId=${encodeURIComponent(userId)}&type=news`}
                className="col-span-3 flex flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors hover:bg-surface-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">
                  <FileDown className="h-4.5 w-4.5" />
                </span>
                <span className="text-[10.5px] font-bold text-ink">گزارش حوزه (CSV)</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* فعالیت من */}
      <div>
        <SectionHeader title="فعالیت من" action="مشاهده همه" onAction={onGotoActivity} />
        <div className="grid grid-cols-3 gap-2.5 rounded-[26px] border border-line bg-surface p-3">
          <MiniStat icon={<Newspaper className="h-4.5 w-4.5" />} value={week.newsCount} label="خبرها" sub="این هفته" />
          <div className="w-px bg-line" />
          <MiniStat icon={<Flame className="h-4.5 w-4.5" />} value={user.points} label="امتیاز" sub="کل" plain />
          <div className="w-px bg-line" />
          <MiniStat icon={<Timer className="h-4.5 w-4.5" />} label="زمان فعال" sub="این هفته" text={durFmt(week.activeMin)} />
        </div>
      </div>

      {/* آخرین اخبار */}
      <div>
        <SectionHeader title="اخبار اخیر" action="همه" onAction={onOpenNews} />
        <div className="space-y-2.5">
          {state.news.slice(0, 3).map((n) => (
            <button key={n.id} onClick={onOpenNews} className="flex w-full items-center gap-3 rounded-3xl border border-line bg-surface p-3 text-right transition-colors hover:bg-surface-2">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                <Image
                  src={`/img/cat-${n.category === "none" ? "local" : n.category}.png`}
                  alt={n.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-ink">{n.title}</span>
                <span className="mt-1 block text-[11px] text-ink-muted">
                  {n.code} · {durFmt(n.durationMin)} · {n.status === "approved" ? `+${faNum(25)} امتیاز` : n.status === "rejected" ? "بازگشت با دلیل" : "در چرخه بررسی"}
                </span>
              </span>
              <StatusDot status={n.status} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ManagerBtn({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors hover:bg-surface-2">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#ff5c5c] px-1 text-[9px] font-black text-white">
            {fa(badge)}
          </span>
        )}
      </span>
      <span className="text-[10.5px] font-bold text-ink">{label}</span>
    </button>
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">{icon}</span>
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
        status === "approved" ? "bg-neon text-neon-foreground" : status === "rejected" ? "bg-[#ff5c5c]/15 text-[#ff8484]" : "bg-[#ffc24b]/15 text-[#ffc24b]",
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
