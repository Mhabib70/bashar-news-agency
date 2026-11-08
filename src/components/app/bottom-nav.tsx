"use client"

import { Home, Newspaper, BarChart3, UserRound, ClipboardCheck } from "lucide-react"
import { useApp, type Tab } from "@/lib/store"
import { fa } from "@/lib/format"
import { cn } from "@/lib/utils"

export function BottomNav({ onReview, className }: { onReview: () => void; className?: string }) {
  const { state, tab, setTab } = useApp()
  if (!state) return null
  const isReviewer = state.user.role !== "reporter"

  const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "خانه", icon: <Home className="h-5 w-5" /> },
    { id: "news", label: "اخبار", icon: <Newspaper className="h-5 w-5" /> },
    { id: "activity", label: "فعالیت", icon: <BarChart3 className="h-5 w-5" /> },
    { id: "profile", label: "پروفایل", icon: <UserRound className="h-5 w-5" /> },
  ]

  return (
    <nav
      className={cn("fixed inset-x-4 bottom-3 z-40 lg:hidden", className)}
      aria-label="ناوبری اصلی"
    >
      <div className="v3-navpill mx-auto flex max-w-[440px] items-end justify-around rounded-[26px] px-2.5 pb-2 pt-2">
        {items.slice(0, 2).map((it) => (
          <NavBtn key={it.id} label={it.label} icon={it.icon} active={tab === it.id} onClick={() => setTab(it.id)} />
        ))}
        {isReviewer ? (
          <button
            onClick={onReview}
            className="relative -mt-8 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--v3-amber-2)] to-[var(--v3-amber)] text-[#42290a] shadow-[0_14px_30px_-8px_rgba(245,158,11,0.65)] ring-4 ring-[var(--v3-page)] transition-transform hover:scale-105 active:scale-95"
            aria-label="صف بررسی"
          >
            <ClipboardCheck className="h-6 w-6" />
            {state.reviewQueue.length > 0 && (
              <span className="absolute -left-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-black text-white">
                {fa(state.reviewQueue.length)}
              </span>
            )}
          </button>
        ) : (
          <span className="w-14 shrink-0" />
        )}
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
      className="flex min-w-[62px] flex-col items-center gap-0.5 py-0.5 transition-colors"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition-all",
          active
            ? "bg-white text-[var(--v3-navy-deep)] shadow-[0_8px_18px_-6px_rgba(4,9,30,0.45)]"
            : "bg-transparent text-white/55",
        )}
      >
        {icon}
      </span>
      <span className={cn("text-[9.5px] leading-none font-bold", active ? "text-white" : "text-white/45")}>
        {label}
      </span>
    </button>
  )
}
