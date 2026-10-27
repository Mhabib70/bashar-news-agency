"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { Welcome } from "@/components/app/welcome"
import { HomeScreen } from "@/components/app/home"
import { ActivityScreen } from "@/components/app/activity"
import { NewsScreen } from "@/components/app/news-tab"
import { ProfileScreen } from "@/components/app/profile"
import { ReviewScreen } from "@/components/app/review-tab"
import { SubmitFlow } from "@/components/app/submit-flow"
import {
  NotificationsSheet,
  ChallengesSheet,
  CreateChallengeSheet,
  BroadcastSheet,
  UsersSheet,
} from "@/components/app/sheets"
import { BottomNav } from "@/components/app/bottom-nav"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Hourglass, ShieldX, LogOut } from "lucide-react"

export default function Page() {
  const { userId, state, booted, tab, setTab, login, refresh } = useApp()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [challengesOpen, setChallengesOpen] = useState(false)
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [submitPreset, setSubmitPreset] = useState<null | { category?: string; title?: string; content?: string; draftId?: number | null }>(null)
  const [switchOpen, setSwitchOpen] = useState(false)

  // راه‌اندازی: بازیابی نشست قبلی
  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) {
      login(uid).catch(() => localStorage.removeItem("newsapp_uid"))
    } else {
      useApp.setState({ booted: true })
    }
  }, [])

  // تازه‌سازی دوره‌ای
  useEffect(() => {
    if (!userId) return
    const t = setInterval(() => refresh(), 30000)
    return () => clearInterval(t)
  }, [userId, refresh])

  const openSubmit = (preset?: typeof submitPreset) => {
    setSubmitPreset(preset ?? null)
    setSubmitOpen(true)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#060704] sm:p-6">
      {/* پس‌زمینه دسکتاپ */}
      <div className="pointer-events-none fixed inset-0 hidden sm:block" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon/6 blur-[140px]" />
        <div className="absolute bottom-10 right-16 h-72 w-72 rounded-full bg-neon/4 blur-[110px]" />
      </div>

      {/* قاب موبایل */}
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background sm:h-[860px] sm:max-h-[92dvh] sm:w-[420px] sm:rounded-[44px] sm:border sm:border-[#2a2e1d] sm:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_80px_-40px_rgba(201,247,58,0.25)]">
        {!booted ? (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <Skeleton className="h-[54%] w-full rounded-[28px] bg-surface" />
            <Skeleton className="h-10 w-2/3 rounded-full bg-surface" />
            <Skeleton className="h-44 w-full rounded-[28px] bg-surface" />
          </div>
        ) : !userId || !state ? (
          <Welcome />
        ) : state.user.status !== "active" ? (
          <AccountGate />
        ) : (
          <>
            <div key={tab} className="nice-scroll flex-1 overflow-y-auto">
              {tab === "home" && (
                <HomeScreen
                  onOpenNotifications={() => setNotifOpen(true)}
                  onQuickSubmit={() => openSubmit()}
                  onOpenChallenges={() => setChallengesOpen(true)}
                  onOpenNews={() => setTab("news")}
                  onGotoActivity={() => setTab("activity")}
                  onGotoReview={() => setTab("review")}
                  onOpenUsers={() => setUsersOpen(true)}
                  onOpenCreateChallenge={() => setCreateChallengeOpen(true)}
                  onOpenBroadcast={() => setBroadcastOpen(true)}
                />
              )}
              {tab === "news" && <NewsScreen onQuickSubmit={() => openSubmit()} draftsView />}
              {tab === "activity" && <ActivityScreen />}
              {tab === "profile" && <ProfileScreen onSwitchAccount={() => setSwitchOpen(true)} />}
              {tab === "review" && <ReviewScreen />}
            </div>
            <BottomNav onReview={() => setTab("review")} />
          </>
        )}

        {/* شیت‌ها */}
        <SubmitFlow open={submitOpen} onClose={() => setSubmitOpen(false)} preset={submitPreset} />
        <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
        <ChallengesSheet open={challengesOpen} onClose={() => setChallengesOpen(false)} onOpenCreate={() => setCreateChallengeOpen(true)} />
        <CreateChallengeSheet open={createChallengeOpen} onClose={() => setCreateChallengeOpen(false)} />
        <BroadcastSheet open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
        <UsersSheet open={usersOpen} onClose={() => setUsersOpen(false)} />
        <SwitchAccountSheet open={switchOpen} onClose={() => setSwitchOpen(false)} />
      </div>
    </main>
  )
}

// دروازه حساب غیرفعال (در انتظار تایید / رد شده)
function AccountGate() {
  const { state, logout } = useApp()
  if (!state) return null
  const pending = state.user.status === "pending"
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <span className={`flex h-20 w-20 items-center justify-center rounded-full ${pending ? "bg-warn/12 text-warn" : "bg-[#ff5c5c]/12 text-[#ff8484]"}`}>
        {pending ? <Hourglass className="h-10 w-10" /> : <ShieldX className="h-10 w-10" />}
      </span>
      <h2 className="text-[19px] font-black text-ink">{pending ? "در انتظار تایید مدیر" : "درخواست شما رد شد"}</h2>
      <p className="max-w-[280px] text-[12.5px] leading-6 text-ink-muted">
        {pending
          ? "حساب شما ساخته شده و پس از تایید ادمین فعال می‌شود. بعداً دوباره وارد شوید."
          : state.user.rejectReason
            ? `دلیل: ${state.user.rejectReason} — می‌توانید با ثبت‌نام مجدد دوباره تلاش کنید.`
            : "می‌توانید با ثبت‌نام مجدد دوباره تلاش کنید."}
      </p>
      <button
        onClick={logout}
        className="mt-2 flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-[13.5px] font-bold text-ink transition-colors hover:bg-surface-2"
      >
        <LogOut className="h-4 w-4" />
        بازگشت به صفحه ورود
      </button>
    </div>
  )
}

function SwitchAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, userId } = useApp()
  const [users, setUsers] = useState<{ id: string; fullName: string; role: string; district: string }[]>([])
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
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-right transition-colors ${u.id === userId ? "border-neon/50 bg-neon/8" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              <span className="text-[13.5px] font-bold text-ink">{u.fullName}</span>
              <span className="text-[11px] text-ink-muted">{ROLE_LABELS[u.role]}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
