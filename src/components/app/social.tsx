"use client"


import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Bell, Home, Newspaper, BarChart3, UserRound, ClipboardCheck, ShieldCheck, Search,
  Megaphone, Target, Trophy, ChevronLeft, Rss, CheckCircle2, PlayCircle, Smile, Landmark,
  Sun, Moon, CalendarClock, Eye, Heart,
} from "lucide-react"
import { type Tab } from "@/lib/store"
import type { AppState, AppUser } from "@/lib/server/state"
import { fa, faNum, relTime, durFmt, untilFmt, preparedFmt } from "@/lib/format"
import { jalaliToday, JALALI_MONTHS } from "@/lib/jalali"
import { CATEGORY_LABELS, DISTRICT_LABELS } from "@/lib/domain"
import { Avatar } from "@/components/app/bits"
import { cn } from "@/lib/utils"

const TODAY = jalaliToday()

/* ================= نوار بالای اپ (تم Candy — سفید شیشه‌ای + قرمز آجری) ================= */
export function TopBar({
  state,
  onOpenNotifications,
  onGotoNews,
}: {
  state: AppState
  onOpenNotifications: () => void
  onGotoNews: () => void
}) {
  const { user, unreadCount } = state
  const { setTheme } = useTheme()
  return (
    <header className="sticky top-0 z-40 bg-surface-container-lowest/85 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1380px] items-center justify-between gap-3 px-3 lg:h-[72px] lg:px-5">
        {/* برند + نقطهٔ زنده */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="truncate text-[15px] font-bold tracking-tight text-on-surface lg:text-[16.5px]">خبرگزاری بسیج شهر رشت</span>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </span>
            </div>
            <span className="text-[10.5px] font-medium tracking-wide text-secondary">زنده • پوشش خبری ۲۴/۷</span>
          </div>
        </div>

        {/* جستجو (دسکتاپ) — می‌برد به تب اخبار که جستجوی کامل دارد */}
        <button
          onClick={onGotoNews}
          className="mx-auto hidden h-10 w-full max-w-[430px] items-center gap-2.5 rounded-full border border-outline-variant/50 bg-surface-container-low px-3.5 text-[12.5px] text-on-surface-variant transition-colors hover:bg-surface-container lg:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>جستجو در اخبار، کد خبر، دسته‌بندی…</span>
        </button>

        {/* اکشن‌ها */}
        <div className="flex shrink-0 items-center gap-space-sm lg:mr-0">
          {/* پیل استریک */}
          <div className="hidden items-center gap-1 rounded-full bg-secondary-fixed/50 px-2.5 py-1 text-on-secondary-fixed sm:flex">
            <span className="text-[11px] font-bold tracking-tight">🔥 {fa(user.currentStreak)} روز</span>
          </div>
          {/* تاریخ شمسی (موبایل) */}
          <span className="text-[10px] font-medium text-on-surface-variant sm:hidden">{fa(`${TODAY.jd}`)} {JALALI_MONTHS[TODAY.jm - 1]}</span>
          <button
            onClick={onOpenNotifications}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
            aria-label="اعلان‌ها"
          >
            <Bell className="h-[22px] w-[22px]" />
            {unreadCount > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
            )}
          </button>
          <button
            onClick={() => setTheme(document.documentElement.classList.contains("light") ? "dark" : "light")}
            className="hidden h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container sm:flex"
            aria-label="تغییر حالت روشن/تیره"
            title="تغییر حالت روشن/تیره"
          >
            <Sun className="hidden h-[20px] w-[20px] dark:block" />
            <Moon className="h-[20px] w-[20px] dark:hidden" />
          </button>
          {/* نمایش کاربر جاری — صرفاً اطلاع‌رسان؛ ورود/خروج از صفحه پروفایل */}
          <div
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary sm:h-9 sm:w-9"
            aria-label="حساب کاربری شما"
          >
            <Avatar name={user.fullName} src={user.avatar} size={36} />
          </div>
        </div>
      </div>
    </header>
  )
}

/* ================= ستون راست دسکتاپ: پروفایل + منو + چالش‌ها ================= */
const CHALLENGE_ICONS = [
  { bg: "#fde8e9", fg: "#8f0e15" },
  { bg: "#fdf0d7", fg: "#b45309" },
  { bg: "#e6f6ec", fg: "#2f9e5f" },
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
  const router = useRouter()
  const { user, stats, reviewQueue, challenges, pendingUsersCount, unreadCount } = state
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
    { icon: <Bell className="h-4.5 w-4.5" />, label: "اعلان‌ها", onClick: onOpenNotifications, badge: unreadCount || undefined, badgeTone: "green" },
    { icon: <Target className="h-4.5 w-4.5" />, label: "چالش‌ها", onClick: onOpenChallenges, badge: activeChallenges.length || undefined, badgeTone: "green" },
  )
  if (user.role === "admin" || user.role === "district_manager") {
    menu.push({
      icon: <Landmark className="h-4.5 w-4.5" />, label: "حوزه‌ها و پایگاه‌ها", onClick: () => router.push("/organization"),
    })
  }
  if (user.role === "admin") {
    menu.push({
      icon: <ShieldCheck className="h-4.5 w-4.5" />, label: "پنل مدیریت", onClick: onOpenAdmin,
      badge: pendingUsersCount || undefined, badgeTone: "red",
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* کارت پروفایل */}
      <div className="v3-card p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} src={user.avatar} size={46} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-black text-[var(--v3-ink)]">{user.fullName}</div>
            <div className="mt-0.5 text-[10.5px] font-bold text-[var(--v3-azure)]">{user.levelEmoji} {user.levelTitle} · {fa(user.points)} امتیاز</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 border-t border-[var(--v3-line)] pt-3 text-center">
          <div>
            <b className="v3-num block text-[15px] leading-5 text-[var(--v3-ink)]">{fa(stats.totalApproved)}</b>
            <span className="text-[9.5px] text-[var(--v3-ink-2)]">خبر تاییدشده</span>
          </div>
          <div>
            <b className="v3-num block text-[15px] leading-5 text-[var(--v3-ink)]">{fa(stats.rank || stats.totalReporters)}</b>
            <span className="text-[9.5px] text-[var(--v3-ink-2)]">رتبه در خبرگزاری</span>
          </div>
          <div>
            <b className="v3-num block text-[15px] leading-5 text-[var(--v3-ink)]">{fa(stats.approveRate)}٪</b>
            <span className="text-[9.5px] text-[var(--v3-ink-2)]">نرخ تایید</span>
          </div>
        </div>
      </div>

      {/* منو */}
      <nav className="v3-card p-2" aria-label="منوی اصلی">
        {menu.map((m) => (
          <button
            key={m.label}
            onClick={m.onClick}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[12.5px] transition-colors",
              m.active
                ? "bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] font-black text-white shadow-[0_10px_22px_-10px_rgba(180,26,34,0.6)]"
                : "font-semibold text-[var(--v3-ink-2)] hover:bg-[var(--v3-card-2)] hover:text-[var(--v3-ink)]",
            )}
          >
            {m.icon}
            {m.label}
            {m.badge ? (
              <span className={cn(
                "mr-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black",
                m.badgeTone === "red" ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#fca5a5]",
                m.active && "bg-white/25 text-white",
              )}>
                {fa(m.badge)}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* چالش‌های فعال */}
      <div className="v3-card p-4">
        <div className="mb-2 text-[10px] font-bold text-[var(--v3-ink-2)]">چالش‌های فعال</div>
        {activeChallenges.length === 0 ? (
          <p className="text-[11.5px] leading-5 text-[var(--v3-ink-2)]">فعلاً چالش فعالی نیست.</p>
        ) : (
          activeChallenges.slice(0, 4).map((c, i) => {
            const tone = CHALLENGE_ICONS[i % CHALLENGE_ICONS.length]
            return (
              <button key={c.id} onClick={onOpenChallenges} className="flex w-full items-center gap-2.5 py-1.5 text-right transition-opacity hover:opacity-75">
                <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg" style={{ background: tone.bg, color: tone.fg }}>
                  <Megaphone className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[var(--v3-ink)]">{c.title}</span>
              </button>
            )
          })
        )}
        <button onClick={onOpenChallenges} className="mt-1.5 text-[11px] font-bold text-[var(--v3-azure)]">مشاهده همه</button>
      </div>

      <div className="px-1 text-[9.5px] leading-5 text-[var(--v3-ink-2)]">
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
      <div className="v3-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-[13px] font-black text-[var(--v3-ink)]">اعلان‌های اخیر</b>
          <button onClick={onOpenNotifications} className="text-[10.5px] font-bold text-[var(--v3-azure)]">مشاهده همه</button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-[11.5px] leading-5 text-[var(--v3-ink-2)]">اعلان تازه‌ای ندارید.</p>
        ) : (
          notifications.slice(0, 4).map((n) => (
            <button key={n.id} onClick={onOpenNotifications} className="flex w-full items-start gap-2.5 rounded-xl py-2 text-right transition-colors hover:bg-[var(--v3-card-2)]">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--v3-azure)]" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[11.5px] font-bold text-[var(--v3-ink)]">{n.title}</b>
                <small className="block truncate text-[10.5px] text-[var(--v3-ink-2)]">{n.body}</small>
              </span>
              <span className="shrink-0 text-[9px] text-[var(--v3-ink-2)]">{relTime(n.at)}</span>
            </button>
          ))
        )}
      </div>

      {/* برترین خبرنگاران */}
      <div className="v3-card p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-[var(--v3-amber)]" />
          <b className="text-[13px] font-black text-[var(--v3-ink)]">برترین خبرنگاران</b>
        </div>
        {leaderboard.slice(0, 5).map((r) => (
          <div key={r.id} className={cn("flex items-center gap-2.5 rounded-xl py-1.5", r.isMe && "rounded-xl bg-[var(--v3-azure-soft)] px-1.5")}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
              style={{
                background: RANK_BG[r.rank - 1] ?? "var(--v3-card-2)",
                color: r.rank <= 3 ? "#fff" : "var(--v3-ink-2)",
              }}
            >
              {fa(r.rank)}
            </span>
            <Avatar name={r.fullName} src={r.avatar} size={28} />
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-[var(--v3-ink)]">{r.fullName}{r.isMe ? " (شما)" : ""}</span>
            <span className="shrink-0 text-[10px] font-bold text-[var(--v3-ink-2)]">{faNum(r.points)}</span>
          </div>
        ))}
      </div>

      {/* چالش فعال */}
      {active && (
        <button onClick={onOpenChallenges} className="v3-tile-blue rounded-2xl p-4 text-right shadow-[0_16px_36px_-16px_rgba(180,26,34,0.6)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold opacity-90">
              <Megaphone className="h-3.5 w-3.5" /> چالش فعال
            </span>
            <ChevronLeft className="h-4 w-4" />
          </div>
          <b className="mt-1.5 block text-[13px] font-black leading-6">{active.title}</b>
          <span className="mt-1 block text-[10.5px] font-bold opacity-90">
            {fa(active.myCount)} خبر ثبت‌شده · مهلت: {untilFmt(active.deadlineAt)}
          </span>
        </button>
      )}
    </div>
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
    <div className="v3-card p-4">
      <div className="flex items-center gap-2.5">
        <Avatar name={user.fullName} src={user.avatar} size={40} />
        {isReporter ? (
          <button
            onClick={onQuickSubmit}
            className="flex h-11 flex-1 items-center justify-between rounded-2xl border border-[var(--v3-line)] bg-[var(--v3-card-2)] px-3.5 text-[12.5px] text-[var(--v3-ink-2)] transition-colors hover:border-[var(--v3-azure)]/40"
          >
            <span>چه خبری دیده‌اید؟</span>
            <Smile className="h-4.5 w-4.5" />
          </button>
        ) : (
          <button
            onClick={onGotoReview}
            className="flex h-11 flex-1 items-center justify-between rounded-2xl border border-[var(--v3-azure)]/35 bg-[var(--v3-azure-soft)] px-3.5 text-[12.5px] font-bold text-[var(--v3-ink)] transition-colors hover:bg-[var(--v3-azure)]/20"
          >
            <span>بررسی خبرهای در صف</span>
            <span className="rounded-full bg-[var(--v3-azure)] px-2 py-0.5 text-[10px] font-black text-white">{fa(queueCount)}</span>
          </button>
        )}
        {isReporter && (
          <button
            onClick={onQuickSubmit}
            className="v3-btn flex h-11 shrink-0 items-center gap-1.5 px-4 text-[12.5px]"
          >
            <Rss className="h-4 w-4" />
            ثبت خبر
          </button>
        )}
      </div>
      {isReporter && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--v3-azure)]/30 bg-[var(--v3-azure-soft)]/60 px-3 py-2 text-[10.5px] font-semibold leading-5 text-[var(--v3-ink-2)]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--v3-azure)]" />
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
  preparedAt: string | null
  views?: number
  eitaaReactions?: number
  isWeekFeatured?: boolean
  createdAt: string
  reporterName: string
  reporterAvatar: string
  reporterDistrict: string
  reporterBase: string
  isMine: boolean
}

export function FeedPost({ n, onOpen }: { n: FeedNews; onOpen?: (n: FeedNews) => void }) {
  const hasPhoto = n.mediaType === "photo" && !!n.mediaUrl
  const hasVideo = n.mediaType === "video" && !!n.mediaUrl
  const catImg = `/img/cat-${n.category === "none" ? "local" : n.category}.png`

  return (
    <article className="stage-enter overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)] transition-shadow hover:shadow-[0_12px_32px_-8px_rgba(83,37,23,0.12)]">
      <button onClick={() => onOpen?.(n)} className="flex w-full items-center gap-2.5 px-4 pb-2.5 pt-3.5 text-right">
        <Avatar name={n.reporterName} src={n.reporterAvatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <b className="truncate text-[12.5px] font-bold text-on-surface">{n.reporterName}</b>
            {n.isMine && (
              <span className="shrink-0 rounded-full bg-primary-fixed/50 px-2 py-0.5 text-[9px] font-bold text-on-primary-fixed">خبر شما</span>
            )}
          </div>
          <div className="truncate text-[10px] text-on-surface-variant">
            {n.reporterBase || DISTRICT_LABELS[n.reporterDistrict] || ""} · {relTime(n.createdAt)}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-tertiary-fixed/40 px-2.5 py-1 text-[9.5px] font-bold text-tertiary">
          <CheckCircle2 className="h-3 w-3" />
          منتشر شد
        </span>
      </button>

      <button onClick={() => onOpen?.(n)} className="block w-full px-4 pb-3 text-right">
        <h3 className="text-[15px] font-bold leading-6.5 text-on-surface">{n.title}</h3>
        <p className="mt-1 line-clamp-3 text-[11.5px] leading-5.5 text-on-surface-variant">{n.content}</p>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-black text-primary">مطالعهٔ کامل خبر ←</span>
      </button>

      {hasPhoto && (
        <button onClick={() => onOpen?.(n)} className="block w-full cursor-zoom-in">
          <img src={n.mediaUrl} alt={n.title} className="max-h-[340px] w-full border-y border-line object-cover" loading="lazy" />
        </button>
      )}
      {hasVideo && (
        <video src={n.mediaUrl} controls preload="metadata" className="max-h-[340px] w-full border-y border-line bg-black" />
      )}
      {!hasPhoto && !hasVideo && (
        <button onClick={() => onOpen?.(n)} className="block w-full cursor-zoom-in">
          <Image src={catImg} alt={n.title} width={640} height={200} className="h-[170px] w-full border-y border-line object-cover" />
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[10px] font-semibold text-on-surface-variant">
        <span className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">{CATEGORY_LABELS[n.category] ?? n.category}</span>
        <span className="rounded-full bg-surface-container px-2.5 py-1 font-mono" dir="ltr">{n.code}</span>
        {n.durationMin > 0 && <span className="rounded-full bg-surface-container px-2.5 py-1">{durFmt(n.durationMin)}</span>}
        {n.preparedAt && (
          <span className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1">
            <CalendarClock className="h-3 w-3" />
            {preparedFmt(n.preparedAt)}
          </span>
        )}
        {typeof n.views === "number" && n.views > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1">
            <Eye className="h-3 w-3" />
            {faNum(n.views)}
          </span>
        )}
        {typeof n.eitaaReactions === "number" && n.eitaaReactions > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-error-container/25 px-2.5 py-1 font-bold text-on-error-container">
            <Heart className="h-3 w-3" />
            {faNum(n.eitaaReactions)}
          </span>
        )}
        {n.isWeekFeatured && (
          <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-1 font-black text-warn">
            <Trophy className="h-3 w-3" />
            خبر هفته
          </span>
        )}
        {n.isMine && (
          <span className="mr-auto flex items-center gap-1 font-bold text-tertiary">
            <PlayCircle className="h-3.5 w-3.5" />
            +{fa(25)} امتیاز
          </span>
        )}
      </div>
    </article>
  )
}
