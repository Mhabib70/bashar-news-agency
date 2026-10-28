"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Users2, ClipboardList, Trophy, Megaphone, FileDown, ArrowRight, ShieldCheck, Loader2 } from "lucide-react"
import { useApp } from "@/lib/store"
import { NeonAvatar } from "@/components/app/bits"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { fa } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AdminOverviewSection } from "@/components/admin/overview"
import { AdminUsersSection } from "@/components/admin/users"
import { AdminReviewSection } from "@/components/admin/review"
import { AdminChallengesSection } from "@/components/admin/challenges"
import { AdminBroadcastSection } from "@/components/admin/broadcast"
import { AdminExportsSection } from "@/components/admin/exports"

type SectionKey = "overview" | "users" | "review" | "challenges" | "broadcast" | "exports"

const NAV: { key: SectionKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "overview", label: "داشبورد", icon: <LayoutDashboard className="h-4.5 w-4.5" />, desc: "نمای کلی سازمان" },
  { key: "users", label: "کاربران", icon: <Users2 className="h-4.5 w-4.5" />, desc: "مدیریت اعضا و پرونده‌ها" },
  { key: "review", label: "بررسی اخبار", icon: <ClipboardList className="h-4.5 w-4.5" />, desc: "صف تصمیم‌گیری" },
  { key: "challenges", label: "چالش‌ها", icon: <Trophy className="h-4.5 w-4.5" />, desc: "ایجاد و اعلام نتایج" },
  { key: "broadcast", label: "پیام همگانی", icon: <Megaphone className="h-4.5 w-4.5" />, desc: "اطلاع‌رسانی سازمانی" },
  { key: "exports", label: "خروجی‌ها", icon: <FileDown className="h-4.5 w-4.5" />, desc: "گزارش‌های CSV" },
]

export default function AdminPage() {
  const router = useRouter()
  const { userId, state, booted, login, refresh } = useApp()
  const [section, setSection] = useState<SectionKey>("overview")

  // بازیابی نشست از حافظه محلی (مشترک با اپ)
  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) login(uid).catch(() => router.replace("/"))
    else router.replace("/")
  }, [login, router])

  // تازه‌سازی دوره‌ای
  useEffect(() => {
    if (!userId) return
    const t = setInterval(() => refresh(), 45000)
    return () => clearInterval(t)
  }, [userId, refresh])

  // نگهبان دسترسی: فقط ادمین کل
  useEffect(() => {
    if (booted && state && state.user.role !== "admin") router.replace("/")
  }, [booted, state, router])

  if (!booted || !state || state.user.role !== "admin") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--page)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface">
            {booted ? <ShieldCheck className="h-7 w-7 text-danger" /> : <Loader2 className="h-7 w-7 animate-spin text-neon" />}
          </span>
          <p className="text-[13px] font-bold text-ink-muted">
            {booted ? "دسترسی فقط برای ادمین کل مجاز است — بازگشت به اپ..." : "در حال ورود به پنل مدیریت..."}
          </p>
        </div>
      </main>
    )
  }

  const user = state.user
  const pending = state.pendingUsersCount
  const current = NAV.find((n) => n.key === section)!

  return (
    <main className="min-h-dvh bg-[var(--page)]">
      <div className="mx-auto flex max-w-[1200px] flex-col lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        {/* سایدبار دسکتاپ */}
        <aside className="hidden w-60 shrink-0 flex-col rounded-[28px] border border-line bg-surface p-4 lg:sticky lg:top-6 lg:flex lg:h-[calc(100dvh-3rem)]">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <NeonAvatar name={user.fullName} src={user.avatar} size={46} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-ink">{user.fullName}</p>
              <p className="text-[10px] font-bold text-neon">ادمین کل خبرگزاری</p>
            </div>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1.5" aria-label="ناوبری پنل مدیریت">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-right transition-all",
                  section === n.key
                    ? "border-neon/40 bg-neon/10 text-ink"
                    : "border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", section === n.key ? "bg-neon text-neon-foreground" : "bg-surface-2")}>
                  {n.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold">
                    {n.label}
                    {n.key === "users" && pending > 0 && (
                      <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-black text-white">{fa(pending)}</span>
                    )}
                    {n.key === "review" && state.reviewQueue.length > 0 && (
                      <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-warn px-1 text-[9px] font-black text-black">{fa(state.reviewQueue.length)}</span>
                    )}
                  </span>
                  <span className="block truncate text-[9.5px] text-ink-muted/70">{n.desc}</span>
                </span>
              </button>
            ))}
          </nav>

          <button
            onClick={() => router.push("/")}
            className="mt-4 flex items-center justify-center gap-2 rounded-full border border-line bg-surface-2 py-3 text-[12.5px] font-bold text-ink transition-colors hover:bg-surface"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به اپلیکیشن
          </button>
        </aside>

        {/* ستون اصلی */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* سربرگ */}
          <header className="sticky top-0 z-30 border-b border-line bg-[var(--nav-bg)]/95 px-4 py-3 backdrop-blur-lg lg:rounded-[24px] lg:border lg:px-5">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 lg:mx-0">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[15px] font-black text-ink">
                  {current.icon}
                  {current.label}
                  <span className="hidden text-[11px] font-medium text-ink-muted sm:inline">— {current.desc}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-muted lg:hidden">
                  <ShieldCheck className="h-3 w-3 text-neon" />
                  پنل مدیریت خبرگزاری بسیج شهر رشت
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle compact />
                <button
                  onClick={() => router.push("/")}
                  className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[12px] font-bold text-ink transition-colors hover:bg-surface-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="hidden sm:inline">بازگشت به اپ</span>
                </button>
                <NeonAvatar name={user.fullName} src={user.avatar} size={40} className="hidden sm:inline-flex" />
              </div>
            </div>
          </header>

          {/* ناوبری موبایل */}
          <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-line px-4 py-3 lg:hidden" aria-label="ناوبری پنل مدیریت">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11.5px] font-bold transition-colors",
                  section === n.key ? "border-neon bg-neon text-neon-foreground" : "border-line bg-surface text-ink-muted",
                )}
              >
                {n.icon}
                {n.label}
                {n.key === "users" && pending > 0 && (
                  <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-black text-white">{fa(pending)}</span>
                )}
                {n.key === "review" && state.reviewQueue.length > 0 && (
                  <span className={cn("flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[9px] font-black", section === n.key ? "bg-black/20 text-white" : "bg-warn text-black")}>
                    {fa(state.reviewQueue.length)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* محتوا */}
          <div className="nice-scroll flex-1 p-4 lg:p-6" key={section}>
            <div className="stage-enter">
              {section === "overview" && <AdminOverviewSection onGoto={setSection} />}
              {section === "users" && <AdminUsersSection />}
              {section === "review" && <AdminReviewSection />}
              {section === "challenges" && <AdminChallengesSection />}
              {section === "broadcast" && <AdminBroadcastSection />}
              {section === "exports" && <AdminExportsSection />}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
