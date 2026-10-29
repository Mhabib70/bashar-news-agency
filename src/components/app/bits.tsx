"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, Clock, Send, RotateCcw, PartyPopper } from "lucide-react"
import { fa, faNum, relTime } from "@/lib/format"
import { REVIEW_STAGES, NEWS_EVENT_META, STAGE_ROLE_ICON, ROLE_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"

// ---------- حلقه پیشرفت ----------
export function Ring({
  value,
  max,
  size = 168,
  stroke = 12,
  children,
  trackClass = "stroke-line",
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
          style={{ filter: "drop-shadow(0 0 8px rgba(47,107,51,0.45))" }}
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
    rejected: { label: "رد شده", cls: "bg-danger/10 text-danger-soft border-danger/25" },
    pending: { label: "در بررسی", cls: "bg-warn/10 text-warn border-warn/25" },
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
        <span className="h-1.5 w-6 rounded-full bg-danger/70" />
        <span className="h-1.5 w-6 rounded-full bg-line" />
        <span className="h-1.5 w-6 rounded-full bg-line" />
      </div>
    )
  }
  const idx = Math.max(0, REVIEW_STAGES.findIndex((s) => s.key === stage))
  return (
    <div className="flex items-center gap-1.5">
      {REVIEW_STAGES.map((s, i) => (
        <span
          key={s.key}
          className={cn("h-1.5 w-6 rounded-full", i < idx ? "bg-neon/50" : i === idx ? "bg-warn" : "bg-line")}
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

// ---------- آواتار: عکس پروفایل یا حروف اول ----------
export function Avatar({ name, size = 44, tone = "neon", src }: { name: string; size?: number; tone?: "neon" | "dark"; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
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

// ---------- کادر آواتار نئونی: مربع کج با حاشیه قرمز نئونی (کادر حرفه‌ای) ----------
export function NeonAvatar({ name, src, size = 56, className }: { name: string; src?: string; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("")
  return (
    <span
      className={cn("avatar-neon inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`عکس ${name}`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center bg-neon/15 font-black text-neon"
          style={{ fontSize: size * 0.32 }}
          aria-hidden
        >
          {parts}
        </span>
      )}
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

// ---------- تایم‌لاین زنده چرخه خبر (پیش‌نمایش آنلاین مراحل) ----------
type TimelineEvent = { stage: string; action: string; actorName: string; actorRole: string; note: string; at: string }
type TimelineNews = {
  status: string
  reviewStage: string
  rejectReason?: string
  createdAt: string
  events: TimelineEvent[]
}

function waitFmt(ms: number): string {
  const m = Math.floor(ms / 60000)
  if (m < 1) return "چند لحظه"
  if (m < 60) return `${fa(m)} دقیقه`
  const h = Math.floor(m / 60)
  if (h < 24) return `${fa(h)} ساعت${m % 60 ? ` و ${fa(m % 60)} دقیقه` : ""}`
  return `${fa(Math.floor(h / 24))} روز`
}

/** تایمر زنده — هر ۱۵ ثانیه تیک می‌خورد تا زمان انتظار همیشه به‌روز باشد */
function useTick(ms = 15000) {
  const [, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((x) => x + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

export function StageTimeline({ news, compact }: { news: TimelineNews; compact?: boolean }) {
  useTick(15000)
  const now = Date.now()

  // رویدادهای کلیدی چرخه
  const submitted = news.events.find((e) => e.action === "submitted") ?? (news.events.length ? null : { at: news.createdAt, actorName: "", actorRole: "", note: "", stage: "", action: "submitted" })
  const resubmits = news.events.filter((e) => e.action === "resubmitted")
  const stageDone = new Map<string, TimelineEvent>() // آخرین advanced هر مرحله
  for (const e of news.events) if (e.action === "advanced") stageDone.set(e.stage, e)
  const finalEv = news.events.find((e) => e.action === "final_approved")
  const rejectEv = news.events.find((e) => e.action === "rejected")
  const lastActivity = news.events.length ? news.events[news.events.length - 1].at : news.createdAt

  const currentIdx = news.status === "pending" ? Math.max(0, REVIEW_STAGES.findIndex((s) => s.key === news.reviewStage)) : -1
  const progress = news.status === "approved" ? 100 : news.status === "rejected" ? Math.round(((currentIdx + 1) / 3) * 100) : Math.round((currentIdx / 3) * 100)
  const waitingMs = now - new Date(lastActivity).getTime()

  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      {/* نوار پیشرفت + وضعیت زنده */}
      <div className="mb-1 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12.5px] font-black text-ink">
          <span className="relative flex h-2 w-2">
            {news.status === "pending" && (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-warn" />
              </>
            )}
            {news.status === "approved" && <span className="inline-flex h-2 w-2 rounded-full bg-neon" />}
            {news.status === "rejected" && <span className="inline-flex h-2 w-2 rounded-full bg-danger" />}
          </span>
          {news.status === "pending" ? "در جریان چرخه بررسی" : news.status === "approved" ? "چرخه کامل شد — منتشر شد" : "چرخه متوقف شد"}
        </p>
        <span className={cn("text-[10.5px] font-black", news.status === "approved" ? "text-neon" : news.status === "rejected" ? "text-danger-soft" : "text-warn")}>
          {fa(progress)}٪
        </span>
      </div>
      <div className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all duration-700", news.status === "approved" ? "bg-neon" : news.status === "rejected" ? "bg-danger/70" : "bg-warn")}
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>

      {news.status === "pending" && (
        <p className="mb-3 rounded-xl bg-warn/8 px-3 py-2 text-[11px] font-semibold text-warn">
          ⏱ {waitFmt(waitingMs)} است که در مرحله «{REVIEW_STAGES[currentIdx]?.label}» منتظر تصمیم است
        </p>
      )}

      <div className={cn("relative", compact ? "space-y-3" : "space-y-0")}>
        {/* ورود خبر به چرخه */}
        {submitted && (
          <TimelineRow
            icon={<Send className="h-3 w-3" />}
            title={NEWS_EVENT_META.submitted.label}
            sub={`${relTime(submitted.at)}${submitted.actorName ? ` · ${submitted.actorName}` : ""}`}
            tone="muted"
            first
          />
        )}
        {/* ارسال‌های مجدد */}
        {resubmits.map((e, i) => (
          <TimelineRow key={`re-${i}`} icon={<RotateCcw className="h-3 w-3" />} title={`${NEWS_EVENT_META.resubmitted.label} (نوبت ${fa(i + 1)})`} sub={`${relTime(e.at)} · ${e.actorName}`} tone="muted" />
        ))}

        {/* سه مرحله رسمی */}
        {REVIEW_STAGES.map((s, i) => {
          const done = stageDone.get(s.key)
          const isCurrent = news.status === "pending" && news.reviewStage === s.key
          const failedHere = rejectEv && (rejectEv.stage === s.key || (news.status === "rejected" && i === currentIdx))
          const skippedByFinal = !!finalEv && !done && i < REVIEW_STAGES.findIndex((x) => x.key === finalEv.stage)
          return (
            <TimelineRow
              key={s.key}
              icon={<span className="text-[10px] leading-none">{STAGE_ROLE_ICON[s.key]}</span>}
              title={s.label}
              sub={
                done
                  ? `${done.actorName} (${ROLE_LABELS[done.actorRole] ?? "ارزیاب"}) · ${relTime(done.at)}`
                  : failedHere
                    ? `${rejectEv!.actorName} (${ROLE_LABELS[rejectEv!.actorRole] ?? "ارزیاب"}) · ${relTime(rejectEv!.at)}`
                    : isCurrent
                      ? "در انتظار تصمیم…"
                      : "هنوز نرسیده"
              }
              note={failedHere ? rejectEv!.note : done?.note}
              tone={done ? "done" : failedHere ? "failed" : isCurrent ? "current" : skippedByFinal ? "done" : "waiting"}
            />
          )
        })}

        {/* انتشار نهایی */}
        {news.status === "approved" && (
          <TimelineRow
            icon={<PartyPopper className="h-3 w-3" />}
            title="منتشر شد"
            sub={finalEv ? `${finalEv.actorName} · ${relTime(finalEv.at)}` : "تایید نهایی"}
            note={finalEv?.note}
            tone="final"
          />
        )}
      </div>
    </div>
  )
}

function TimelineRow({
  icon,
  title,
  sub,
  note,
  tone,
  first,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  note?: string
  tone: "done" | "current" | "failed" | "waiting" | "muted" | "final"
  first?: boolean
}) {
  const styles = {
    done: { dot: "bg-neon text-neon-foreground", title: "text-ink", sub: "text-ink-muted" },
    current: { dot: "bg-warn text-black animate-pulse", title: "text-ink font-black", sub: "text-warn" },
    failed: { dot: "bg-danger text-white", title: "text-danger-soft", sub: "text-ink-muted" },
    waiting: { dot: "bg-surface-2 text-ink-muted/50 border border-line", title: "text-ink-muted/60", sub: "text-ink-muted/50" },
    muted: { dot: "bg-surface-2 text-ink-muted border border-line", title: "text-ink-muted", sub: "text-ink-muted/70" },
    final: { dot: "bg-neon text-neon-foreground", title: "text-neon", sub: "text-ink-muted" },
  }[tone]
  return (
    <div className={cn("relative flex gap-3 pr-0.5", first ? "" : "mt-3")}>
      <span className={cn("z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-[0_0_0_3px_var(--surface)]", styles.dot)}>{icon}</span>
      <div className="min-w-0 flex-1 border-b border-line/60 pb-2.5 last:border-0">
        <p className={cn("text-[12.5px] font-bold leading-5", styles.title)}>{title}</p>
        <p className={cn("text-[10.5px] leading-5", styles.sub)}>{sub}</p>
        {note && <p className="mt-0.5 rounded-lg bg-surface-2 px-2 py-1 text-[10.5px] leading-5 text-ink-muted">{note}</p>}
      </div>
    </div>
  )
}

// چیپ کوچک مرحله فعلی برای کارت‌های صف
export function StageChip({ status, stage }: { status: string; stage: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-neon/12 px-2 py-0.5 text-[9.5px] font-black text-neon">
        <CheckCircle2 className="h-2.5 w-2.5" /> منتشر شد
      </span>
    )
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[9.5px] font-black text-danger-soft">
        <XCircle className="h-2.5 w-2.5" /> بازگشت به خبرنگار
      </span>
    )
  const idx = Math.max(0, REVIEW_STAGES.findIndex((s) => s.key === stage))
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[9.5px] font-black text-warn">
      <Clock className="h-2.5 w-2.5" /> مرحله {fa(idx + 1)} از {fa(3)}: {REVIEW_STAGES[idx]?.label}
    </span>
  )
}

export { fa }
