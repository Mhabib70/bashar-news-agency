"use client"

import { Home, Newspaper, BarChart3, UserRound, ClipboardCheck } from "lucide-react"
import { useApp, type Tab } from "@/lib/store"
import { fa } from "@/lib/format"
import { cn } from "@/lib/utils"

export function BottomNav({ onReview }: { onReview: () => void }) {
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
    <nav className="sticky bottom-0 z-30 mt-auto border-t border-line bg-[#101208]/95 px-2 pb-2 pt-1.5 backdrop-blur-lg" aria-label="ناوبری اصلی">
      <div className={cn("flex items-end justify-around", isReviewer && "gap-0")}>
        {items.slice(0, 2).map((it) => (
          <NavBtn key={it.id} label={it.label} icon={it.icon} active={tab === it.id} onClick={() => setTab(it.id)} />
        ))}
        {isReviewer ? (
          <button
            onClick={onReview}
            className="relative -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neon text-neon-foreground shadow-[0_12px_30px_-8px_rgba(201,247,58,0.65)] transition-transform hover:scale-105 active:scale-95"
            aria-label="صف بررسی"
          >
            <ClipboardCheck className="h-6 w-6" />
            {state.reviewQueue.length > 0 && (
              <span className="absolute -left-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5c5c] px-1 text-[10px] font-black text-white">
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
      className={cn(
        "flex min-w-16 flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors",
        active ? "text-neon" : "text-ink-muted hover:text-ink",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
      <span className={cn("h-1 w-1 rounded-full", active ? "bg-neon" : "bg-transparent")} />
    </button>
  )
}
