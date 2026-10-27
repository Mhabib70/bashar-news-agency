"use client"

import { useEffect, useMemo, useState } from "react"
import { Users2, Megaphone, Trophy, FileDown, Check, X, Send, Flag, ShieldCheck, Clock } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, jalali, relTime, untilFmt } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS, USER_REJECT_TITLES } from "@/lib/domain"
import { JALALI_MONTHS, jalaliToday, toGregorian, jalaliMonthLength } from "@/lib/jalali"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type TabKey = "users" | "broadcast" | "challenges" | "export"
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "users", label: "کاربران", icon: <Users2 className="h-4 w-4" /> },
  { key: "broadcast", label: "پیام همگانی", icon: <Megaphone className="h-4 w-4" /> },
  { key: "challenges", label: "چالش‌ها", icon: <Trophy className="h-4 w-4" /> },
  { key: "export", label: "خروجی CSV", icon: <FileDown className="h-4 w-4" /> },
]

type UserInfo = {
  id: string; fullName: string; role: string; status: string; rejectReason: string
  district: string; base: string; phone: string; points: number; levelKey: string; createdAt: string
}

export function AdminSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp()
  const [tab, setTab] = useState<TabKey>("users")
  if (!state) return null
  if (state.user.role !== "admin") return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <ShieldCheck className="h-5 w-5 text-neon" />
            پنل مدیریت
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            {state.pendingUsersCount > 0 ? `${fa(state.pendingUsersCount)} درخواست عضویت در انتظار تایید` : "ابزارهای مدیریت خبرگزاری"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 flex rounded-full border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11.5px] font-bold transition-all",
                tab === t.key ? "bg-neon text-neon-foreground" : "text-ink-muted hover:text-ink",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto nice-scroll pl-0.5">
          {tab === "users" && <UsersTab />}
          {tab === "broadcast" && <BroadcastTab />}
          {tab === "challenges" && <ChallengesTab />}
          {tab === "export" && <ExportTab />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- تب کاربران ----------
function UsersTab() {
  const { fetchUsers, moderateUser } = useApp()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<UserInfo | null>(null)
  const [reason, setReason] = useState("incomplete")
  const [q, setQ] = useState("")

  const load = async () => setUsers(await fetchUsers())
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const us = await fetchUsers()
      if (!cancelled) setUsers(us)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const act = async (u: UserInfo, action: "approve" | "reject", r?: string) => {
    setBusy(u.id)
    const res = await moderateUser(u.id, action, r)
    setBusy(null)
    setRejecting(null)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      load()
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  const filtered = (users ?? []).filter((u) => !q || u.fullName.includes(q) || u.phone.includes(q))
  const pending = filtered.filter((u) => u.status === "pending")
  const rest = filtered.filter((u) => u.status !== "pending")

  return (
    <div className="space-y-3 pb-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام یا شماره..." className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />

      {users === null && <p className="py-6 text-center text-[12px] text-ink-muted">در حال بارگذاری...</p>}

      {pending.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-black text-warn">
            <Clock className="h-3.5 w-3.5" />
            در انتظار تایید ({fa(pending.length)})
          </p>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="rounded-2xl border border-warn/30 bg-warn/5 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-ink">{u.fullName}</p>
                    <p className="mt-0.5 text-[10.5px] leading-5 text-ink-muted">
                      {u.phone} · {DISTRICT_LABELS[u.district] ?? u.district} · {u.base}
                    </p>
                    <p className="text-[10px] text-ink-muted/70">درخواست: {relTime(u.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => act(u, "approve")}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neon py-2.5 text-[12px] font-bold text-neon-foreground disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {busy === u.id ? "..." : "تایید عضویت"}
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(u)
                      setReason("incomplete")
                    }}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#ff5c5c]/40 py-2.5 text-[12px] font-bold text-[#ff8484] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    رد با دلیل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[12px] font-black text-ink-muted">اعضا ({fa(rest.length)})</p>
        <div className="space-y-1.5">
          {rest.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink">
                  {u.fullName}
                  {u.status === "rejected" && <span className="mr-2 rounded-full bg-[#ff5c5c]/15 px-2 py-0.5 text-[9px] font-bold text-[#ff8484]">رد شده</span>}
                </p>
                <p className="text-[10.5px] text-ink-muted">
                  {ROLE_LABELS[u.role]} · {DISTRICT_LABELS[u.district] ?? u.district} · {fa(u.points)} امتیاز
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[9.5px] font-bold text-ink-muted">
                {u.status === "active" ? "فعال" : USER_REJECT_TITLES[u.rejectReason] ?? "—"}
              </span>
            </div>
          ))}
          {rest.length === 0 && pending.length === 0 && <p className="py-6 text-center text-[12px] text-ink-muted">عضوی یافت نشد.</p>}
        </div>
      </div>

      {/* رد با دلیل */}
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">رد درخواست عضویت</DialogTitle>
            <DialogDescription className="text-ink-muted">
              دلیل رد برای متقاضی اعلان می‌شود؛ می‌تواند مجدداً ثبت‌نام کند.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
            {Object.entries(USER_REJECT_TITLES).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setReason(k)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-right text-[13px] font-bold transition-colors",
                  reason === k ? "border-[#ff5c5c]/50 bg-[#ff5c5c]/8 text-ink" : "border-line bg-surface text-ink-muted",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", reason === k ? "border-[#ff5c5c] bg-[#ff5c5c] text-white" : "border-line")}>
                  {reason === k && <Check className="h-3 w-3" />}
                </span>
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => rejecting && act(rejecting, "reject", reason)}
            disabled={busy !== null}
            className="mt-4 w-full rounded-full bg-[#ff5c5c] py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            ثبت رد درخواست
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- تب پیام همگانی ----------
function BroadcastTab() {
  const { broadcast } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const canSend = title.trim().length >= 3 && text.trim().length >= 5

  const send = async () => {
    setBusy(true)
    const r = await broadcast(title.trim(), text.trim())
    setBusy(false)
    if (r.ok) {
      toast({ title: "ارسال شد", description: r.message })
      setTitle("")
      setText("")
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-3 pb-2">
      <div className="rounded-2xl border border-line bg-surface p-3.5">
        <p className="text-[11.5px] leading-5 text-ink-muted">
          پیام در مرکز اعلان همه اعضای فعال ثبت می‌شود. اعضایی که «اطلاع‌رسانی گروهی» را خاموش کرده‌اند دریافت نمی‌کنند و
          اعلان‌های ساعت سکوت به پایان سکوت موکول می‌شوند (مطابق سناریوی ۵ ربات).
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">عنوان پیام</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: جلسه هم‌اندیشی هفتگی" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">متن پیام</label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="متن کامل پیام همگانی..." className="rounded-2xl border-line bg-surface text-ink leading-6 placeholder:text-ink-muted/50" />
      </div>
      <button
        onClick={send}
        disabled={!canSend || busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
        {busy ? "در حال ارسال..." : "ارسال به همه اعضا"}
      </button>
    </div>
  )
}

// ---------- تب چالش‌ها ----------
function ChallengesTab() {
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

  const active = (state?.challenges ?? []).filter((c) => c.status === "active")
  const finished = (state?.challenges ?? []).filter((c) => c.status === "finished").slice(0, 3)

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
    <div className="space-y-4 pb-2">
      {/* ایجاد چالش */}
      <div className="rounded-[24px] border border-line bg-surface p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[13px] font-black text-ink">
          <Flag className="h-4 w-4 text-neon" />
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
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select value={jm} onChange={(e) => { const m = Number(e.target.value); setJm(m); if (jd > jalaliMonthLength(jy, m)) setJd(jalaliMonthLength(jy, m)) }} className="rounded-xl border border-line bg-surface px-2 py-2.5 text-[12px] font-bold text-ink">
                {JALALI_MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select value={jy} onChange={(e) => setJy(Number(e.target.value))} className="rounded-xl border border-line bg-surface px-2 py-2.5 text-[12px] font-bold text-ink" dir="ltr">
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[10px] text-ink-muted/70">مهلت انتخابی: {fa(jd)} {JALALI_MONTHS[jm - 1]} {fa(jy)} ({jalali(deadlineISO, true)})</p>
          </div>
          <button
            onClick={create}
            disabled={!canCreate || busy}
            className="w-full rounded-full bg-neon py-3 text-[13.5px] font-bold text-neon-foreground disabled:opacity-40"
          >
            {busy ? "..." : "ایجاد و اعلام به همه"}
          </button>
        </div>
      </div>

      {/* چالش‌های فعال */}
      {active.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-black text-ink-muted">چالش‌های فعال</p>
          <div className="space-y-2">
            {active.map((c) => (
              <div key={c.id} className="rounded-2xl border border-neon/30 bg-neon/5 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-bold text-ink">{c.title}</p>
                  <span className="shrink-0 rounded-full bg-neon/12 px-2.5 py-1 text-[9.5px] font-bold text-neon">{untilFmt(c.deadlineAt)}</span>
                </div>
                <p className="mt-1 text-[10.5px] text-ink-muted">{fa(c.totalParticipants)} شرکت‌کننده · {c.code}</p>
                <button
                  onClick={() => setConfirmFin(c.id)}
                  disabled={busy !== null}
                  className="mt-2.5 w-full rounded-full border border-warn/40 bg-warn/8 py-2.5 text-[12px] font-bold text-warn disabled:opacity-50"
                >
                  🏁 اعلام نتایج و پایان چالش
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-black text-ink-muted">آخرین نتایج</p>
          <div className="space-y-1.5">
            {finished.map((c) => (
              <div key={c.id} className="rounded-2xl border border-line bg-surface px-3.5 py-3">
                <p className="text-[12.5px] font-bold text-ink">{c.title}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-muted">
                  {c.winners.length > 0 ? c.winners.map((w, i) => `${["🥇", "🥈", "🥉"][i]} ${w.fullName} (${fa(w.count)})`).join(" · ") : "بدون شرکت‌کننده فعال"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && finished.length === 0 && (
        <p className="py-4 text-center text-[12px] text-ink-muted">هنوز چالشی ساخته نشده — اولین چالش را بالای صفحه بساز.</p>
      )}

      {/* تایید اعلام نتایج */}
      <Dialog open={confirmFin !== null} onOpenChange={(v) => !v && setConfirmFin(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">اعلام نتایج چالش</DialogTitle>
            <DialogDescription className="text-ink-muted">
              چالش پایان می‌یابد؛ مقام‌های اول تا سوم ۳۰/۲۰/۱۰ امتیاز جایزه می‌گیرند، قهرمان نشان می‌گیرد و نتایج به همه اعلام می‌شود. این عمل برگشت‌پذیر نیست.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => confirmFin !== null && finish(confirmFin)}
            disabled={busy !== null}
            className="mt-3 w-full rounded-full bg-warn py-3.5 text-[14px] font-black text-black disabled:opacity-50"
          >
            {busy ? "..." : "تایید و اعلام نتایج"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- تب خروجی‌ها ----------
function ExportTab() {
  const { userId } = useApp()
  const items = [
    { type: "users", label: "کاربران و نقش‌ها", desc: "همه اعضا با امتیاز، سطح و وضعیت" },
    { type: "news", label: "کل اخبار", desc: "با کد پیگیری، وضعیت و مرحله بررسی" },
    { type: "districts", label: "گزارش حوزه‌ها", desc: "آمار اخبار و اعضای هر ۱۲ حوزه" },
    { type: "presscard", label: "کارت خبرنگاری ادمین", desc: "شناسنامه فعالیت حساب شما" },
  ]
  return (
    <div className="space-y-2 pb-2">
      <p className="rounded-2xl border border-line bg-surface p-3.5 text-[11.5px] leading-5 text-ink-muted">
        فایل‌ها با کدگذاری UTF-8 (سازگار با اکسل فارسی) دانلود می‌شوند.
      </p>
      {items.map((it) => (
        <a
          key={it.type}
          href={`/api/export?type=${it.type}&userId=${encodeURIComponent(userId ?? "")}`}
          className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-neon/40 hover:bg-surface-2"
        >
          <span>
            <span className="block text-[13.5px] font-bold text-ink">{it.label}</span>
            <span className="block text-[10.5px] text-ink-muted">{it.desc}</span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">
            <FileDown className="h-4.5 w-4.5" />
          </span>
        </a>
      ))}
    </div>
  )
}
