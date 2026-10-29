"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/lib/store"
import { Welcome } from "@/components/app/welcome"
import { Avatar } from "@/components/app/bits"
import { HomeScreen } from "@/components/app/home"
import { ActivityScreen } from "@/components/app/activity"
import { NewsScreen } from "@/components/app/news-tab"
import { ProfileScreen } from "@/components/app/profile"
import { ReviewScreen } from "@/components/app/review-tab"
import { SubmitFlow } from "@/components/app/submit-flow"
import { NotificationsSheet, ChallengesSheet } from "@/components/app/sheets"
import { BottomNav } from "@/components/app/bottom-nav"
import { TopBar, SideNav, RightRail } from "@/components/app/social"
import { USER_REJECT_TITLES } from "@/lib/domain"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Hourglass, ShieldX, LogOut } from "lucide-react"

export default function Page() {
  const router = useRouter()
  const { userId, state, booted, tab, setTab, login, logout, refresh } = useApp()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [challengesOpen, setChallengesOpen] = useState(false)
  const [submitPreset, setSubmitPreset] = useState<null | { category?: string; title?: string; content?: string; draftId?: number | null }>(null)
  const [switchOpen, setSwitchOpen] = useState(false)

  const openAdmin = () => router.push("/admin")

  // راه‌اندازی: بازیابی نشست قبلی
  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) {
      login(uid).catch(() => localStorage.removeItem("newsapp_uid"))
    } else {
      useApp.setState({ booted: true })
    }
  }, [])

  // پیش‌نمایش آنلاین چرخه: پولینگ هوشمند — فقط وقتی صفحه مرئی است + رفرش فوری هنگام بازگشت
  useEffect(() => {
    if (!userId) return
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") refresh()
    }
    const t = setInterval(tick, 30000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [userId, refresh])

  const openSubmit = (preset?: typeof submitPreset) => {
    setSubmitPreset(preset ?? null)
    setSubmitOpen(true)
  }

  const user = state?.user
  const loggedIn = !!(userId && state && user && user.status === "active")

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--page)]">
      {!booted ? (
        <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-6 p-6">
          <Skeleton className="h-[54%] w-full rounded-[28px] bg-surface" />
          <Skeleton className="h-10 w-2/3 rounded-full bg-surface" />
          <Skeleton className="h-44 w-full rounded-[28px] bg-surface" />
        </div>
      ) : !userId || !state ? (
        /* ورود: در موبایل تمام‌صفحه، در دسکتاپ قاب مرکزی */
        <div className="mx-auto flex h-dvh w-full max-w-[460px] flex-col overflow-hidden sm:my-6 sm:h-[min(880px,94dvh)] sm:rounded-[36px] sm:border sm:border-[var(--frame-border)] sm:shadow-[0_40px_120px_-40px_rgba(23,50,31,0.45)]">
          <Welcome />
        </div>
      ) : user?.status === "pending" ? (
        <GateScreen
          icon={<Hourglass className="h-10 w-10 text-warn" />}
          title="حساب شما در انتظار تایید است"
          body="درخواست عضویت شما برای ادمین کل ارسال شد. به‌محض تایید، به‌صورت خودکار وارد محیط خبرگزاری می‌شوید. معمولاً بررسی کمتر از ۷۲ ساعت طول می‌کشد."
        />
      ) : user?.status === "rejected" ? (
        <GateScreen
          icon={<ShieldX className="h-10 w-10 text-danger-soft" />}
          title="درخواست عضویت شما تایید نشد"
          body={user.rejectReason ? `دلیل: ${USER_REJECT_TITLES[user.rejectReason] ?? user.rejectReason}` : "درخواست شما رد شده است."}
          action={
            <button
              onClick={logout}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--neon)] py-3.5 text-[14px] font-bold text-[var(--neon-foreground)]"
            >
              <LogOut className="h-4.5 w-4.5" />
              بازگشت و ثبت‌نام مجدد
            </button>
          }
        />
      ) : (
        <>
          <TopBar
            state={state}
            onOpenNotifications={() => setNotifOpen(true)}
            onOpenSwitch={() => setSwitchOpen(true)}
            onGotoNews={() => setTab("news")}
          />

          <div className="mx-auto grid w-full max-w-[1380px] flex-1 items-start gap-4 px-3 pb-28 lg:grid-cols-[262px_minmax(0,1fr)_306px] lg:gap-5 lg:px-5 lg:pb-8 lg:pt-5">
            {/* ستون راست (دسکتاپ): پروفایل، منو، چالش‌ها */}
            <aside className="hidden lg:sticky lg:top-[84px] lg:block">
              <SideNav
                state={state}
                tab={tab}
                setTab={setTab}
                onGotoReview={() => setTab("review")}
                onOpenAdmin={openAdmin}
                onOpenNotifications={() => setNotifOpen(true)}
                onOpenChallenges={() => setChallengesOpen(true)}
              />
            </aside>

            {/* ستون میانی: محتوای تب فعال */}
            <div key={tab} className="nice-scroll min-w-0">
              {tab === "home" && (
                <HomeScreen
                  onOpenNotifications={() => setNotifOpen(true)}
                  onQuickSubmit={() => openSubmit()}
                  onOpenChallenges={() => setChallengesOpen(true)}
                  onOpenNews={() => setTab("news")}
                  onGotoActivity={() => setTab("activity")}
                  onGotoReview={() => setTab("review")}
                  onOpenAdmin={openAdmin}
                />
              )}
              {tab === "news" && <NewsScreen onQuickSubmit={() => openSubmit()} draftsView />}
              {tab === "activity" && <ActivityScreen />}
              {tab === "profile" && <ProfileScreen onSwitchAccount={() => setSwitchOpen(true)} onOpenAdmin={openAdmin} />}
              {tab === "review" && <ReviewScreen />}
            </div>

            {/* ستون چپ (دسکتاپ): اعلان‌ها، برترین‌ها، چالش */}
            <aside className="hidden lg:sticky lg:top-[84px] lg:block">
              <RightRail state={state} onOpenNotifications={() => setNotifOpen(true)} onOpenChallenges={() => setChallengesOpen(true)} />
            </aside>
          </div>

          <div className="lg:hidden">
            <BottomNav onReview={() => setTab("review")} />
          </div>
        </>
      )}

      {/* شیت‌ها */}
      <SubmitFlow open={submitOpen} onClose={() => setSubmitOpen(false)} preset={submitPreset} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
      <ChallengesSheet open={challengesOpen} onClose={() => setChallengesOpen(false)} />
      <SwitchAccountSheet open={switchOpen} onClose={() => setSwitchOpen(false)} />
    </main>
  )
}

// صفحه انتظار/رد عضویت (سناریوی ۱ ربات)
function GateScreen({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center justify-center gap-4 px-8 text-center stage-enter">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface border border-line">{icon}</span>
      <h2 className="text-[19px] font-black text-ink">{title}</h2>
      <p className="max-w-[280px] text-[12.5px] leading-6 text-ink-muted">{body}</p>
      {action}
    </div>
  )
}

function SwitchAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, userId } = useApp()
  const [users, setUsers] = useState<{ id: string; fullName: string; avatar: string; role: string; district: string }[]>([])
  useEffect(() => {
    if (open) {
      fetch("/api/bootstrap")
        .then((r) => r.json())
        .then((d) => setUsers(d.users))
        .catch(() => setUsers([]))
    }
  }, [open])
  const ROLE_LABELS: Record<string, string> = { reporter: "خبرنگار", district_manager: "مدیر حوزه", specialist: "کارشناس خبر", admin: "ادمین کل" }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[70dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="text-ink">تغییر حساب (دمو)</DialogTitle>
          <DialogDescription className="text-ink-muted">برای دیدن اپ از دید نقش‌های دیگر، حساب را عوض کن.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onClose()
                if (u.id !== userId) login(u.id)
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-right transition-colors ${u.id === userId ? "border-[var(--neon)]/50 bg-[var(--neon)]/8" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              <span className="flex items-center gap-3">
                <Avatar name={u.fullName} src={u.avatar} size={36} />
                <span className="text-[13.5px] font-bold text-ink">{u.fullName}</span>
              </span>
              <span className="text-[11px] text-ink-muted">{ROLE_LABELS[u.role]}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
