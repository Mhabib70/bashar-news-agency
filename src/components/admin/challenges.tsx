"use client"

import { useMemo, useState } from "react"
import { Flag, Trophy, CalendarClock, Users2, Loader2 } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, jalali, relTime, untilFmt } from "@/lib/format"
import { JALALI_MONTHS, jalaliToday, toGregorian, jalaliMonthLength } from "@/lib/jalali"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// مدیریت چالش‌ها: ایجاد با مهلت جلالی، پایش شرکت‌کنندگان، اعلام نتایج
export function AdminChallengesSection() {
  const { state, createChallenge, finishChallenge } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [reward, setReward] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmFin, setConfirmFin] = useState<number | null>(null)

  // مهلت جلالی: پیش‌فرض ۷ روز بعد
  const today = useMemo(() => jalaliToday(), [])
  const plus7 = useMemo(() => {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(d)
      .split("-")
      .map(Number)
  }, [])
  const [jy, setJy] = useState(today.jy)
  const [jm, setJm] = useState(plus7[1])
  const [jd, setJd] = useState(plus7[2])

  const challenges = state?.challenges ?? []
  const active = challenges.filter((c) => c.status === "active")
  const finished = challenges.filter((c) => c.status === "finished").slice(0, 5)

  const days = Array.from({ length: jalaliMonthLength(jy, jm) }, (_, i) => i + 1)
  const years = [today.jy, today.jy + 1, today.jy + 2]

  const deadlineISO = useMemo(() => {
    const g = toGregorian(jy, jm, jd)
    // ۲۳:۵۹ به وقت تهران = 20:29 UTC همان روز
    return new Date(`${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}T20:29:00Z`).toISOString()
  }, [jy, jm, jd])

  const canCreate = title.trim().length >= 3 && desc.trim().length >= 10

  const create = async () => {
    setBusy(true)
    const r = await createChallenge({ title: title.trim(), description: desc.trim(), reward: reward.trim(), deadlineAt: deadlineISO })
    setBusy(false)
    if (r.ok) {
      toast({ title: "چالش ایجاد شد", description: r.message })
      setTitle("")
      setDesc("")
      setReward("")
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const finish = async (id: number) => {
    setBusy(true)
    const r = await finishChallenge(id)
    setBusy(false)
    setConfirmFin(null)
    if (r.ok) toast({ title: "نتایج اعلام شد", description: r.message })
    else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  return (
    <div className="space-y-5">
      {/* ایجاد چالش */}
      <div className="rounded-[24px] border border-neon/30 bg-neon/5 p-4">
        <p className="mb-3 flex items-center gap-2 text-[14px] font-black text-ink">
          <Flag className="h-4.5 w-4.5 text-neon" />
          ایجاد چالش جدید
        </p>
        <div className="space-y-2.5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان چالش (مثلاً پوشش مراسم ۱۳ آبان)" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="توضیحات چالش (حداقل ۱۰ کاراکتر)..." className="rounded-2xl border-line bg-surface text-ink leading-6 placeholder:text-ink-muted/50" />
          <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="جایزه (مثلاً ۳۰ امتیاز + تقدیر ویژه)" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">مهلت چالش (تقویم جلالی) — تا ساعت ۲۳:۵۹</label>
            <div className="grid grid-cols-3 gap-2">
              <select value={jd} onChange={(e) => setJd(Number(e.target.value))} className="rounded-xl border border-line bg-surface px-2 py-2.5 text-[12px] font-bold text-ink" dir="ltr">
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select value={jm} onChange={(e) => { const m = Number(e.target.value); setJm(m); if (jd > jalaliMonthLength(jy, m)) setJd(jalaliMonthLength(jy, m)) }} className="rounded-xl border border-line bg-surface px-2 py-2.5 text-[12px] font-bold text-ink">
                {JALALI_MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select value={jy} onChange={(e) => setJy(Number(e.target.value))} className="rounded-xl border border-line bg-surface px-2 py-2.5 text-[12px] font-bold text-ink" dir="ltr">
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[10px] text-ink-muted/70">مهلت انتخابی: {fa(jd)} {JALALI_MONTHS[jm - 1]} {fa(jy)} ({jalali(deadlineISO, true)})</p>
          </div>
          <button
            onClick={create}
            disabled={!canCreate || busy}
            className="w-full rounded-full bg-neon py-3 text-[13.5px] font-bold text-neon-foreground transition-transform hover:scale-[1.01] disabled:opacity-40"
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "ایجاد و اعلام به همه اعضا"}
          </button>
        </div>
      </div>

      {/* چالش‌های فعال */}
      {active.length > 0 && (
        <div>
          <p className="mb-3 text-[14px] font-black text-ink">چالش‌های فعال ({fa(active.length)})</p>
          <div className="space-y-3">
            {active.map((c) => (
              <div key={c.id} className="rounded-[24px] border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-ink">{c.title}</p>
                    <p className="mt-1 text-[11.5px] leading-5 text-ink-muted">{c.description}</p>
                    <p className="mt-1.5 text-[11px] font-bold text-warn">{c.reward}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-warn/12 px-2.5 py-1 text-[10px] font-bold text-warn">
                    <CalendarClock className="h-3 w-3" />
                    {untilFmt(c.deadlineAt)}
                  </span>
                </div>

                {/* شرکت‌کنندگان زنده */}
                <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black text-ink-muted">
                    <Users2 className="h-3.5 w-3.5" />
                    جدول شرکت‌کنندگان ({fa(c.totalParticipants)} نفر)
                  </p>
                  {c.roster.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-ink-muted">هنوز کسی نمرده — شرکت‌کنندگان پس از عضویت اینجا دیده می‌شوند.</p>
                  ) : (
                    <div className="space-y-1">
                      {c.roster.map((p, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl px-2.5 py-1.5 odd:bg-surface">
                          <span className="flex items-center gap-2 text-[11.5px] font-bold text-ink">
                            <span className="w-5 text-center text-[10px] text-ink-muted">{fa(i + 1)}</span>
                            {p.fullName}
                          </span>
                          <span className="text-[11px] font-black text-neon">{fa(p.count)} خبر</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setConfirmFin(c.id)}
                  disabled={busy !== null}
                  className="mt-3 w-full rounded-full border border-warn/40 bg-warn/8 py-3 text-[12.5px] font-bold text-warn transition-colors hover:bg-warn/15 disabled:opacity-50"
                >
                  🏁 اعلام نتایج و پایان چالش
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نتایج گذشته */}
      {finished.length > 0 && (
        <div>
          <p className="mb-3 text-[14px] font-black text-ink">نتایج چالش‌های گذشته</p>
          <div className="space-y-2">
            {finished.map((c) => (
              <div key={c.id} className="rounded-[24px] border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-ink">{c.title}</p>
                  <span className="shrink-0 text-[10px] text-ink-muted">{c.finishedAt ? jalali(c.finishedAt) : jalali(c.endAt)}</span>
                </div>
                {c.winners.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5">
                    {c.winners.map((w, i) => (
                      <div key={w.fullName + i} className="flex items-center justify-between rounded-xl bg-warn/8 px-3 py-2">
                        <span className="text-[12px] font-bold text-ink">{["🥇", "🥈", "🥉"][i]} {w.fullName}</span>
                        <span className="text-[11px] font-black text-warn">{fa(w.count)} خبر · +{fa(w.prize)} امتیاز</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-ink-muted">بدون شرکت‌کننده فعال</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && finished.length === 0 && (
        <p className="rounded-[24px] border border-dashed border-line py-12 text-center text-[12.5px] text-ink-muted">
          هنوز چالشی ساخته نشده — اولین چالش را از فرم بالا بساز.
        </p>
      )}

      {/* تایید اعلام نتایج */}
      <Dialog open={confirmFin !== null} onOpenChange={(v) => !v && setConfirmFin(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-ink">
              <Trophy className="h-5 w-5 text-warn" />
              اعلام نتایج چالش
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              چالش پایان می‌یابد؛ مقام‌های اول تا سوم ۳۰/۲۰/۱۰ امتیاز جایزه می‌گیرند، قهرمان نشان می‌گیرد و نتایج به همه اعلام می‌شود. این عمل برگشت‌پذیر نیست.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => confirmFin !== null && finish(confirmFin)}
            disabled={busy !== null}
            className="mt-3 w-full rounded-full bg-warn py-3.5 text-[14px] font-black text-white disabled:opacity-50"
          >
            {busy !== null ? "..." : "تایید و اعلام نتایج"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
