"use client"

import { useEffect, useState } from "react"
import {
  Bell, Megaphone, Trophy, Users2, Plus, CheckCircle2, XCircle, Flame, CalendarClock,
  TrendingDown, UserPlus, Send, Flag, Radio,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, faNum, relTime, untilFmt, jalali } from "@/lib/format"
import { USER_REJECT_PRESETS, ROLE_LABELS, DISTRICT_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { JalaliPicker } from "@/components/app/jalali-picker"

type NotifIcon = (kind: string) => React.ReactNode

// ---------- شیت اعلان‌ها ----------
export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp()
  if (!state) return null
  const icon: NotifIcon = (kind: string) =>
    kind === "approved" || kind === "rank_update" ? (
      kind === "rank_update" ? <Trophy className="h-4.5 w-4.5 text-neon" /> : <CheckCircle2 className="h-4.5 w-4.5 text-neon" />
    ) : kind === "rejected" ? (
      <XCircle className="h-4.5 w-4.5 text-[#ff8484]" />
    ) : kind === "broadcast" ? (
      <Radio className="h-4.5 w-4.5 text-warn" />
    ) : kind === "challenge_new" ? (
      <Megaphone className="h-4.5 w-4.5 text-neon" />
    ) : kind === "reminder" ? (
      <CalendarClock className="h-4.5 w-4.5 text-warn" />
    ) : kind === "pending_user" ? (
      <UserPlus className="h-4.5 w-4.5 text-warn" />
    ) : kind === "system" ? (
      <TrendingDown className="h-4.5 w-4.5 text-[#ff8484]" />
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
                <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-5 text-ink-muted">{n.body}</p>
              </div>
              <span className="shrink-0 text-[9.5px] text-ink-muted/70">{relTime(n.at)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- شیت چالش‌ها (با پنل ادمین: ایجاد + اعلام نتایج + سکوی قهرمانی) ----------
export function ChallengesSheet({
  open,
  onClose,
  onOpenCreate,
}: {
  open: boolean
  onClose: () => void
  onOpenCreate: () => void
}) {
  const { state, joinChallenge, finishChallenge } = useApp()
  const { toast } = useToast()
  const [busy, setBusy] = useState<number | null>(null)
  if (!state) return null
  const isAdmin = state.user.role === "admin"

  const join = async (id: number) => {
    setBusy(id)
    const r = await joinChallenge(id)
    setBusy(null)
    if (r.ok) toast({ title: "ثبت‌نام چالش", description: r.message })
    else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const finish = async (id: number) => {
    setBusy(id)
    const r = await finishChallenge(id)
    setBusy(null)
    if (r.ok) toast({ title: "اعلام نتایج", description: r.message })
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

        {isAdmin && (
          <button
            onClick={onOpenCreate}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-neon px-4 py-3 text-[13.5px] font-bold text-neon-foreground transition-transform hover:scale-[1.01]"
          >
            <Plus className="h-4.5 w-4.5" />
            ایجاد چالش جدید
          </button>
        )}

        <div className="mt-2 space-y-3">
          {state.challenges.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line py-8 text-center text-[12.5px] text-ink-muted">
              هنوز چالشی ساخته نشده است{isAdmin ? " — با دکمه بالا اولین چالش را بسازید." : "."}
            </p>
          )}
          {state.challenges.map((c) => {
            const active = c.status === "active"
            const medal = ["🥇", "🥈", "🥉"]
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

                {/* سکوی قهرمانی چالش تمام‌شده */}
                {!active && c.results.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-line bg-surface-2/60 p-3">
                    <p className="mb-2 text-[11px] font-bold text-ink-muted">نتایج نهایی</p>
                    <div className="space-y-1.5">
                      {c.results.map((r) => (
                        <div key={r.userId} className="flex items-center justify-between text-[12px]">
                          <span className="font-bold text-ink">
                            {medal[r.rank - 1]} {r.fullName}
                          </span>
                          <span className="font-bold text-neon">{fa(r.n)} خبر</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[10.5px] text-ink-muted">
                    {c.joined ? (
                      <>
                        رتبه تو: <b className="text-neon">{fa(c.myRank ?? 0)}</b> · {fa(c.myCount)} خبر · {fa(c.totalParticipants)} شرکت‌کننده
                      </>
                    ) : (
                      <>{fa(c.totalParticipants)} شرکت‌کننده{c.code ? ` · ${c.code}` : ""}</>
                    )}
                  </span>
                  {active ? (
                    isAdmin ? (
                      <button
                        onClick={() => finish(c.id)}
                        disabled={busy !== null}
                        className="flex items-center gap-1 rounded-full bg-warn/15 px-3.5 py-2 text-[11.5px] font-bold text-warn disabled:opacity-50"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {busy === c.id ? "..." : "اعلام نتایج"}
                      </button>
                    ) : c.joined ? (
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

// ---------- شیت ایجاد چالش (تقویم شمسی) ----------
export function CreateChallengeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createChallenge } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [reward, setReward] = useState("")
  const [deadlineAt, setDeadlineAt] = useState<Date | null>(null)
  const [endAt, setEndAt] = useState<Date | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setTitle("")
    setDescription("")
    setReward("")
    setDeadlineAt(null)
    setEndAt(null)
  }

  const submit = async () => {
    if (!deadlineAt || !endAt) return
    setBusy(true)
    const r = await createChallenge({
      title: title.trim(),
      description: description.trim(),
      reward: reward.trim(),
      deadlineAt: deadlineAt.toISOString(),
      endAt: endAt.toISOString(),
    })
    setBusy(false)
    if (r.ok) {
      toast({ title: "چالش ساخته شد", description: r.message })
      reset()
      onClose()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const canSubmit = title.trim().length >= 3 && deadlineAt && endAt && endAt > deadlineAt

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <Trophy className="h-5 w-5 text-neon" />
            ایجاد چالش جدید
          </DialogTitle>
          <DialogDescription className="text-ink-muted">چالش برای همه خبرنگاران اعلام می‌شود (سناریوی ۴ ربات).</DialogDescription>
        </DialogHeader>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">عنوان چالش</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: خبرنگار برتر هفته" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">توضیحات (اختیاری)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="شرایط و قوانین چالش..." className="rounded-2xl border-line bg-surface text-ink leading-6 placeholder:text-ink-muted/50" />
          </div>
          <JalaliPicker label="مهلت ارسال خبر" value={deadlineAt} onChange={setDeadlineAt} />
          <JalaliPicker label="زمان پایان و اعلام نتایج" value={endAt} onChange={setEndAt} />
          {endAt && deadlineAt && endAt <= deadlineAt && (
            <p className="text-[11px] font-bold text-[#ff8484]">زمان پایان باید بعد از مهلت ارسال باشد.</p>
          )}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">جایزه (اختیاری)</label>
            <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="مثلاً: ۱۰۰ امتیاز + نشان قهرمان چالش 🏆" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-40"
        >
          {busy ? "در حال ایجاد..." : "ایجاد و اعلام چالش"}
          <Send className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}

// ---------- شیت اطلاع‌رسانی همگانی ----------
export function BroadcastSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { broadcast, state } = useApp()
  const { toast } = useToast()
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  if (!state) return null

  const send = async () => {
    setBusy(true)
    const r = await broadcast(text.trim())
    setBusy(false)
    if (r.ok) {
      toast({ title: "ارسال شد", description: r.message })
      setText("")
      onClose()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <Radio className="h-5 w-5 text-neon" />
            اطلاع‌رسانی همگانی
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            پیام شما در مرکز اعلان همه کاربران فعال نمایش داده می‌شود (مطابق تنظیمات و ساعت سکوت هر نفر).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="متن اطلاع‌رسانی برای همه اعضای خبرگزاری..."
          className="mt-1 rounded-2xl border-line bg-surface text-ink leading-6 placeholder:text-ink-muted/50"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10.5px] text-ink-muted">{fa(text.trim().length)} کاراکتر</span>
          <span className="text-[10.5px] text-ink-muted">حداقل ۳ کاراکتر</span>
        </div>
        <button
          onClick={send}
          disabled={text.trim().length < 3 || busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-40"
        >
          {busy ? "در حال ارسال..." : "ارسال به همه"}
          <Send className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}

// ---------- شیت مدیریت کاربران (تایید/رد عضویت + لیست) ----------
type UserRow = {
  id: string
  fullName: string
  role: string
  status: string
  district: string
  base: string
  phone: string
  points: number
  levelTitle: string
  rejectReason: string
  createdAt: string
  newsCounts: { approved: number; rejected: number; pending: number }
}

export function UsersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userId, state, decideUser } = useApp()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [tab, setTab] = useState<"pending" | "all">("pending")
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const isAdmin = state?.user.role === "admin"

  const load = () => {
    if (!userId) return
    fetch(`/api/users?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]))
  }
  useEffect(() => {
    if (!open) return
    // بازنشانی و بارگذاری به‌صورت async تا setState داخل effect sync نباشد
    const t = setTimeout(() => {
      setUsers(null)
      setRejecting(null)
      setCustomReason("")
      load()
    }, 0)
    return () => clearTimeout(t)
  }, [open, userId])

  const decide = async (targetId: string, action: "approve" | "reject", reason?: string) => {
    setBusy(targetId)
    const r = await decideUser(targetId, action, reason)
    setBusy(null)
    if (r.ok) {
      toast({ title: action === "approve" ? "تایید شد" : "رد شد", description: r.message })
      setRejecting(null)
      setCustomReason("")
      load()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const pending = users?.filter((u) => u.status === "pending") ?? []
  const others = users?.filter((u) => u.status !== "pending") ?? []
  const list = tab === "pending" ? pending : others

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[86dvh] flex-col gap-0 overflow-hidden rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <Users2 className="h-5 w-5 text-neon" />
            مدیریت کاربران
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            {isAdmin ? "همه اعضای خبرگزاری" : `اعضای ${DISTRICT_LABELS[state?.user.district ?? ""] ?? ""}`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex gap-2">
          {(
            [
              { key: "pending", label: `در انتظار تایید${pending.length ? ` (${fa(pending.length)})` : ""}` },
              { key: "all", label: "همه کاربران" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-full px-3 py-2.5 text-[12px] font-bold transition-colors",
                tab === t.key ? "bg-neon text-neon-foreground" : "border border-line bg-surface text-ink-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto nice-scroll pl-1">
          {users === null && <p className="py-8 text-center text-[12.5px] text-ink-muted">در حال بارگذاری...</p>}
          {users !== null && list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line py-8 text-center text-[12.5px] text-ink-muted">
              {tab === "pending" ? "درخواست عضویت در انتظاری نیست." : "کاربری نیست."}
            </p>
          )}
          {list.map((u) => (
            <div key={u.id} className="rounded-2xl border border-line bg-surface p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink">{u.fullName}</p>
                  <p className="mt-0.5 text-[10.5px] text-ink-muted">
                    {ROLE_LABELS[u.role]} · {DISTRICT_LABELS[u.district] ?? u.district}
                    {u.base ? ` · ${u.base}` : ""} · {faNum(u.points)} امتیاز · {u.levelTitle}
                  </p>
                  {u.status === "pending" && (
                    <p className="mt-0.5 text-[10px] text-warn">درخواست {relTime(u.createdAt)}</p>
                  )}
                  {u.status === "rejected" && u.rejectReason && (
                    <p className="mt-0.5 text-[10px] text-[#ff8484]">رد شده: {u.rejectReason}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold",
                    u.status === "active" ? "bg-neon/12 text-neon" : u.status === "pending" ? "bg-warn/12 text-warn" : "bg-[#ff5c5c]/12 text-[#ff8484]",
                  )}
                >
                  {u.status === "active" ? "فعال" : u.status === "pending" ? "در انتظار" : "رد شده"}
                </span>
              </div>

              {u.status === "pending" && rejecting !== u.id && (
                <div className="mt-2.5 flex gap-2 border-t border-line pt-2.5">
                  <button
                    onClick={() => decide(u.id, "approve")}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neon py-2.5 text-[12px] font-bold text-neon-foreground disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {busy === u.id ? "..." : "تایید عضویت"}
                  </button>
                  <button
                    onClick={() => setRejecting(u.id)}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#ff5c5c]/40 py-2.5 text-[12px] font-bold text-[#ff8484] disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    رد درخواست
                  </button>
                </div>
              )}

              {u.status === "pending" && rejecting === u.id && (
                <div className="mt-2.5 space-y-2 border-t border-line pt-2.5">
                  <p className="text-[11.5px] font-bold text-ink-muted">دلیل رد را انتخاب کنید:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {USER_REJECT_PRESETS.filter((p) => p.key !== "other").map((p) => (
                      <button
                        key={p.key}
                        onClick={() => decide(u.id, "reject", p.key)}
                        disabled={busy !== null}
                        className="rounded-full border border-[#ff5c5c]/30 px-3 py-1.5 text-[11px] font-bold text-[#ff8484] transition-colors hover:bg-[#ff5c5c]/10 disabled:opacity-50"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="دلیل دلخواه..."
                      className="flex-1 rounded-full border-line bg-surface-2 text-[12px] text-ink placeholder:text-ink-muted/50"
                    />
                    <button
                      onClick={() => customReason.trim().length >= 2 && decide(u.id, "reject", customReason.trim())}
                      disabled={busy !== null || customReason.trim().length < 2}
                      className="rounded-full bg-[#ff5c5c] px-4 text-[12px] font-bold text-white disabled:opacity-40"
                    >
                      رد
                    </button>
                    <button onClick={() => setRejecting(null)} className="rounded-full border border-line px-3 text-[11px] font-bold text-ink-muted">
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              {u.status !== "pending" && (
                <p className="mt-2 border-t border-line pt-2 text-[10px] text-ink-muted">
                  {fa(u.newsCounts.approved)} تایید · {fa(u.newsCounts.rejected)} رد · {fa(u.newsCounts.pending)} در بررسی
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- پایان شیت‌ها ----------
