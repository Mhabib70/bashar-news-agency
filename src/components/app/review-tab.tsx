"use client"

import { useState } from "react"
import { Check, X, ClipboardCheck, Inbox } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, relTime, durFmt } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, reviewStageLabel, DISTRICT_LABELS, ROLE_STAGE, REVIEW_STAGES } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function ReviewScreen() {
  const { state } = useApp()
  const { toast } = useToast()
  const [rejecting, setRejecting] = useState<number | null>(null)
  const [reason, setReason] = useState("insufficient")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<number | null>(null)
  const { reviewNews } = useApp()

  if (!state) return null
  const queue = state.reviewQueue
  const role = state.user.role
  const stageKey = ROLE_STAGE[role]
  const stageIdx = REVIEW_STAGES.findIndex((s) => s.key === stageKey)

  const act = async (newsId: number, action: "approve" | "reject", r?: string, n?: string) => {
    setBusy(newsId)
    const res = await reviewNews(newsId, action, r, n)
    setBusy(null)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      setRejecting(null)
      setNote("")
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  return (
    <div className="stage-enter flex flex-col gap-4 px-5 pb-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-ink">صف بررسی</h1>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            {stageIdx >= 0 && `مرحله ${fa(stageIdx + 1)} از ${fa(3)}: ${reviewStageLabel(stageKey)}`}
            {role === "district_manager" && ` · محدود به ${DISTRICT_LABELS[state.user.district] ?? ""}`}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neon/12 text-neon">
          <ClipboardCheck className="h-5 w-5" />
        </span>
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-line py-14 text-center">
          <Inbox className="h-9 w-9 text-neon/60" />
          <p className="text-[14px] font-bold text-ink">صف بررسی خالی است</p>
          <p className="max-w-[240px] text-[11.5px] leading-5 text-ink-muted">
            همه خبرهای رسیده به مرحله شما رسیدگی شده‌اند. کارت عالی!
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-warn/25 bg-warn/8 px-4 py-3">
            <span className="text-[12.5px] font-bold text-warn">{fa(queue.length)} خبر در انتظار تصمیم شماست</span>
            <span className="text-[10.5px] text-ink-muted">تایید یا رد با دلیل</span>
          </div>

          <div className="space-y-3">
            {queue.map((n) => (
              <div key={n.id} className="rounded-[26px] border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-ink-muted">{CATEGORY_LABELS[n.category]}</span>
                  <span className="text-[10px] text-ink-muted">
                    {n.code} · {relTime(n.createdAt)} · {durFmt(n.durationMin)}
                  </span>
                </div>
                <p className="mt-2 text-[14px] font-bold leading-6 text-ink">{n.title}</p>
                {n.mediaUrl && n.mediaType === "photo" && (
                  <img src={n.mediaUrl} alt="رسانه خبر" className="mt-2.5 max-h-44 w-full rounded-2xl border border-line object-cover" />
                )}
                {n.mediaUrl && n.mediaType === "video" && (
                  <video src={n.mediaUrl} controls className="mt-2.5 max-h-44 w-full rounded-2xl border border-line bg-black" />
                )}
                <p className="mt-1.5 line-clamp-3 text-[12px] leading-6 text-ink-muted">{n.content}</p>
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
                    {busy === n.id ? "..." : "تایید"}
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(n.id)
                      setReason("insufficient")
                    }}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#ff5c5c]/40 py-3 text-[13px] font-bold text-[#ff8484] transition-colors hover:bg-[#ff5c5c]/8 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    رد با دلیل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* رد با دلیل */}
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">رد خبر با دلیل</DialogTitle>
            <DialogDescription className="text-ink-muted">
              دلیل رد برای خبرنگار نمایش داده می‌شود؛ می‌تواند ویرایش و مجدداً ارسال کند.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
            {REJECT_REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-right transition-colors",
                  reason === r.key ? "border-[#ff5c5c]/50 bg-[#ff5c5c]/8" : "border-line bg-surface hover:bg-surface-2",
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", reason === r.key ? "border-[#ff5c5c] bg-[#ff5c5c] text-white" : "border-line")}>
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
            className="mt-4 w-full rounded-full bg-[#ff5c5c] py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy !== null ? "..." : "ثبت رد خبر"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
