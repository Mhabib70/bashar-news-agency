"use client"

import { Home, Newspaper, Trophy, UserRound, ClipboardCheck, SquarePen } from "lucide-react"
import { useApp, type Tab } from "@/lib/store"
import { fa } from "@/lib/format"
import { cn } from "@/lib/utils"

export function BottomNav({
  onReview,
  onSubmit,
  className,
}: {
  onReview: () => void
  onSubmit: () => void
  className?: string
}) {
  const { state, tab, setTab } = useApp()
  if (!state) return null
  const isReviewer = state.user.role !== "reporter"

  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "خانه", icon: <Home className="h-[22px] w-[22px]" /> },
    { id: "news", label: "اخبار", icon: <Newspaper className="h-[22px] w-[22px]" /> },
    { id: "activity", label: "کارنامه", icon: <Trophy className="h-[22px] w-[22px]" /> },
    { id: "profile", label: "پروفایل", icon: <UserRound className="h-[22px] w-[22px]" /> },
  ]

  return (
    <nav
      className={cn("fixed inset-x-0 bottom-0 z-40 px-4 pb-safe lg:hidden", className)}
      aria-label="ناوبری اصلی"
    >
      <div className="v3-navpill mx-auto mb-2 flex max-w-md items-center justify-between rounded-[24px] p-1.5">
        {items.slice(0, 2).map((it) => (
          <NavBtn key={it.id} label={it.label} icon={it.icon} active={tab === it.id} onClick={() => setTab(it.id)} />
        ))}
        {/* دکمهٔ مرکزی شناور: ارسال خبر برای خبرنگار / صف بررسی برای مدیران */}
        <div className="-mt-5 flex items-center justify-center px-1">
          <button
            onClick={isReviewer ? onReview : onSubmit}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-[0_12px_28px_-6px_rgba(157,66,58,0.5)] transition-transform hover:scale-105 active:scale-95"
            aria-label={isReviewer ? "صف بررسی" : "ارسال خبر جدید"}
          >
            {isReviewer ? <ClipboardCheck className="h-7 w-7" /> : <SquarePen className="h-7 w-7" />}
            {isReviewer && state.reviewQueue.length > 0 && (
              <span className="absolute -left-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-black text-white">
                {fa(state.reviewQueue.length)}
              </span>
            )}
          </button>
        </div>
        {items.slice(2).map((it) => (
          <NavBtn key={it.id} label={it.label} icon={it.icon} active={tab === it.id} onClick={() => setTab(it.id)} />
        ))}
      </div>
    </nav>
  )
}

function NavBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] min-w-[62px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors",
        active ? "font-bold text-primary" : "text-on-surface-variant hover:text-on-surface",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="text-[10.5px] font-medium leading-none">{label}</span>
    </button>
  )
}
