"use client"

import { useEffect, useState } from "react"
import { Phone, Plus, Pencil, Trash2, Send, MessageSquareText, Loader2, Radio, ExternalLink, ShieldCheck, Users2 } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, faNum } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// رسانه‌های بیرونی — دفترچهٔ تماس ادمین کل:
// ثبت خبرنگاران رسانه‌های بیرونی (نام + شماره) و ارتباط یکطرفه:
//  ۱) پیامک انبوه (SMS_API_KEY + SMS_PATTERN_CODE در سرور)
//  ۲) ارسال خبر منتخب به کانال ایتا که مخاطبان دنبال می‌کنند (BASHAR_EITAA_*)

type Contact = {
  id: number
  fullName: string
  mediaName: string
  phone: string
  note: string
  createdAt: string
}

type ContactsPayload = {
  contacts: Contact[]
  smsConfigured: boolean
  eitaaConfigured: boolean
}

const EMPTY_FORM = { id: 0, fullName: "", mediaName: "", phone: "", note: "" }

export function AdminContactsSection() {
  const { sendToEitaa, state, refresh } = useApp()
  const { toast } = useToast()
  const [data, setData] = useState<ContactsPayload | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null)
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState<number[]>([])
  const [smsOpen, setSmsOpen] = useState(false)
  const [smsText, setSmsText] = useState("")
  const [newsOpen, setNewsOpen] = useState(false)
  const [newsBusy, setNewsBusy] = useState<number | null>(null)

  const load = async () => {
    try {
      const res = await fetch("/api/contacts")
      const d = await res.json()
      if (res.ok) setData(d)
    } catch {
      /* شبکه */
    }
  }
  useEffect(() => {
    load()
  }, [])

  const saveContact = async () => {
    if (!form) return
    setBusy(true)
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: form.id ? "update" : "create", ...form }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.ok) {
        toast({ title: "ثبت شد", description: d.message })
        setForm(null)
        await load()
      } else {
        toast({ title: "خطا", description: d.error ?? "عملیات ناموفق بود", variant: "destructive" })
      }
    } catch {
      toast({ title: "خطا", description: "خطای شبکه", variant: "destructive" })
    }
    setBusy(false)
  }

  const removeContact = async (c: Contact) => {
    setBusy(true)
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: c.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.ok) {
        toast({ title: "حذف شد", description: d.message })
        setChecked((prev) => prev.filter((x) => x !== c.id))
        await load()
      } else {
        toast({ title: "خطا", description: d.error ?? "عملیات ناموفق بود", variant: "destructive" })
      }
    } catch {
      toast({ title: "خطا", description: "خطای شبکه", variant: "destructive" })
    }
    setBusy(false)
  }

  const sendSms = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sms", ids: checked, text: smsText }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.ok) {
        toast({ title: "ارسال شد", description: d.message })
        setSmsOpen(false)
        setSmsText("")
      } else {
        toast({ title: "خطا", description: d.error ?? "عملیات ناموفق بود", variant: "destructive" })
      }
    } catch {
      toast({ title: "خطا", description: "خطای شبکه", variant: "destructive" })
    }
    setBusy(false)
  }

  // ارسال خبر منتخب به کانال ایتا (مخاطبان، کانال را دنبال می‌کنند)
  const approvedNews = (state?.news ?? []).filter((n) => n.status === "approved").slice(0, 8)
  const sendNewsToEitaa = async (id: number) => {
    setNewsBusy(id)
    const r = await sendToEitaa(id)
    setNewsBusy(null)
    if (r.ok) {
      toast({ title: "ارسال شد", description: r.message })
      setNewsOpen(false)
      refresh()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const toggleCheck = (id: number) => setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const contacts = data?.contacts ?? []

  return (
    <div className="space-y-5">
      {/* راهنما */}
      <div className="flex items-start gap-2.5 rounded-[24px] border border-neon/25 bg-neon/6 p-4">
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-neon" />
        <p className="text-[12px] leading-6 text-ink-muted">
          خبرنگاران رسانه‌های بیرونی را با نام و شماره ثبت کنید و یک‌طرفه با آنها در ارتباط باشید:
          <b className="text-ink"> پیامک انبوه</b> مستقیم به گوشی‌شان، و <b className="text-ink">اخبار منتخب</b> روی کانال ایتا که دنبال می‌کنند.
          این مخاطبان عضو اپ نمی‌شوند و حسابی ندارند.
        </p>
      </div>

      {/* نوار ابزار */}
      <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-line bg-surface p-4">
        <button
          onClick={() => setForm({ ...EMPTY_FORM })}
          className="flex items-center gap-1.5 rounded-full bg-neon px-4 py-2.5 text-[12.5px] font-bold text-neon-foreground transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          ثبت مخاطب جدید
        </button>
        <button
          onClick={() => setSmsOpen(true)}
          disabled={contacts.length === 0 || (data ? !data.smsConfigured : false)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[12.5px] font-bold transition-colors disabled:opacity-40",
            "border-line bg-surface-2 text-ink hover:border-neon/40 hover:text-neon",
          )}
          title={data && !data.smsConfigured ? "ابتدا SMS_API_KEY و SMS_PATTERN_CODE را در سرور تنظیم کنید" : undefined}
        >
          <MessageSquareText className="h-4 w-4" />
          پیامک انبوه {checked.length > 0 ? `به ${fa(checked.length)} نفر` : "به همه"}
        </button>
        <button
          onClick={() => setNewsOpen(true)}
          disabled={contacts.length === 0 || (data ? !data.eitaaConfigured : false)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[12.5px] font-bold transition-colors disabled:opacity-40",
            "border-line bg-surface-2 text-ink hover:border-neon/40 hover:text-neon",
          )}
          title={data && !data.eitaaConfigured ? "ابتدا BASHAR_EITAA_TOKEN و BASHAR_EITAA_CHANNEL را در سرور تنظیم کنید" : undefined}
        >
          <Send className="h-4 w-4" />
          خبر منتخب ← ایتا
        </button>
        <span className="mr-auto text-[11px] font-bold text-ink-muted">
          <Users2 className="mr-1 inline h-3.5 w-3.5" />
          {faNum(contacts.length)} مخاطب {checked.length > 0 && `· ${fa(checked.length)} انتخاب‌شده`}
        </span>
      </div>

      {/* وضعیت تنظیمات */}
      {data && (!data.smsConfigured || !data.eitaaConfigured) && (
        <div className="rounded-[24px] border border-warn/35 bg-warn/6 p-4 text-[11.5px] leading-6 text-ink-muted">
          <p className="mb-1 flex items-center gap-1.5 font-black text-warn"><ShieldCheck className="h-4 w-4" /> تنظیمات ارسال ناقص است:</p>
          {!data.smsConfigured && <p>• پیامک: در فایل .env سرور متغیرهای <span dir="ltr">SMS_API_KEY</span>، <span dir="ltr">SMS_PATTERN_CODE</span> و <span dir="ltr">SMS_SENDER</span> را بگذارید (سرویس فراز اس‌ام‌س/آی‌پنل — پترن با متغیر message).</p>}
          {!data.eitaaConfigured && <p>• ایتا: متغیرهای <span dir="ltr">BASHAR_EITAA_TOKEN</span> و <span dir="ltr">BASHAR_EITAA_CHANNEL</span> هنوز تنظیم نشده‌اند.</p>}
        </div>
      )}

      {/* فهرست مخاطبان */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-line py-14 text-center">
          <Phone className="h-9 w-9 text-neon/50" />
          <p className="text-[14px] font-bold text-ink">دفترچهٔ مخاطبان خالی است</p>
          <p className="max-w-[300px] text-[11.5px] leading-5 text-ink-muted">
            اولین خبرنگار رسانهٔ بیرونی را با «ثبت مخاطب جدید» اضافه کنید — نام، رسانه و شماره تماس.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-[24px] border p-4 transition-colors",
                checked.includes(c.id) ? "border-neon/50 bg-neon/6" : "border-line bg-surface",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleCheck(c.id)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    checked.includes(c.id) ? "border-neon bg-neon text-white" : "border-line",
                  )}
                  aria-label="انتخاب برای پیامک"
                >
                  {checked.includes(c.id) && "✓"}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black text-ink">{c.fullName}</p>
                  {c.mediaName && <p className="mt-0.5 text-[11px] font-bold text-neon">{c.mediaName}</p>}
                  <p className="mt-1 text-[11.5px] text-ink-muted" dir="ltr">{c.phone}</p>
                  {c.note && <p className="mt-1 text-[10.5px] leading-4 text-ink-muted/80">{c.note}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <button
                  onClick={() => setForm({ id: c.id, fullName: c.fullName, mediaName: c.mediaName, phone: c.phone, note: c.note })}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full border border-line py-2 text-[11.5px] font-bold text-ink transition-colors hover:border-neon/40 hover:text-neon"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  ویرایش
                </button>
                <button
                  onClick={() => removeContact(c)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full border border-danger/40 py-2 text-[11.5px] font-bold text-danger-soft transition-colors hover:bg-danger/8 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* دیالوگ ثبت/ویرایش مخاطب */}
      <Dialog open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-ink">
              <Phone className="h-4.5 w-4.5 text-neon" />
              {form?.id ? "ویرایش مخاطب" : "ثبت مخاطب رسانهٔ بیرونی"}
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              فقط در دفترچهٔ شما ذخیره می‌شود — این مخاطب به اپ دسترسی ندارد.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2.5">
            <Input value={form?.fullName ?? ""} onChange={(e) => form && setForm({ ...form, fullName: e.target.value })} placeholder="نام و نام خانوادگی" className="rounded-2xl border-line bg-surface-2 text-ink placeholder:text-ink-muted/50" />
            <Input value={form?.mediaName ?? ""} onChange={(e) => form && setForm({ ...form, mediaName: e.target.value })} placeholder="نام رسانه (خبرگزاری، روزنامه، کانال...)" className="rounded-2xl border-line bg-surface-2 text-ink placeholder:text-ink-muted/50" />
            <Input value={form?.phone ?? ""} onChange={(e) => form && setForm({ ...form, phone: e.target.value })} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" inputMode="tel" className="rounded-2xl border-line bg-surface-2 text-ink placeholder:text-ink-muted/50" />
            <Textarea value={form?.note ?? ""} onChange={(e) => form && setForm({ ...form, note: e.target.value })} rows={2} placeholder="یادداشت (اختیاری)" className="rounded-2xl border-line bg-surface-2 text-ink leading-6 placeholder:text-ink-muted/50" />
            <button
              onClick={saveContact}
              disabled={busy || !form || form.fullName.trim().length < 2 || form.phone.trim().length < 10}
              className="w-full rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="mx-auto h-4.5 w-4.5 animate-spin" /> : form?.id ? "ذخیره تغییرات" : "ثبت مخاطب"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* دیالوگ پیامک انبوه */}
      <Dialog open={smsOpen} onOpenChange={(v) => !v && setSmsOpen(false)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-ink">
              <MessageSquareText className="h-4.5 w-4.5 text-neon" />
              پیامک انبوه
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              ارسال یک‌طرفه به {checked.length > 0 ? `${fa(checked.length)} مخاطب انتخاب‌شده` : `همهٔ ${faNum(contacts.length)} مخاطب`} — از خط سازمانی.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} rows={5} maxLength={500} placeholder="متن پیامک (حداکثر ۵۰۰ کاراکتر)..." className="mt-3 rounded-2xl border-line bg-surface-2 text-ink leading-6 placeholder:text-ink-muted/50" />
          <p className="mt-1 text-left text-[9.5px] text-ink-muted/60">{fa(smsText.length)} از ۵۰۰ کاراکتر</p>
          <button
            onClick={sendSms}
            disabled={busy || smsText.trim().length < 5}
            className="mt-3 w-full rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="mx-auto h-4.5 w-4.5 animate-spin" /> : "ارسال پیامک"}
          </button>
        </DialogContent>
      </Dialog>

      {/* دیالوگ ارسال خبر منتخب به ایتا */}
      <Dialog open={newsOpen} onOpenChange={(v) => !v && setNewsOpen(false)}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-ink">
              <Send className="h-4.5 w-4.5 text-neon" />
              ارسال خبر منتخب به ایتا
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              خبر روی کانال ایتا منتشر می‌شود و مخاطبانِ ثبت‌شده که کانال را دنبال می‌کنند آن را می‌بینند.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
            {approvedNews.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-ink-muted">در فهرست خبرهای شما خبر تأییدشده‌ای نیست.</p>
            ) : (
              approvedNews.map((n) => (
                <button
                  key={n.id}
                  onClick={() => sendNewsToEitaa(n.id)}
                  disabled={newsBusy !== null}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3 text-right transition-colors hover:border-neon/40 disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-bold text-ink">{n.title}</span>
                    <span className="mt-0.5 block text-[9.5px] text-ink-muted" dir="ltr">{n.code}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-black text-neon">
                    {newsBusy === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    ارسال
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
