"use client"

import { useState } from "react"
import { Bell, Megaphone, Trophy, Users2, Plus, CheckCircle2, XCircle, Flame, CalendarClock } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, faNum, relTime, untilFmt, jalali } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// ---------- شیت اعلان‌ها ----------
export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp()
  if (!state) return null
  const icon = (kind: string) =>
    kind === "approved" ? (
      <CheckCircle2 className="h-4.5 w-4.5 text-neon" />
    ) : kind === "rejected" ? (
      <XCircle className="h-4.5 w-4.5 text-[#ff8484]" />
    ) : (
      <Flame className="h-4.5 w-4.5 text-warn" />
    )
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <Bell className="h-5 w-5 text-neon" />
            اعلان‌ها
          </DialogTitle>
          <DialogDescription className="text-ink-muted">آخرین رویدادهای حساب شما</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {state.notifications.length === 0 && <p className="py-8 text-center text-[12.5px] text-ink-muted">فعلاً اعلانی ندارید.</p>}
          {state.notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">{icon(n.kind)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-ink">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-5 text-ink-muted">{n.body}</p>
              </div>
              <span className="shrink-0 text-[9.5px] text-ink-muted/70">{relTime(n.at)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- شیت چالش‌ها ----------
export function ChallengesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, joinChallenge } = useApp()
  const { toast } = useToast()
  const [busy, setBusy] = useState<number | null>(null)
  if (!state) return null

  const join = async (id: number) => {
    setBusy(id)
    const r = await joinChallenge(id)
    setBusy(null)
    if (r.ok) toast({ title: "ثبت‌نام چالش", description: r.message })
    else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[84dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <Megaphone className="h-5 w-5 text-neon" />
            چالش‌های خبری
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            در چالش‌ها شرکت کن، خبر بفرست و قهرمان شو (سناریوی ۴ ربات).
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          {state.challenges.map((c) => {
            const active = c.status === "active"
            return (
              <div
                key={c.id}
                className={cn("rounded-[24px] border p-4", active ? "border-neon/30 bg-neon/5" : "border-line bg-surface")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-black text-ink">{c.title}</p>
                    <p className="mt-1 text-[11.5px] leading-5 text-ink-muted">{c.description}</p>
                  </div>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                      active ? "bg-neon/12 text-neon" : "bg-surface-2 text-ink-muted",
                    )}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {active ? untilFmt(c.deadlineAt) : jalali(c.endAt)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-bold text-warn">{c.reward}</p>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[10.5px] text-ink-muted">
                    {c.joined ? (
                      <>
                        رتبه تو: <b className="text-neon">{fa(c.myRank ?? 0)}</b> · {fa(c.myCount)} خبر · {fa(c.totalParticipants)} شرکت‌کننده
                      </>
                    ) : (
                      <>{fa(c.totalParticipants)} شرکت‌کننده</>
                    )}
                  </span>
                  {active ? (
                    c.joined ? (
                      <span className="flex items-center gap-1 text-[11.5px] font-bold text-neon">
                        <CheckCircle2 className="h-4 w-4" />
                        شرکت کرده‌ای
                      </span>
                    ) : (
                      <button
                        onClick={() => join(c.id)}
                        disabled={busy !== null}
                        className="rounded-full bg-neon px-4 py-2 text-[12px] font-bold text-neon-foreground disabled:opacity-50"
                      >
                        {busy === c.id ? "..." : "عضویت"}
                      </button>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-[11.5px] font-bold text-warn">
                      <Trophy className="h-4 w-4" />
                      پایان یافته
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
