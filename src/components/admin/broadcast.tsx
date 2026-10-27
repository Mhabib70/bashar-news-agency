"use client"

import { useEffect, useState } from "react"
import { Send, Megaphone, History, Loader2, Info } from "lucide-react"
import { useApp, type AdminOverview } from "@/lib/store"
import { fa, relTime } from "@/lib/format"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// پیام همگانی: ارسال + تاریخچه ارسال‌های قبلی
export function AdminBroadcastSection() {
  const { broadcast, fetchAdminOverview } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<AdminOverview["recentBroadcasts"]>([])

  const loadHistory = async () => {
    const d = await fetchAdminOverview()
    if (d) setHistory(d.recentBroadcasts)
  }
  useEffect(() => {
    loadHistory()
  }, [])

  const canSend = title.trim().length >= 3 && text.trim().length >= 5

  const send = async () => {
    setBusy(true)
    const r = await broadcast(title.trim(), text.trim())
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
              پیام در مرکز اعلان همه اعضای فعال ثبت می‌شود. اعضایی که «اطلاع‌رسانی گروهی» را خاموش کرده‌اند دریافت نمی‌کنند و
              اعلان‌های بازه ساعت سکوت به پایان سکوت موکول می‌شوند (مطابق سناریوی ۵ ربات).
            </p>
          </div>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">عنوان پیام</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: جلسه هم‌اندیشی هفتگی" className="rounded-2xl border-line bg-surface-2 text-ink placeholder:text-ink-muted/50" maxLength={80} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">متن پیام</label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="متن کامل پیام همگانی..." className="rounded-2xl border-line bg-surface-2 text-ink leading-6 placeholder:text-ink-muted/50" maxLength={800} />
              <p className="mt-1 text-left text-[9.5px] text-ink-muted/60">{fa(text.length)} از ۸۰۰ کاراکتر</p>
            </div>
            <button
              onClick={send}
              disabled={!canSend || busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground transition-transform hover:scale-[1.01] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "در حال ارسال..." : "ارسال به همه اعضا"}
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
                <p className="mt-1.5 text-[9.5px] font-bold text-neon">دریافت توسط {fa(b.recipients)} عضو</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
