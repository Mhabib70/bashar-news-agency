"use client"

import { useEffect, useState } from "react"
import { Bell, Megaphone, Trophy, Users2, Plus, CheckCircle2, XCircle, Flame, CalendarClock } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, faNum, relTime, untilFmt, jalali } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// ---------- شیت اعلان‌ها ----------
// اعلان‌هایی که به یک خبر اشاره دارند (ref = "news:123") قابل لمس‌اند و مستقیم خبر را باز می‌کنند
export function NotificationsSheet({
  open,
  onClose,
  onOpenNews,
}: {
  open: boolean
  onClose: () => void
  onOpenNews?: (newsId: number) => void
}) {
  const { state, markNotificationsRead } = useApp()
  // با باز شدن شیت، همهٔ اعلان‌های رسیده خوانده‌شده علامت می‌خورند تا بَج زنگوله پاک شود
  useEffect(() => {
    if (open) markNotificationsRead()
  }, [open])
  if (!state) return null
  const icon = (kind: string) =>
    kind === "approved" ? (
      <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
    ) : kind === "rejected" ? (
      <XCircle className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
    ) : (
      <Flame className="h-4.5 w-4.5 text-warn" />
    )
  const newsRefOf = (ref: string) => {
    const m = /^news:(\d+)$/.exec(ref ?? "")
    return m ? Number(m[1]) : null
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto nice-scroll rounded-[24px] border-outline-variant/50 bg-surface-container-lowest p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-on-surface">
            <Bell className="h-5 w-5 text-primary" />
            اعلان‌ها
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">آخرین رویدادهای حساب شما</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          {state.notifications.length === 0 && <p className="py-8 text-center text-[12.5px] text-on-surface-variant">فعلاً اعلانی ندارید.</p>}
          {state.notifications.map((n) => {
            const newsId = newsRefOf(n.ref)
            const Row = newsId !== null ? "button" : "div"
            return (
              <Row
                key={n.id}
                {...(newsId !== null
                  ? { onClick: () => { onClose(); onOpenNews?.(newsId) }, type: "button" as const }
                  : {})}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-outline-variant/50 py-3.5 text-right last:border-0",
                  n.unread && "rounded-[14px] bg-primary-fixed/40/40",
                  newsId !== null && "transition-colors hover:bg-surface-container/60",
                )}
              >
                <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low">
                  {icon(n.kind)}
                  {n.unread && <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[var(--surface-ctnr-lowest)]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13px] text-on-surface", n.unread ? "font-black" : "font-bold")}>{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-5 text-on-surface-variant">{n.body}</p>
                  {newsId !== null && <p className="mt-1 text-[10px] font-bold text-primary">مشاهده خبر ←</p>}
                </div>
                <span className="shrink-0 text-[9.5px] text-on-surface-variant">{relTime(n.at)}</span>
              </Row>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- شیت چالش‌ها ----------
export function ChallengesSheet({
  open,
  onClose,
  onQuickSubmitForChallenge,
}: {
  open: boolean
  onClose: () => void
  onQuickSubmitForChallenge?: (challengeId: number) => void
}) {
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
      <DialogContent className="max-h-[84dvh] overflow-y-auto nice-scroll rounded-[24px] border-outline-variant/50 bg-surface-container-lowest p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-on-surface">
            <Megaphone className="h-5 w-5 text-primary" />
            چالش‌های خبری
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            در چالش‌ها شرکت کن، خبر بفرست و قهرمان شو (سناریوی ۴ ربات).
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          {state.challenges.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-primary/30 bg-primary-fixed/20 py-10 text-center">
              <Trophy className="h-8 w-8 text-warn" />
              <p className="text-[13.5px] font-bold text-on-surface">فعلاً چالشی ثبت نشده است</p>
              <p className="max-w-[260px] text-[11.5px] leading-5 text-on-surface-variant">
                چالش‌ها را ادمین کل از پنل مدیریت ایجاد می‌کند — موضوع و جایزه مشخص می‌شود و برنده‌ها امتیاز ویژه می‌گیرند.
              </p>
            </div>
          )}
          {state.challenges.map((c) => {
            const active = c.status === "active"
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-[18px] border p-4",
                  active ? "border-primary/30 bg-surface-container-lowest" : "border-outline-variant/50 bg-surface-container-low/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-black text-on-surface">{c.title}</p>
                    <p className="mt-1 text-[11.5px] leading-5 text-on-surface-variant">{c.description}</p>
                  </div>
                  {active ? (
                    <span className="rounded-full bg-primary-fixed/40 px-2.5 py-1 text-[10.5px] font-bold text-on-primary-fixed rounded-full bg-warn/15 px-2.5 py-1 text-[10.5px] font-bold text-warn shrink-0">
                      <CalendarClock className="h-3 w-3" />
                      {untilFmt(c.deadlineAt)}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">
                      <CalendarClock className="ml-1 inline h-3 w-3" />
                      {jalali(c.endAt)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-bold text-warn">{c.reward}</p>

                {/* نتایج چالش پایان‌یافته */}
                {c.status === "finished" && (
                  <div className="mt-2.5 rounded-[14px] border border-warn/25 bg-warn/15 p-3">
                    <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">🏁 نتایج نهایی</p>
                    {c.winners.length > 0 ? (
                      <div className="mt-1.5 space-y-1">
                        {c.winners.map((w, i) => (
                          <p key={w.fullName + i} className="text-[11.5px] font-bold text-on-surface">
                            {["🥇", "🥈", "🥉"][i]} {w.fullName} — {fa(w.count)} خبر {w.prize > 0 && <span className="text-primary">+{fa(w.prize)} امتیاز</span>}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-on-surface-variant">بدون شرکت‌کننده فعال</p>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/50 pt-3">
                  <span className="text-[10.5px] text-on-surface-variant">
                    {c.joined ? (
                      <>
                        رتبه تو: <b className="text-primary">{fa(c.myRank ?? 0)}</b> · {fa(c.myCount)} خبر · {fa(c.totalParticipants)} شرکت‌کننده
                      </>
                    ) : (
                      <>{fa(c.totalParticipants)} شرکت‌کننده</>
                    )}
                  </span>
                  {active ? (
                    c.joined ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary-fixed/40 px-3 py-1.5 text-[11.5px] font-bold text-primary dark:text-[#fca5a5]">
                        <CheckCircle2 className="h-4 w-4" />
                        شرکت کرده‌ای
                      </span>
                    ) : (
                      <button
                        onClick={() => join(c.id)}
                        disabled={busy !== null}
                        className="v3-btn px-4 py-2 text-[12px] disabled:opacity-50"
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
