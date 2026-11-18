"use client"

import { useEffect, useState } from "react"
import { Send, Megaphone, History, Loader2, Info, Users2, Globe2, MapPin, Building2, X } from "lucide-react"
import { useApp, type AdminOverview } from "@/lib/store"
import { fa, faNum, relTime } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// پیام همگانی با انتخاب مخاطب: همه اعضا یا فیلتر نقش/حوزه/پایگاه — + تاریخچه ارسال‌ها
const ROLE_TARGETS = (["reporter", "district_manager", "specialist"] as const).map((r) => ({
  key: r,
  label: ROLE_LABELS[r],
}))

export function AdminBroadcastSection() {
  const { broadcast, fetchAdminOverview, state } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<AdminOverview["recentBroadcasts"]>([])
  // انتخاب مخاطبان — خالی = همهٔ اعضای فعال
  const [roles, setRoles] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [bases, setBases] = useState<string[]>([])

  const orgUnits = state?.districts ?? []

  const loadHistory = async () => {
    const d = await fetchAdminOverview()
    if (d) setHistory(d.recentBroadcasts)
  }
  useEffect(() => {
    let cancelled = false
    fetchAdminOverview().then((d) => {
      if (!cancelled && d) setHistory(d.recentBroadcasts)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const allBases = orgUnits.flatMap((d) => d.bases.map((b) => ({ district: d.key, base: b })))
  const toggle = (arr: string[], setArr: (v: string[]) => void, key: string) =>
    setArr(arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key])

  const canSend = title.trim().length >= 3 && text.trim().length >= 5
  const targeted = roles.length > 0 || districts.length > 0 || bases.length > 0

  const send = async () => {
    setBusy(true)
    const r = await broadcast(title.trim(), text.trim(), targeted ? { roles, districts, bases } : undefined)
    setBusy(false)
    if (r.ok) {
      toast({ title: "ارسال شد", description: r.message })
      setTitle("")
      setText("")
      loadHistory()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors",
      active ? "border-neon bg-neon text-neon-foreground" : "border-line bg-surface-2 text-ink-muted hover:text-ink",
    )

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* فرم ارسال */}
      <div className="space-y-3">
        <div className="rounded-[24px] border border-line bg-surface p-4">
          <p className="mb-2 flex items-center gap-2 text-[14px] font-black text-ink">
            <Megaphone className="h-4.5 w-4.5 text-neon" />
            پیام جدید همگانی
          </p>
          <div className="flex items-start gap-2 rounded-2xl border border-neon/25 bg-neon/6 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
            <p className="text-[11px] leading-5 text-ink-muted">
              می‌توانید پیام را به «همهٔ اعضا» بفرستید یا فقط به نقش‌ها، حوزه‌ها و پایگاه‌های انتخابی.
              اعضایی که «اطلاع‌رسانی گروهی» را خاموش کرده‌اند دریافت نمی‌کنند و اعلان‌های ساعت سکوت به پایان سکوت موکول می‌شوند.
            </p>
          </div>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">عنوان پیام</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: جلسه هم‌اندیشی هفتگی" className="rounded-2xl border-line bg-surface-2 text-ink placeholder:text-ink-muted/50" maxLength={80} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">متن پیام</label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="متن کامل پیام..." className="rounded-2xl border-line bg-surface-2 text-ink leading-6 placeholder:text-ink-muted/50" maxLength={800} />
              <p className="mt-1 text-left text-[9.5px] text-ink-muted/60">{fa(text.length)} از ۸۰۰ کاراکتر</p>
            </div>

            {/* انتخاب مخاطبان */}
            <div className="rounded-2xl border border-line bg-surface-2/50 p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-black text-ink">
                <Users2 className="h-4 w-4 text-neon" />
                مخاطبان
                <button
                  onClick={() => { setRoles([]); setDistricts([]); setBases([]) }}
                  className={cn("mr-auto text-[10.5px] font-bold", targeted ? "text-danger-soft" : "text-ink-muted")}
                >
                  {targeted ? "پاک‌کردن انتخاب‌ها" : "همهٔ اعضا (پیش‌فرض)"}
                </button>
              </p>

              <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-bold text-ink-muted">
                <Globe2 className="h-3 w-3" /> نقش‌ها
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ROLE_TARGETS.map((r) => (
                  <button key={r.key} onClick={() => toggle(roles, setRoles, r.key)} className={chip(roles.includes(r.key))}>
                    {r.label}
                  </button>
                ))}
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-[10.5px] font-bold text-ink-muted">
                <MapPin className="h-3 w-3" /> حوزه‌ها
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {orgUnits.map((d) => (
                  <button key={d.key} onClick={() => toggle(districts, setDistricts, d.key)} className={chip(districts.includes(d.key))}>
                    {DISTRICT_LABELS[d.key] ?? d.label}
                  </button>
                ))}
              </div>

              {allBases.length > 0 && (
                <>
                  <p className="mt-3 flex items-center gap-1.5 text-[10.5px] font-bold text-ink-muted">
                    <Building2 className="h-3 w-3" /> پایگاه‌ها
                  </p>
                  <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                    {allBases.map((b) => {
                      const key = `${b.district}:${b.base}`
                      return (
                        <button key={key} onClick={() => toggle(bases, setBases, key)} className={chip(bases.includes(key))}>
                          {b.base}
                          {bases.includes(key) && <X className="mr-1 inline h-3 w-3" />}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {targeted && (
                <p className="mt-3 rounded-xl bg-neon/8 px-3 py-2 text-[10.5px] font-bold leading-5 text-neon">
                  ارسال فقط به مخاطبان انتخابی — ترکیب انتخاب‌ها با «و» اعمال می‌شود.
                </p>
              )}
            </div>

            <button
              onClick={send}
              disabled={!canSend || busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground transition-transform hover:scale-[1.01] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "در حال ارسال..." : targeted ? "ارسال به مخاطبان انتخابی" : "ارسال به همهٔ اعضا"}
            </button>
          </div>
        </div>
      </div>

      {/* تاریخچه */}
      <div className="rounded-[24px] border border-line bg-surface p-4">
        <p className="mb-3 flex items-center gap-2 text-[14px] font-black text-ink">
          <History className="h-4.5 w-4.5 text-neon" />
          تاریخچه ارسال‌ها
        </p>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line py-12 text-center text-[12px] text-ink-muted">
            هنوز پیام همگانی ارسال نشده است.
          </p>
        ) : (
          <div className="space-y-2.5">
            {history.map((b, i) => (
              <div key={i} className="rounded-2xl border border-line bg-surface-2 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-ink">{b.title}</p>
                  <span className="shrink-0 text-[9.5px] text-ink-muted/70">{relTime(b.at)}</span>
                </div>
                <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-ink-muted">{b.body}</p>
                <p className="mt-1.5 text-[9.5px] font-bold text-neon">دریافت توسط {faNum(b.recipients)} عضو</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
