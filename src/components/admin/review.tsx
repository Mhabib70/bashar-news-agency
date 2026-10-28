"use client"

import { useMemo, useState } from "react"
import { Check, X, ClipboardList, Inbox, ChevronDown, RefreshCw, Hourglass, Filter } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, relTime, durFmt } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, reviewStageLabel, DISTRICT_LABELS, REVIEW_STAGES } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// صف بررسی اختصاصی ادمین: همه مراحل، فیلتر مرحله/حوزه، متن کامل + رسانه
export function AdminReviewSection() {
  const { state, reviewNews, refresh } = useApp()
  const { toast } = useToast()
  const [stage, setStage] = useState("all")
  const [district, setDistrict] = useState("all")
  const [expanded, setExpanded] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<number | null>(null)
  const [reason, setReason] = useState("insufficient")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<number | null>(null)

  const queue = state?.reviewQueue ?? []

  const filtered = useMemo(
    () =>
      queue.filter((n) => {
        if (stage !== "all" && n.reviewStage !== stage) return false
        if (district !== "all" && n.district !== district) return false
        return true
      }),
    [queue, stage, district],
  )

  const act = async (newsId: number, action: "approve" | "reject", r?: string, n?: string) => {
    setBusy(newsId)
    const res = await reviewNews(newsId, action, r, n)
    setBusy(null)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      setRejecting(null)
      setNote("")
      refresh()
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  if (!state) return null

  return (
    <div className="space-y-5">
      {/* فیلترها */}
      <div className="rounded-[24px] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink-muted">
            <Filter className="h-3.5 w-3.5" />
            مرحله:
          </span>
          {[{ key: "all", label: "همه" }, ...REVIEW_STAGES].map((s) => {
            const count = s.key === "all" ? queue.length : queue.filter((n) => n.reviewStage === s.key).length
            return (
              <button
                key={s.key}
                onClick={() => setStage(s.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11.5px] font-bold transition-colors",
                  stage === s.key ? "border-neon bg-neon text-neon-foreground" : "border-line bg-surface-2 text-ink-muted hover:text-ink",
                )}
              >
                {s.label}
                <span className={cn("rounded-full px-1.5 text-[9.5px]", stage === s.key ? "bg-black/15" : "bg-surface")}>{fa(count)}</span>
              </button>
            )
          })}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="mr-auto rounded-xl border border-line bg-surface-2 px-3 py-2 text-[11.5px] font-bold text-ink"
          >
            <option value="all">همه حوزه‌ها</option>
            {Object.entries(DISTRICT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-2 text-ink-muted transition-colors hover:text-neon"
            aria-label="بارگذاری مجدد صف"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-line py-16 text-center">
          <Inbox className="h-10 w-10 text-neon/60" />
          <p className="text-[15px] font-bold text-ink">{queue.length === 0 ? "صف بررسی کاملاً خالی است" : "با این فیلترها خبری یافت نشد"}</p>
          <p className="max-w-[280px] text-[12px] leading-5 text-ink-muted">
            {queue.length === 0
              ? "به‌محض ثبت خبر جدید توسط خبرنگاران، همین‌جا برای تصمیم‌گیری نمایش داده می‌شود."
              : "فیلتر مرحله یا حوزه را تغییر دهید."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const open = expanded === n.id
            return (
              <div key={n.id} className="rounded-[26px] border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold text-ink-muted">{CATEGORY_LABELS[n.category]}</span>
                    <span className="flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-[10px] font-bold text-warn">
                      <Hourglass className="h-3 w-3" />
                      {reviewStageLabel(n.reviewStage)}
                    </span>
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    <span dir="ltr">{n.code}</span> · {relTime(n.createdAt)} · {durFmt(n.durationMin)}
                  </span>
                </div>

                <p className="mt-2.5 text-[15px] font-bold leading-7 text-ink">{n.title}</p>

                {n.mediaUrl && n.mediaType === "photo" && (
                  <img src={n.mediaUrl} alt="رسانه خبر" className="mt-3 max-h-56 w-full rounded-2xl border border-line object-cover" />
                )}
                {n.mediaUrl && n.mediaType === "video" && (
                  <video src={n.mediaUrl} controls className="mt-3 max-h-56 w-full rounded-2xl border border-line bg-black" />
                )}

                <p className={cn("mt-2 text-[12.5px] leading-6 text-ink-muted", !open && "line-clamp-2")}>{n.content}</p>
                <button onClick={() => setExpanded(open ? null : n.id)} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-neon">
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                  {open ? "بستن متن کامل" : "متن کامل خبر"}
                </button>

                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon/12 text-[11px] font-black text-neon">
                    {n.reporterName.slice(0, 1)}
                  </span>
                  <span className="flex-1 text-[11px] text-ink-muted">
                    {n.reporterName} · {DISTRICT_LABELS[n.district] ?? n.district}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => act(n.id, "approve")}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neon py-3 text-[13px] font-bold text-neon-foreground transition-transform hover:scale-[1.01] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {busy === n.id ? "..." : "تایید خبر"}
                  </button>
                  <button
                    onClick={() => { setRejecting(n.id); setReason("insufficient"); setNote("") }}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/40 py-3 text-[13px] font-bold text-danger-soft transition-colors hover:bg-danger/8 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    رد با دلیل
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* دیالوگ رد */}
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-ink">
              <ClipboardList className="h-5 w-5 text-danger" />
              رد خبر با دلیل
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              دلیل رد برای خبرنگار اعلان می‌شود؛ می‌تواند ویرایش و مجدداً ارسال کند.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
            {REJECT_REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-right transition-colors",
                  reason === r.key ? "border-danger/50 bg-danger/8" : "border-line bg-surface hover:bg-surface-2",
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", reason === r.key ? "border-danger bg-danger text-white" : "border-line")}>
                  {reason === r.key && <Check className="h-3 w-3" />}
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-ink">{r.label}</span>
                  <span className="block text-[11px] text-ink-muted">{r.hint}</span>
                </span>
              </button>
            ))}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="توضیح تکمیلی برای خبرنگار (اختیاری)" className="rounded-2xl border-line bg-surface text-ink leading-6 placeholder:text-ink-muted/50" />
          </div>
          <button
            onClick={() => rejecting !== null && act(rejecting, "reject", reason, note)}
            disabled={busy !== null}
            className="mt-4 w-full rounded-full bg-danger py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy !== null ? "..." : "ثبت رد خبر"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
