"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Menu, Bell, ArrowLeft, X, Check, LogIn } from "lucide-react"
import { useApp } from "@/lib/store"
import { toFa } from "@/lib/format"
import { DISTRICT_LABELS, BASE_LISTS, EDUCATION_LEVEL_LABELS, applyOrgUnits } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const faToEn = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))

export function Welcome() {
  const { login, register } = useApp()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [regOpen, setRegOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState("")
  const [err, setErr] = useState("")
  // حوزه‌ها/پایگاه‌های زنده سازمان — برای فرم ثبت‌نام (قبل از ورود)
  useEffect(() => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then((d) => {
        if (d.units?.length) applyOrgUnits(d.units)
      })
      .catch(() => {})
  }, [])

  // ورود امن: فقط با شماره موبایل حساب خودتان وارد می‌شوید
  const doPhoneLogin = async () => {
    const p = faToEn(phone).replace(/\D/g, "")
    if (p.length < 10) {
      setErr("شماره موبایل خود را کامل وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹)")
      return
    }
    setBusy(true)
    setErr("")
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.ok && d.userId) {
        await login(d.userId)
        toast({ title: `خوش آمدی ${d.fullName}!`, description: "ورود با موفقیت انجام شد." })
        setOpen(false)
        setPhone("")
      } else {
        setErr(d.error ?? "ورود ناموفق بود — دوباره تلاش کنید")
      }
    } catch {
      setErr("خطای شبکه — اینترنت خود را بررسی کنید")
    }
    setBusy(false)
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--v3-navy)]">
      {/* هیرو — لوگوی خبرگزاری بسیج شهر رشت روی سرمه‌ای */}
      <div className="relative h-[52%] w-full shrink-0">
        <Image src="/img/agency-logo.png" alt="خبرگزاری بسیج شهر رشت" fill priority sizes="430px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--v3-navy-deep)]/45 via-transparent to-[var(--v3-navy)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20" aria-label="منو">
            <Menu className="h-5 w-5" />
          </button>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20" aria-label="اعلان‌ها">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--v3-amber-2)]" />
          </button>
        </div>
      </div>

      {/* پنل روشنِ لغزان روی هیرو — شعار و دکمه */}
      <div className="relative -mt-16 z-10 flex flex-1 flex-col rounded-t-[34px] bg-[var(--v3-page)] px-6 pt-7 shadow-[0_-18px_44px_-24px_rgba(9,14,35,0.5)]">
        <span className="v3-chip mb-3 w-fit">خبرگزاری بسیج شهر رشت</span>
        <h1 className="text-[33px] font-black leading-[1.25] text-[var(--v3-ink)]">
          روایت‌گرِ
          <br />
          <span className="bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] bg-clip-text text-transparent">حقیقت</span>
          <br />
          صدای بسیج
        </h1>
        <p className="mt-3 text-[13.5px] leading-6 text-[var(--v3-ink-2)]">
          از قلبِ رویداد تا صفحهٔ خبر؛
          <br />
          روایتی معتبر با تعهّد به حقیقت و اعتماد.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="v3-btn mt-6 flex w-[68%] items-center justify-between px-6 py-4 text-[15px]"
        >
          شروع کن
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* ورود — با شماره موبایل؛ هیچ فهرست حسابی نمایش داده نمی‌شود */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-3 top-auto translate-y-0 gap-0 rounded-[28px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5 data-[state=open]:slide-in-from-bottom-10 max-h-[82dvh] overflow-y-auto nice-scroll">
          <DialogHeader className="text-right">
            <DialogTitle className="text-[var(--v3-ink)]">ورود به حساب</DialogTitle>
            <DialogDescription className="text-[var(--v3-ink-2)]">
              شماره موبایل حساب خودتان را وارد کنید. حساب ندارید؟ ثبت‌نام کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">شماره موبایل</label>
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(faToEn(e.target.value).replace(/[^\d]/g, "").slice(0, 11))
                  setErr("")
                }}
                onKeyDown={(e) => e.key === "Enter" && doPhoneLogin()}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                inputMode="tel"
                className="v3-input rounded-2xl text-right text-[15px] tracking-widest placeholder:text-[var(--v3-ink-2)]/50"
              />
            </div>
            {err && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{err}</p>
            )}
            <button
              onClick={doPhoneLogin}
              disabled={busy}
              className="v3-btn flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-50"
            >
              <LogIn className="h-4.5 w-4.5" />
              {busy ? "در حال ورود..." : "ورود"}
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setRegOpen(true)
              }}
              className="v3-btn-ghost flex w-full items-center justify-center gap-2 py-3.5 text-[14px]"
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
        initialPhone={faToEn(phone).replace(/\D/g, "")}
        onDone={(id, msg) => {
          login(id).then(() => {
            toast({ title: msg })
          })
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
  initialPhone = "",
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: (userId: string, message: string) => void
  initialPhone?: string
}) {
  const { register } = useApp()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ fullName: "", phone: "", age: "", education: "bachelor", district: "b1", base: "" })
  // شماره‌ای که کاربر در صفحه ورود وارد کرده، همین‌جا پیش‌پر می‌شود
  useEffect(() => {
    if (open && initialPhone) setF((prev) => ({ ...prev, phone: initialPhone }))
  }, [open, initialPhone])
  const steps = ["نام و شماره", "سن و تحصیلات", "حوزه و پایگاه"]
  const lastStep = steps.length - 1
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
      <DialogContent className="rounded-[28px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="text-[var(--v3-ink)]">ثبت‌نام خبرنگار</DialogTitle>
          <DialogDescription className="text-[var(--v3-ink-2)]">
            مرحله {toFa(step + 1)} از {toFa(steps.length)} — {steps[step]}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-[var(--v3-azure)]" : "bg-[var(--v3-card-2)]")} />
          ))}
        </div>
        {step === 0 && (
          <p className="rounded-2xl border border-[var(--v3-line)] bg-[var(--v3-card-2)] px-4 py-3 text-[11.5px] leading-5 text-[var(--v3-ink-2)]">
            ثبت‌نام شما به‌عنوان خبرنگار ثبت می‌شود و پس از تایید ادمین کل فعال خواهد شد.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {step === 0 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">نام و نام خانوادگی</label>
                <Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="مثلاً: امون رضایی" className="v3-input rounded-2xl placeholder:text-[var(--v3-ink-2)]/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">شماره تماس</label>
                <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="۰۹۱۲..." dir="ltr" className="v3-input rounded-2xl text-right placeholder:text-[var(--v3-ink-2)]/50" />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">سن</label>
                <Input value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) })} placeholder="۲۵" inputMode="numeric" className="v3-input rounded-2xl placeholder:text-[var(--v3-ink-2)]/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">تحصیلات</label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVEL_LABELS.map((ed) => (
                    <button
                      key={ed.key}
                      onClick={() => setF({ ...f, education: ed.key })}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors",
                        f.education === ed.key
                          ? "border-transparent bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.6)]"
                          : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)]",
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
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">حوزه فعالیت</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DISTRICT_LABELS).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setF({ ...f, district: k, base: "" })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-colors",
                        f.district === k
                          ? "border-[var(--v3-azure)] bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#93c5fd]"
                          : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)]",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">پایگاه</label>
                <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto nice-scroll pl-1">
                  {(BASE_LISTS[f.district] ?? []).map((b) => (
                    <button
                      key={b}
                      onClick={() => setF({ ...f, base: b })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[11.5px] font-semibold leading-4 transition-colors",
                        f.base === b
                          ? "border-[var(--v3-azure)] bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#93c5fd]"
                          : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)]",
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
            <button onClick={() => setStep(step - 1)} className="rounded-full border border-[var(--v3-line)] px-5 py-3 text-[13px] font-bold text-[var(--v3-ink-2)]">
              قبلی
            </button>
          )}
          {step < lastStep ? (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="v3-btn flex-1 py-3 text-[14px] disabled:opacity-40"
            >
              مرحله بعد
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canNext}
              className="v3-btn flex-1 py-3 text-[14px] disabled:opacity-40"
            >
              تکمیل ثبت‌نام
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
