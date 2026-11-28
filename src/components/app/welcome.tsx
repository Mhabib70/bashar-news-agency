"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowLeft, Check, LogIn, KeyRound, ShieldCheck } from "lucide-react"
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
  // مرحله دوم ورود برای حساب‌های دارای رمز دوم (PIN)
  const [pinStep, setPinStep] = useState(false)
  const [pinName, setPinName] = useState("")
  const [pin, setPin] = useState("")
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
      if (d.ok && d.pinRequired) {
        // حساب رمز دوم دارد — مرحله PIN
        setPinStep(true)
        setPinName(d.fullName ?? "")
        setPin("")
      } else if (d.ok && d.userId) {
        // اگر مرورگر کوکی نشست را ذخیره نکرد (پیش‌نمایش داخل آیفریم)،
        // توکن امضاشدهٔ پاسخ را نگه می‌داریم و با هدر می‌فرستیم.
        if (d.token) {
          try { localStorage.setItem("newsapp_token", d.token) } catch {}
        }
        await login()
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

  const doPinLogin = async () => {
    const p = faToEn(phone).replace(/\D/g, "")
    const code = faToEn(pin).replace(/\D/g, "")
    if (!code) {
      setErr("رمز دوم (PIN) را وارد کنید")
      return
    }
    setBusy(true)
    setErr("")
    try {
      const res = await fetch("/api/login/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, pin: code }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.ok && d.userId) {
        if (d.token) {
          try { localStorage.setItem("newsapp_token", d.token) } catch {}
        }
        await login()
        toast({ title: `خوش آمدی ${d.fullName}!`, description: "ورود با موفقیت انجام شد." })
        setOpen(false)
        setPinStep(false)
        setPhone("")
        setPin("")
      } else {
        setErr(d.error ?? "PIN اشتباه است")
      }
    } catch {
      setErr("خطای شبکه — اینترنت خود را بررسی کنید")
    }
    setBusy(false)
  }

  return (
    <div className="splash-container relative flex h-full flex-col overflow-hidden">
      {/* لایه‌های هنری پس‌زمینه: گرید ظریف + هاله‌های گرم + قاب معماری */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full bg-gradient-to-br from-success-soft/60 via-surface-container/40 to-transparent blur-3xl" />
        <div className="absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-gradient-to-tr from-primary/15 via-primary-container/20 to-transparent blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-80 rounded-full bg-gradient-to-t from-primary/10 via-surface-container-highest/30 to-transparent blur-3xl" />
        <div className="subtle-news-grid absolute inset-0 opacity-50" />
        {/* قاب گوشه‌های معماری */}
        <div className="absolute right-6 top-12 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-primary-container/70" />
        <div className="absolute left-6 top-12 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-primary-container/70" />
        <div className="absolute bottom-12 right-6 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-outline-variant/50" />
        <div className="absolute bottom-12 left-6 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-outline-variant/50" />
      </div>

      {/* هیرو مرکزی: لوگو با حلقه‌های prestige */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-8 animate-pulse-slow rounded-full border border-success/25" />
          <div className="absolute -inset-5 animate-spin-slow rounded-full border border-dashed border-primary-container/70" />
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-primary/25 via-surface-container-highest/30 to-success/15 blur-xl" />
          {/* کرهٔ مرکزی لوگو */}
          <div className="glow-ring relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-gradient-to-b from-white via-surface-container-low to-surface-container p-2 shadow-2xl ring-4 ring-primary-container/30">
            <Image src="/img/logo-mark.png" alt="نشان رسمی خبرگزاری بسیج شهر رشت" width={164} height={164} priority className="rounded-full object-cover" />
          </div>
          {/* نشان تایید رسمی */}
          <div className="absolute -left-1 bottom-1 z-10 rounded-full border border-surface-container-highest bg-white p-1 shadow-md" title="خبرگزاری رسمی بسیج">
            <div className="rounded-full bg-primary p-1.5 text-on-primary shadow-xs">
              <Check className="h-4 w-4" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* عنوان‌ها */}
        <div className="max-w-[330px] space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-container/60 bg-gradient-to-l from-surface-container-lowest via-surface-container-low to-surface-container px-3 py-1 text-[11px] font-bold text-primary shadow-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span>سامانه هوشمند رسانه‌ای شهر باران</span>
            <span className="font-normal text-on-surface-variant">| رشت</span>
          </div>
          <h1 className="text-[26px] font-black leading-tight tracking-tight text-on-surface">
            خبرگزاری بسیج شهر رشت
          </h1>
          <p className="px-2 text-[12px] font-medium leading-relaxed text-on-surface-variant">
            مرجع رسمی، لحظه‌ای و تحلیلی اخبار، رویدادها، خدمات اجتماعی و گزارش‌های چندرسانه‌ای کلانشهر رشت
          </p>
        </div>

        {/* لودر متحرک */}
        <div className="mt-6 w-full max-w-[260px]">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-outline-variant/50 bg-surface-container-low shadow-inner">
            <div className="animate-progress-infinite absolute inset-y-0 right-0 w-2/3 rounded-full bg-gradient-to-l from-primary via-primary-container to-warn" />
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
            <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
            <span>در حال دریافت آخرین سرخط اخبار و برقراری ارتباط امن…</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="v3-btn group inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] ring-2 ring-primary-container/50"
          >
            ورود به داشبورد تحریریه
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </button>
          <span className="text-[10px] font-medium text-on-surface-variant/80">دسترسی سریع خبرنگاران و کادر رسانه‌ای</span>
        </div>
      </div>

      {/* فوتر */}
      <footer className="relative z-10 space-y-3 px-6 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-white/80 px-3.5 py-1 text-[10px] font-semibold text-on-surface shadow-xs backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>رمزنگاری اختصاصی پروتکل خبری ۲۵۶ بیتی SSL</span>
        </div>
        <div className="text-[10px] font-normal leading-5 text-on-surface-variant">
          <div className="font-medium text-on-surface">معاونت روابط عمومی و تبلیغات ناحیه مقاومت بسیج رشت</div>
          <div>نسخه ۲.۹ پایدار • پاییز و زمستان ۱۴۰۵</div>
        </div>
      </footer>

      {/* ورود — با شماره موبایل؛ هیچ فهرست حسابی نمایش داده نمی‌شود */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-3 top-auto translate-y-0 gap-0 rounded-[28px] border-outline-variant/50 bg-surface-container-lowest p-5 data-[state=open]:slide-in-from-bottom-10 max-h-[82dvh] overflow-y-auto nice-scroll">
          <DialogHeader className="text-right">
            <DialogTitle className="text-on-surface">{pinStep ? "رمز دوم (PIN)" : "ورود به حساب"}</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              {pinStep
                ? `${pinName ? `${pinName} عزیز، ` : ""}این حساب رمز دوم دارد. PIN خود را وارد کنید.`
                : "شماره موبایل حساب خودتان را وارد کنید. حساب ندارید؟ ثبت‌نام کنید."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {pinStep ? (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">رمز دوم (۴ تا ۶ رقم)</label>
                  <Input
                    value={pin}
                    onChange={(e) => {
                      setPin(faToEn(e.target.value).replace(/\D/g, "").slice(0, 6))
                      setErr("")
                    }}
                    onKeyDown={(e) => e.key === "Enter" && doPinLogin()}
                    placeholder="••••"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                    className="v3-input rounded-2xl text-center text-[20px] tracking-[0.5em] placeholder:text-on-surface-variant/40"
                  />
                </div>
                {err && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{err}</p>
                )}
                <button
                  onClick={doPinLogin}
                  disabled={busy}
                  className="v3-btn flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-50"
                >
                  <KeyRound className="h-4.5 w-4.5" />
                  {busy ? "در حال بررسی..." : "تایید و ورود"}
                </button>
                <button
                  onClick={() => {
                    setPinStep(false)
                    setPin("")
                    setErr("")
                  }}
                  className="w-full text-center text-[12px] font-bold text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  بازگشت به ورود با شماره
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">شماره موبایل</label>
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
                    className="v3-input rounded-2xl text-right text-[15px] tracking-widest placeholder:text-on-surface-variant/50"
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
                  className="candy-btn-ghost flex w-full items-center justify-center gap-2 py-3.5 text-[14px]"
                >
                  ثبت‌نام خبرنگار جدید
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RegisterDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        initialPhone={faToEn(phone).replace(/\D/g, "")}
        onDone={(_id, msg) => {
          login().then(() => {
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
  // شماره‌ای که کاربر در صفحه ورود وارد کرده، همین‌جا پیش‌پر می‌شود.
  // تنظیم state هنگام تغییر prop (الگوی رسمی React) — نه داخل useEffect.
  const phoneKey = open && initialPhone ? initialPhone : ""
  const [prevPhoneKey, setPrevPhoneKey] = useState("")
  if (phoneKey !== prevPhoneKey) {
    setPrevPhoneKey(phoneKey)
    if (initialPhone) setF((prev) => ({ ...prev, phone: initialPhone }))
  }
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
      <DialogContent className="rounded-[28px] border-outline-variant/50 bg-surface-container-lowest p-5">
        <DialogHeader className="text-right">
          <DialogTitle className="text-on-surface">ثبت‌نام خبرنگار</DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            مرحله {toFa(step + 1)} از {toFa(steps.length)} — {steps[step]}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-surface-container-low")} />
          ))}
        </div>
        {step === 0 && (
          <p className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-[11.5px] leading-5 text-on-surface-variant">
            ثبت‌نام شما به‌عنوان خبرنگار ثبت می‌شود و پس از تایید ادمین کل فعال خواهد شد.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {step === 0 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">نام و نام خانوادگی</label>
                <Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="مثلاً: امون رضایی" className="v3-input rounded-2xl placeholder:text-on-surface-variant/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">شماره تماس</label>
                <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="۰۹۱۲..." dir="ltr" className="v3-input rounded-2xl text-right placeholder:text-on-surface-variant/50" />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">سن</label>
                <Input value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) })} placeholder="۲۵" inputMode="numeric" className="v3-input rounded-2xl placeholder:text-on-surface-variant/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">تحصیلات</label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVEL_LABELS.map((ed) => (
                    <button
                      key={ed.key}
                      onClick={() => setF({ ...f, education: ed.key })}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors",
                        f.education === ed.key
                          ? "border-transparent bg-gradient-to-l from-[var(--primary)] to-[var(--primary-deep, #7c2923)] text-white shadow-[0_8px_18px_-8px_rgba(180,26,34,0.6)]"
                          : "border-outline-variant/50 bg-surface-container-low text-on-surface-variant",
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
                <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">حوزه فعالیت</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DISTRICT_LABELS).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setF({ ...f, district: k, base: "" })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-colors",
                        f.district === k
                          ? "border-primary/40 bg-primary-fixed/40 text-primary dark:text-[#fca5a5]"
                          : "border-outline-variant/50 bg-surface-container-low text-on-surface-variant",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">پایگاه</label>
                <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto nice-scroll pl-1">
                  {(BASE_LISTS[f.district] ?? []).map((b) => (
                    <button
                      key={b}
                      onClick={() => setF({ ...f, base: b })}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[11.5px] font-semibold leading-4 transition-colors",
                        f.base === b
                          ? "border-primary/40 bg-primary-fixed/40 text-primary dark:text-[#fca5a5]"
                          : "border-outline-variant/50 bg-surface-container-low text-on-surface-variant",
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
            <button onClick={() => setStep(step - 1)} className="rounded-full border border-outline-variant/50 px-5 py-3 text-[13px] font-bold text-on-surface-variant">
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
