"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { fa, faNum } from "@/lib/format"
import { REVIEW_STAGES } from "@/lib/domain"
import { cn } from "@/lib/utils"

// ---------- حلقه پیشرفت ----------
export function Ring({
  value,
  max,
  size = 168,
  stroke = 12,
  children,
  trackClass = "stroke-[#2b2f1e]",
  barClass = "stroke-neon",
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  children?: React.ReactNode
  trackClass?: string
  barClass?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - (mounted ? pct : 0))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-anim -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(barClass)}
          style={{ filter: "drop-shadow(0 0 8px rgba(201,247,58,0.45))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

// ---------- سربرگ بخش ----------
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-[13px] font-semibold text-neon transition-opacity hover:opacity-80">
          {action}
        </button>
      )}
    </div>
  )
}

// ---------- چیپ وضعیت خبر ----------
export function StatusChip({ status, small }: { status: string; small?: boolean }) {
  const map = {
    approved: { label: "تایید شده", cls: "bg-neon/12 text-neon border-neon/25" },
    rejected: { label: "رد شده", cls: "bg-[#ff5c5c]/10 text-[#ff8484] border-[#ff5c5c]/25" },
    pending: { label: "در بررسی", cls: "bg-[#ffc24b]/10 text-[#ffc24b] border-[#ffc24b]/25" },
  } as const
  const it = map[status as keyof typeof map] ?? map.pending
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-semibold", it.cls, small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]")}>
      {status === "approved" ? <CheckCircle2 className={small ? "h-3 w-3" : "h-3.5 w-3.5"} /> : status === "rejected" ? <XCircle className={small ? "h-3 w-3" : "h-3.5 w-3.5"} /> : <Clock className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {it.label}
    </span>
  )
}

// ---------- نقاط مراحل بررسی ----------
export function StageDots({ status, stage }: { status: string; stage: string }) {
  if (status === "approved") {
    return (
      <div className="flex items-center gap-1.5">
        {REVIEW_STAGES.map((s) => (
          <span key={s.key} className="h-1.5 w-6 rounded-full bg-neon/80" />
        ))}
      </div>
    )
  }
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-6 rounded-full bg-[#ff5c5c]/70" />
        <span className="h-1.5 w-6 rounded-full bg-[#2b2f1e]" />
        <span className="h-1.5 w-6 rounded-full bg-[#2b2f1e]" />
      </div>
    )
  }
  const idx = Math.max(0, REVIEW_STAGES.findIndex((s) => s.key === stage))
  return (
    <div className="flex items-center gap-1.5">
      {REVIEW_STAGES.map((s, i) => (
        <span
          key={s.key}
          className={cn("h-1.5 w-6 rounded-full", i < idx ? "bg-neon/50" : i === idx ? "bg-[#ffc24b]" : "bg-[#2b2f1e]")}
        />
      ))}
    </div>
  )
}

// ---------- کارت آمار ----------
export function StatCard({
  icon,
  value,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  value: string
  label: string
  sub?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-3xl bg-surface px-2 py-4 text-center transition-colors hover:bg-surface-2"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">{icon}</span>
      <span className="text-[19px] font-black leading-none text-ink">{value}</span>
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
      {sub && <span className="text-[9.5px] text-ink-muted/70">{sub}</span>}
    </button>
  )
}

// ---------- آواتار حروف اول ----------
export function Avatar({ name, size = 44, tone = "neon" }: { name: string; size?: number; tone?: "neon" | "dark" }) {
  const parts = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("")
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        tone === "neon" ? "bg-neon text-neon-foreground" : "bg-surface-2 text-ink border border-line",
      )}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {parts}
    </span>
  )
}

// ---------- شمارنده انیمیشنی ----------
export function CountUp({ to, fmt = faNum, className }: { to: number; fmt?: (n: number) => string; className?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const dur = 900
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <span className={className}>{fmt(v)}</span>
}

export { fa }
