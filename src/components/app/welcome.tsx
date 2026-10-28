"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Menu, Bell, ArrowLeft, X, Check, ChevronLeft } from "lucide-react"
import { useApp } from "@/lib/store"
import { Ring, CountUp } from "@/components/app/bits"
import { fa, toFa } from "@/lib/format"
import { DISTRICT_LABELS, BASE_LISTS, EDUCATION_LEVEL_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type DemoUser = { id: string; fullName: string; role: string; district: string; base: string; levelKey: string; points: number }

type Overview = {
  progressPct: number
  pointsToday: number
  newsThisWeek: number
  newsToday: number
  activeToday: number
  totalReporters: number
  top: { fullName: string; points: number } | null
}

const faToEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))

const ROLE_LABELS: Record<string, string> = {
  reporter: "خبرنگار",
  district_manager: "مدیر حوزه",
  specialist: "کارشناس خبر",
  admin: "ادمین کل",
}

export function Welcome() {
  const { login, register } = useApp()
  const { toast } = useToast()
  const [users, setUsers] = useState<DemoUser[] | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [open, setOpen] = useState(false)
  const [regOpen, setRegOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]))
    fetch("/api/overview")
      .then((r) => r.json())
      .then((d: Overview) => setOverview(d))
      .catch(() => setOverview(null))
  }, [])

  const doLogin = async (id: string, name: string) => {
    setBusy(id)
    await login(id)
    toast({ title: `خوش آمدی ${name}!`, description: "ورود با موفقیت انجام شد." })
    setBusy(null)
    setOpen(false)
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* هیرو — لوگوی خبرگزاری بشر */}
      <div className="relative h-[54%] w-full shrink-0 bg-black">
        <Image src="/img/agency-logo.png" alt="خبرگزاری بشر" fill priority sizes="430px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65" aria-label="منو">
            <Menu className="h-5 w-5" />
          </button>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65" aria-label="اعلان‌ها">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-neon" />
          </button>
        </div>
      </div>

      {/* شعار و دکمه */}
      <div className="relative -mt-14 z-10 flex flex-1 flex-col px-6">
        <h1 className="text-[34px] font-black leading-[1.25] text-white">
          روایت‌گرِ
          <br />
          <span className="text-neon">حقیقت</span>
          <br />
          صدای بشر
        </h1>
        <p className="mt-3 text-[13.5px] leading-6 text-ink-muted">
          از قلبِ رویداد تا صفحهٔ خبر؛
          <br />
          روایتی معتبر با تعهّد به حقیقت و اعتماد.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-5 flex w-[62%] items-center justify-between rounded-full bg-neon px-6 py-4 text-[15px] font-bold text-neon-foreground shadow-[0_14px_38px_-10px_rgba(201,247,58,0.5)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          شروع کن
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* کارت پیشرفت امروز — داده واقعی از /api/overview */}
        <div className="mt-auto mb-6 rounded-[28px] bg-surface/90 p-5 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[15px] font-bold text-ink">پیشرفت امروز</p>
            {overview?.top && (
              <p className="text-[10.5px] text-ink-muted">
                صدرنشین: <span className="font-bold text-neon">{overview.top.fullName}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-4">
            <Ring value={overview?.progressPct ?? 0} max={100} size={150} stroke={11}>
              <span className="text-[30px] font-black leading-none text-white">
                <CountUp to={overview?.progressPct ?? 0} fmt={fa} />
                <span className="text-[15px] font-bold">٪</span>
              </span>
              <span className="mt-1 text-[11px] text-ink-muted">خبرنگاران فعال</span>
            </Ring>
            <div className="grid w-full grid-cols-3 gap-2">
              {[
                { v: overview?.pointsToday ?? 0, l: "امتیاز", s: "امروز" },
                { v: overview?.newsThisWeek ?? 0, l: "خبر", s: "این هفته" },
                { v: overview ? `${fa(overview.activeToday)}/${fa(overview.totalReporters)}` : "—", l: "فعال", s: "خبرنگار" },
              ].map((x) => (
                <div key={x.l} className="flex flex-col items-center gap-0.5 border-l last:border-l-0 border-line px-1">
                  <span className="text-[17px] font-black text-neon">
                    {typeof x.v === "number" ? <CountUp to={x.v} fmt={fa} /> : x.v}
                  </span>
                  <span className="text-[11px] font-semibold text-ink">{x.l}</span>
                  <span className="text-[9.5px] text-ink-muted">{x.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ورود */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-3 top-auto translate-y-0 gap-0 rounded-[28px] border-line bg-popover p-5 data-[state=open]:slide-in-from-bottom-10 max-h-[82dvh] overflow-y-auto nice-scroll">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">ورود به حساب</DialogTitle>
            <DialogDescription className="text-ink-muted">
              اگر حساب داری وارد شو، یا با ثبت‌نام جدید سازمانت را راه بنداز.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {users === null &&
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl bg-surface-2" />)}
            {users?.length === 0 && (
              <p className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-[12.5px] leading-5 text-ink-muted">
                هنوز حسابی ساخته نشده است. با «ثبت‌نام خبرنگار جدید» شروع کن —
                <span className="font-bold text-neon"> اولین ثبت‌نام، ادمین کل سازمان می‌شود.</span>
              </p>
            )}
            {users?.map((u) => (
              <button
                key={u.id}
                onClick={() => doLogin(u.id, u.fullName)}
                disabled={busy !== null}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-right transition-colors hover:border-neon/40 hover:bg-surface-2 disabled:opacity-50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neon/12 text-sm font-bold text-neon">
                    {u.fullName.slice(0, 1)}
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold text-ink">{u.fullName}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {ROLE_LABELS[u.role]}
                      {u.district ? ` · ${DISTRICT_LABELS[u.district] ?? ""}` : ""}
                    </span>
                  </span>
                </span>
                {busy === u.id ? <Check className="h-4 w-4 text-neon" /> : <ChevronLeft className="h-4 w-4 text-ink-muted" />}
              </button>
            ))}
            <button
              onClick={() => {
                setOpen(false)
                setRegOpen(true)
              }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-neon px-4 py-3.5 text-[14px] font-bold text-neon-foreground transition-transform hover:scale-[1.01]"
            >
              <X className="hidden" />
              ثبت‌نام خبرنگار جدید
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <RegisterDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        onDone={(id, msg) => {
          doLogin(id, "خبرنگار تازه‌وارد")
          toast({ title: msg })
        }}
      />
    </div>
  )
}

// ---------- ثبت‌نام (سناریوی ۱) ----------
function RegisterDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: (userId: string, message: string) => void
}) {
  const { register } = useApp()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ fullName: "", phone: "", age: "", education: "bachelor", district: "b1", base: "" })
  const steps = ["نام و شماره", "سن و تحصیلات", "حوزه و پایگاه"]
  const canNext =
    (step === 0 && f.fullName.trim().length >= 3 && f.phone.trim().length >= 8) ||
    (step === 1 && Number(faToEn(f.age)) >= 15 && Number(faToEn(f.age)) <= 80) ||
    (step === 2 && !!f.base)

  const submit = async () => {
    const r = await register(f)
    if (r.ok && r.userId) {
      onOpenChange(false)
      onDone(r.userId, r.message ?? "ثبت‌نام شد")
      setStep(0)
      setF({ fullName: "", phone: "", age: "", education: "bachelor", district: "b1", base: "" })
    } else {
      toast({ title: "خطا", description: r.message ?? "ثبت‌نام ناموفق بود", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] border-line bg-popover p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="text-ink">ثبت‌نام خبرنگار</DialogTitle>
          <DialogDescription className="text-ink-muted">
            مرحله {toFa(step + 1)} از {toFa(3)} — {steps[step]}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-neon" : "bg-surface-2")} />
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {step === 0 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">نام و نام خانوادگی</label>
                <Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="مثلاً: امون رضایی" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">شماره تماس</label>
                <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="۰۹۱۲..." dir="ltr" className="rounded-2xl border-line bg-surface text-right text-ink placeholder:text-ink-muted/50" />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">سن</label>
                <Input value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) })} placeholder="۲۵" inputMode="numeric" className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">تحصیلات</label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVEL_LABELS.map((ed) => (
                    <button
                      key={ed.key}
                      onClick={() => setF({ ...f, education: ed.key })}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors",
                        f.education === ed.key ? "border-neon bg-neon text-neon-foreground" : "border-line bg-surface text-ink-muted",
                      )}
                    >
                      {ed.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">حوزه فعالیت</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DISTRICT_LABELS).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setF({ ...f, district: k, base: "" })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-colors",
                        f.district === k ? "border-neon bg-neon/10 text-neon" : "border-line bg-surface text-ink-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">پایگاه</label>
                <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto nice-scroll pl-1">
                  {(BASE_LISTS[f.district] ?? []).map((b) => (
                    <button
                      key={b}
                      onClick={() => setF({ ...f, base: b })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[11.5px] font-semibold leading-4 transition-colors",
                        f.base === b ? "border-neon bg-neon/10 text-neon" : "border-line bg-surface text-ink-muted",
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="rounded-full border border-line px-5 py-3 text-[13px] font-bold text-ink-muted">
              قبلی
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="flex-1 rounded-full bg-neon py-3 text-[14px] font-bold text-neon-foreground disabled:opacity-40"
            >
              مرحله بعد
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canNext}
              className="flex-1 rounded-full bg-neon py-3 text-[14px] font-bold text-neon-foreground disabled:opacity-40"
            >
              تکمیل ثبت‌نام
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

