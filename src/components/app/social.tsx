"use client"


import Image from "next/image"
import { useState } from "react"
import {
  Bell, Home, Newspaper, BarChart3, UserRound, ClipboardCheck, ShieldCheck, Search,
  Megaphone, Target, Trophy, Plus, ChevronLeft, Rss, CheckCircle2, PlayCircle, Smile,
} from "lucide-react"
import { type Tab } from "@/lib/store"
import type { AppState, AppUser, LeaderRow } from "@/lib/server/state"
import { fa, faNum, relTime, durFmt, untilFmt } from "@/lib/format"
import { CATEGORY_LABELS, DISTRICT_LABELS, LEVELS } from "@/lib/domain"
import { Avatar } from "@/components/app/bits"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/* ================= نوار بالای اجتماعی ================= */
export function TopBar({
  state,
  onOpenNotifications,
  onOpenSwitch,
  onGotoNews,
}: {
  state: AppState
  onOpenNotifications: () => void
  onOpenSwitch: () => void
  onGotoNews: () => void
}) {
  const { user, notifications } = state
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1380px] items-center gap-3 px-3 lg:h-16 lg:px-5">
        {/* برند */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src="/img/agency-logo.png" alt="لوگو" width={38} height={38} className="shrink-0 rounded-xl object-cover lg:h-[42px] lg:w-[42px]" />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-black leading-5 text-ink lg:text-[15.5px]">خبرگزاری بسیج شهر رشت</div>
            <div className="hidden text-[10px] font-semibold leading-4 text-[var(--neon)] sm:block">روایت‌گرِ حقیقت، صدای بسیج</div>
          </div>
        </div>

        {/* جستجو (دسکتاپ) — می‌برد به تب اخبار که جستجوی کامل دارد */}
        <button
          onClick={onGotoNews}
          className="mx-auto hidden h-10 w-full max-w-[430px] items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 text-[12.5px] text-ink-muted transition-colors hover:border-[var(--neon)]/40 hover:bg-surface lg:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>جستجو در اخبار، کد خبر، دسته‌بندی…</span>
        </button>

        {/* اکشن‌ها */}
        <div className="mr-auto flex items-center gap-2 lg:mr-0">
          <button
            onClick={onOpenNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:bg-surface-2"
            aria-label="اعلان‌ها"
          >
            <Bell className="h-4.5 w-4.5" />
            {notifications.length > 0 && (
              <span className="absolute -left-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-black text-white">
                {fa(notifications.length)}
              </span>
            )}
          </button>
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>
          <button
            onClick={onOpenSwitch}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1 pl-2.5 pr-1.5 transition-colors hover:bg-surface-2"
            aria-label="تغییر حساب"
          >
            <Avatar name={user.fullName} src={user.avatar} size={30} />
            <span className="hidden min-w-0 text-right md:block">
              <span className="block max-w-[120px] truncate text-[11.5px] font-bold leading-4 text-ink">{user.fullName}</span>
              <span className="block text-[9.5px] leading-3.5 text-ink-muted">{user.levelEmoji} {user.levelTitle}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

/* ================= ستون راست دسکتاپ: پروفایل + منو + چالش‌ها ================= */
const CHALLENGE_ICONS = [
  { bg: "#efeaff", fg: "#7c5cff" },
  { bg: "#e6f6ec", fg: "#2f9e5f" },
  { bg: "#fdf0e2", fg: "#f08c2e" },
  { bg: "#fdeaed", fg: "#e05252" },
]

export function SideNav({
  state,
  tab,
  setTab,
  onGotoReview,
  onOpenAdmin,
  onOpenNotifications,
  onOpenChallenges,
}: {
  state: AppState
  tab: Tab
  setTab: (t: Tab) => void
  onGotoReview: () => void
  onOpenAdmin: () => void
  onOpenNotifications: () => void
  onOpenChallenges: () => void
}) {
  const { user, stats, reviewQueue, challenges, notifications, pendingUsersCount } = state
  const isReviewer = user.role !== "reporter"
  const activeChallenges = challenges.filter((c) => c.status === "active")

  const menu: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; badge?: number; badgeTone?: "green" | "red" }[] = [
    { icon: <Home className="h-4.5 w-4.5" />, label: "جریان خبری", onClick: () => setTab("home"), active: tab === "home" },
    { icon: <Newspaper className="h-4.5 w-4.5" />, label: "اخبار من", onClick: () => setTab("news"), active: tab === "news" },
    { icon: <BarChart3 className="h-4.5 w-4.5" />, label: "کارنامه", onClick: () => setTab("activity"), active: tab === "activity" },
    { icon: <UserRound className="h-4.5 w-4.5" />, label: "پروفایل", onClick: () => setTab("profile"), active: tab === "profile" },
  ]
  if (isReviewer) {
    menu.push({
      icon: <ClipboardCheck className="h-4.5 w-4.5" />, label: "صف بررسی", onClick: onGotoReview,
      active: tab === "review", badge: reviewQueue.length || undefined, badgeTone: "red",
    })
  }
  menu.push(
    { icon: <Bell className="h-4.5 w-4.5" />, label: "اعلان‌ها", onClick: onOpenNotifications, badge: notifications.length || undefined, badgeTone: "green" },
    { icon: <Target className="h-4.5 w-4.5" />, label: "چالش‌ها", onClick: onOpenChallenges, badge: activeChallenges.length || undefined, badgeTone: "green" },
  )
  if (user.role === "admin") {
    menu.push({
      icon: <ShieldCheck className="h-4.5 w-4.5" />, label: "پنل مدیریت", onClick: onOpenAdmin,
      badge: pendingUsersCount || undefined, badgeTone: "red",
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* کارت پروفایل */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} src={user.avatar} size={46} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-black text-ink">{user.fullName}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold text-[var(--neon)]">{user.levelEmoji} {user.levelTitle} · {fa(user.points)} امتیاز</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 border-t border-line pt-3 text-center">
          <div>
            <b className="block text-[15px] font-black leading-5 text-ink">{fa(stats.totalApproved)}</b>
            <span className="text-[9.5px] text-ink-muted">خبر تاییدشده</span>
          </div>
          <div>
            <b className="block text-[15px] font-black leading-5 text-ink">{fa(stats.rank || stats.totalReporters)}</b>
            <span className="text-[9.5px] text-ink-muted">رتبه در خبرگزاری</span>
          </div>
          <div>
            <b className="block text-[15px] font-black leading-5 text-ink">{fa(stats.approveRate)}٪</b>
            <span className="text-[9.5px] text-ink-muted">نرخ تایید</span>
          </div>
        </div>
      </div>

      {/* منو */}
      <nav className="rounded-2xl border border-line bg-surface p-2" aria-label="منوی اصلی">
        {menu.map((m) => (
          <button
            key={m.label}
            onClick={m.onClick}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-colors",
              m.active ? "bg-[var(--neon)] font-bold text-[var(--neon-foreground)] btn-glow" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {m.icon}
            {m.label}
            {m.badge ? (
              <span className={cn(
                "mr-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black",
                m.badgeTone === "red" ? "bg-danger/15 text-danger" : "bg-[var(--neon)]/15 text-[var(--neon)]",
                m.active && "bg-white/25 text-white",
              )}>
                {fa(m.badge)}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* چالش‌های فعال */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 text-[10px] font-bold text-ink-muted">چالش‌های فعال</div>
        {activeChallenges.length === 0 ? (
          <p className="text-[11.5px] leading-5 text-ink-muted">فعلاً چالش فعالی نیست.</p>
        ) : (
          activeChallenges.slice(0, 4).map((c, i) => {
            const tone = CHALLENGE_ICONS[i % CHALLENGE_ICONS.length]
            return (
              <button key={c.id} onClick={onOpenChallenges} className="flex w-full items-center gap-2.5 py-1.5 text-right transition-opacity hover:opacity-75">
                <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg" style={{ background: tone.bg, color: tone.fg }}>
                  <Megaphone className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink">{c.title}</span>
              </button>
            )
          })
        )}
        <button onClick={onOpenChallenges} className="mt-1.5 text-[11px] font-bold text-[var(--neon)]">مشاهده همه</button>
      </div>

      <div className="px-1 text-[9.5px] leading-5 text-ink-muted">
        قوانین خبرگزاری · حریم خصوصی · راهنما
        <br />
        © ۱۴۰۵ خبرگزاری بسیج شهر رشت · نسخه ۲.۱
      </div>
    </div>
  )
}

/* ================= ستون چپ دسکتاپ: اعلان‌ها + برترین‌ها + چالش ================= */
export function RightRail({
  state,
  onOpenNotifications,
  onOpenChallenges,
}: {
  state: AppState
  onOpenNotifications: () => void
  onOpenChallenges: () => void
}) {
  const { notifications, leaderboard, challenges } = state
  const active = challenges.find((c) => c.status === "active")
  const RANK_BG = ["#f7c948", "#c8cdd4", "#d9985f"]

  return (
    <div className="flex flex-col gap-4">
      {/* اعلان‌های اخیر */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-[13px] font-black text-ink">اعلان‌های اخیر</b>
          <button onClick={onOpenNotifications} className="text-[10.5px] font-bold text-[var(--neon)]">مشاهده همه</button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-[11.5px] leading-5 text-ink-muted">اعلان تازه‌ای ندارید.</p>
        ) : (
          notifications.slice(0, 4).map((n) => (
            <button key={n.id} onClick={onOpenNotifications} className="flex w-full items-start gap-2.5 rounded-xl py-2 text-right transition-colors hover:bg-surface-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--neon)]" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[11.5px] font-bold text-ink">{n.title}</b>
                <small className="block truncate text-[10.5px] text-ink-muted">{n.body}</small>
              </span>
              <span className="shrink-0 text-[9px] text-ink-muted">{relTime(n.at)}</span>
            </button>
          ))
        )}
      </div>

      {/* برترین خبرنگاران */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-[var(--neon)]" />
          <b className="text-[13px] font-black text-ink">برترین خبرنگاران</b>
        </div>
        {leaderboard.slice(0, 5).map((r) => (
          <div key={r.id} className={cn("flex items-center gap-2.5 rounded-xl py-1.5", r.isMe && "rounded-xl bg-[var(--neon)]/8 px-1.5")}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
              style={{
                background: RANK_BG[r.rank - 1] ?? "var(--surface-2)",
                color: r.rank <= 3 ? "#fff" : "var(--ink-muted)",
              }}
            >
              {fa(r.rank)}
            </span>
            <Avatar name={r.fullName} src={r.avatar} size={28} />
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-ink">{r.fullName}{r.isMe ? " (شما)" : ""}</span>
            <span className="shrink-0 text-[10px] font-bold text-ink-muted">{faNum(r.points)}</span>
          </div>
        ))}
      </div>

      {/* چالش فعال */}
      {active && (
        <button onClick={onOpenChallenges} className="neon-card rounded-2xl p-4 text-right">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold opacity-85">
              <Megaphone className="h-3.5 w-3.5" /> چالش فعال
            </span>
            <ChevronLeft className="h-4 w-4" />
          </div>
          <b className="mt-1.5 block text-[13px] font-black leading-6">{active.title}</b>
          <span className="mt-1 block text-[10.5px] font-bold opacity-85">
            {fa(active.myCount)} خبر ثبت‌شده · مهلت: {untilFmt(active.deadlineAt)}
          </span>
        </button>
      )}
    </div>
  )
}

/* ================= ردیف استوری‌ها ================= */
export function StoryRow({
  user,
  leaders,
  onQuickSubmit,
}: {
  user: AppUser
  leaders: LeaderRow[]
  onQuickSubmit: () => void
}) {
  const [picked, setPicked] = useState<LeaderRow | null>(null)
  const levelOf = (k: string) => LEVELS.find((l) => l.key === k)

  return (
    <>
      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface px-3 py-3 sm:justify-between sm:gap-0">
        <button onClick={onQuickSubmit} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5" aria-label="ثبت خبر جدید">
          <span className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border-[1.6px] border-dashed border-[var(--neon)]">
            <Avatar name={user.fullName} src={user.avatar} size={50} />
            <span className="absolute -bottom-0.5 -left-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface bg-[var(--neon)] text-white">
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </span>
          <span className="max-w-[66px] truncate text-[10px] font-semibold text-ink-muted">خبر شما</span>
        </button>
        {leaders.slice(0, 9).map((r) => (
          <button key={r.id} onClick={() => setPicked(r)} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5" aria-label={r.fullName}>
            <span className="story-ring flex h-[58px] w-[58px] items-center justify-center rounded-full p-[3px]">
              <Avatar name={r.fullName} src={r.avatar} size={52} />
            </span>
            <span className="max-w-[66px] truncate text-[10px] font-semibold text-ink-muted">{r.fullName.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* کارت خبرنگار پس از لمس استوری */}
      <Dialog open={!!picked} onOpenChange={(v) => !v && setPicked(null)}>
        <DialogContent className="max-w-[320px] rounded-[24px] border-line bg-popover p-5">
          {picked && (
            <>
              <DialogHeader className="items-center text-center">
                <DialogTitle className="text-ink">{picked.fullName}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-2 pb-1">
                <span className="story-ring flex h-[74px] w-[74px] items-center justify-center rounded-full p-[3px]">
                  <Avatar name={picked.fullName} src={picked.avatar} size={66} />
                </span>
                <span className="text-[11.5px] text-ink-muted">{DISTRICT_LABELS[picked.district] ?? picked.district}</span>
                <div className="mt-1 grid w-full grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line bg-surface p-2.5 text-center">
                    <b className="block text-[14px] font-black text-ink">{faNum(picked.points)}</b>
                    <span className="text-[10px] text-ink-muted">امتیاز</span>
                  </div>
                  <div className="rounded-xl border border-line bg-surface p-2.5 text-center">
                    <b className="block text-[14px] font-black text-ink">{fa(picked.rank)}</b>
                    <span className="text-[10px] text-ink-muted">رتبه</span>
                  </div>
                </div>
                <span className="mt-1 rounded-full bg-[var(--neon)]/12 px-3 py-1.5 text-[11px] font-bold text-[var(--neon)]">
                  {levelOf(picked.levelKey)?.emoji} سطح {levelOf(picked.levelKey)?.title ?? picked.levelKey}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ================= کارت کمپوزر ================= */
export function ComposerCard({
  user,
  isReporter,
  queueCount,
  onQuickSubmit,
  onGotoReview,
}: {
  user: AppUser
  isReporter: boolean
  queueCount: number
  onQuickSubmit: () => void
  onGotoReview: () => void
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <Avatar name={user.fullName} src={user.avatar} size={40} />
        {isReporter ? (
          <button
            onClick={onQuickSubmit}
            className="flex h-11 flex-1 items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 text-[12.5px] text-ink-muted transition-colors hover:border-[var(--neon)]/40"
          >
            <span>چه خبری دیده‌اید؟</span>
            <Smile className="h-4.5 w-4.5" />
          </button>
        ) : (
          <button
            onClick={onGotoReview}
            className="flex h-11 flex-1 items-center justify-between rounded-xl border border-[var(--neon)]/35 bg-[var(--neon)]/8 px-3.5 text-[12.5px] font-bold text-ink transition-colors hover:bg-[var(--neon)]/12"
          >
            <span>بررسی خبرهای در صف</span>
            <span className="rounded-full bg-[var(--neon)] px-2 py-0.5 text-[10px] font-black text-[var(--neon-foreground)]">{fa(queueCount)}</span>
          </button>
        )}
        {isReporter && (
          <button
            onClick={onQuickSubmit}
            className="btn-glow flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--neon)] px-4 text-[12.5px] font-bold text-[var(--neon-foreground)] transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Rss className="h-4 w-4" />
            ثبت خبر
          </button>
        )}
      </div>
      {isReporter && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[var(--neon)]/30 bg-[var(--neon)]/6 px-3 py-2 text-[10.5px] font-semibold leading-5 text-ink-muted">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--neon)]" />
          پس از ثبت، خبر وارد چرخه سه‌مرحله‌ای تأیید می‌شود: مدیر حوزه، سپس کارشناس خبر، و در پایان ادمین کل
        </div>
      )}
    </div>
  )
}

/* ================= پست فید ================= */
export type FeedNews = {
  id: number
  code: string
  title: string
  content: string
  category: string
  mediaType: string
  mediaUrl: string
  durationMin: number
  createdAt: string
  reporterName: string
  reporterAvatar: string
  reporterDistrict: string
  reporterBase: string
  isMine: boolean
}

export function FeedPost({ n }: { n: FeedNews }) {
  const hasPhoto = n.mediaType === "photo" && !!n.mediaUrl
  const hasVideo = n.mediaType === "video" && !!n.mediaUrl
  const catImg = `/img/cat-${n.category === "none" ? "local" : n.category}.png`

  return (
    <article className="stage-enter overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3.5">
        <Avatar name={n.reporterName} src={n.reporterAvatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <b className="truncate text-[12.5px] font-bold text-ink">{n.reporterName}</b>
            {n.isMine && <span className="shrink-0 rounded-full bg-[var(--neon)]/12 px-2 py-0.5 text-[9px] font-bold text-[var(--neon)]">خبر شما</span>}
          </div>
          <div className="truncate text-[10px] text-ink-muted">
            {n.reporterBase || DISTRICT_LABELS[n.reporterDistrict] || ""} · {relTime(n.createdAt)}
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-[var(--neon)]/10 px-2 py-1 text-[9.5px] font-bold text-[var(--neon)]">
          <CheckCircle2 className="h-3 w-3" />
          منتشر شد
        </span>
      </div>

      <div className="px-4 pb-3">
        <h3 className="text-[14px] font-black leading-6.5 text-ink">{n.title}</h3>
        <p className="mt-1 line-clamp-3 text-[11.5px] leading-5.5 text-ink-muted">{n.content}</p>
      </div>

      {hasPhoto && (
        <img src={n.mediaUrl} alt={n.title} className="max-h-[340px] w-full border-y border-line object-cover" loading="lazy" />
      )}
      {hasVideo && (
        <video src={n.mediaUrl} controls preload="metadata" className="max-h-[340px] w-full border-y border-line bg-black" />
      )}
      {!hasPhoto && !hasVideo && (
        <Image src={catImg} alt={n.title} width={640} height={200} className="h-[170px] w-full border-y border-line object-cover" />
      )}

      <div className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-semibold text-ink-muted">
        <span className="rounded-full bg-surface-2 px-2.5 py-1">{CATEGORY_LABELS[n.category] ?? n.category}</span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1" dir="ltr">{n.code}</span>
        {n.durationMin > 0 && <span className="rounded-full bg-surface-2 px-2.5 py-1">{durFmt(n.durationMin)}</span>}
        {n.isMine && (
          <span className="mr-auto flex items-center gap-1 font-bold text-[var(--neon)]">
            <PlayCircle className="h-3.5 w-3.5" />
            +{fa(25)} امتیاز
          </span>
        )}
      </div>
    </article>
  )
}
