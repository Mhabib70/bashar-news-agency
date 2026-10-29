"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { Plus, PencilLine, X, FileText, Search } from "lucide-react"
import { useApp } from "@/lib/store"
import { SectionHeader, StatusChip, StageDots, StageTimeline, StageChip } from "@/components/app/bits"
import { fa, durFmt, relTime, jalali } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, DISTRICT_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const FILTERS = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در بررسی" },
  { key: "approved", label: "تایید شده" },
  { key: "rejected", label: "رد شده" },
] as const

export function NewsScreen({ onQuickSubmit, draftsView }: { onQuickSubmit: () => void; draftsView?: boolean }) {
  const { state } = useApp()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all")
  const [detail, setDetail] = useState<number | null>(null)
  const [q, setQ] = useState("")
  const searched = q.trim().length >= 2
  const list = useMemo(() => {
    if (!state) return []
    let rows = state.news
    if (filter !== "all") rows = rows.filter((n) => n.status === filter)
    if (searched) {
      const s = q.trim().toLowerCase()
      rows = rows.filter((n) => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s) || n.code.toLowerCase().includes(s))
    }
    return rows
  }, [state, filter, q, searched])
  if (!state) return null
  const detailNews = state.news.find((n) => n.id === detail)

  return (
    <div className="stage-enter flex flex-col gap-4 px-5 pb-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-black text-ink">{draftsView ? "اخبار و پیش‌نویس‌ها" : "اخبار من"}</h1>
        <button
          onClick={onQuickSubmit}
          className="flex items-center gap-1.5 rounded-full bg-neon px-4 py-2.5 text-[13px] font-bold text-neon-foreground btn-glow transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          ارسال خبر
        </button>
      </div>

      {/* جستجوی اخبار */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو در تیتر، متن یا کد پیگیری..."
          className="w-full rounded-full border border-line bg-surface py-3 pl-4 pr-11 text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-muted/50 focus:border-neon/50"
        />
        {searched && (
          <button onClick={() => setQ("")} className="absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* فیلترها */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? state.news.length : state.news.filter((n) => n.status === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
                filter === f.key ? "border-neon bg-neon text-neon-foreground" : "border-line bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {f.label} {count > 0 && <span className={cn("mr-1", filter === f.key ? "opacity-70" : "text-ink-muted/70")}>{fa(count)}</span>}
            </button>
          )
        })}
      </div>

      {/* پیش‌نویس‌ها */}
      {draftsView && state.drafts.length > 0 && (
        <div>
          <SectionHeader title="پیش‌نویس‌ها" />
          <div className="space-y-2">
            {state.drafts.map((d) => (
              <button key={d.id} onClick={onQuickSubmit} className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-line bg-surface/60 p-3.5 text-right transition-colors hover:border-neon/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-ink">{d.title || "بدون عنوان"}</span>
                  <span className="block text-[11px] text-ink-muted">{CATEGORY_LABELS[d.category]} · ذخیره {relTime(d.savedAt)}</span>
                </span>
                <PencilLine className="h-4 w-4 shrink-0 text-ink-muted" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* لیست اخبار */}
      <div className="space-y-2.5">
        {list.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-line py-12 text-center">
            <FileText className="h-8 w-8 text-ink-muted/50" />
            <p className="text-[13.5px] font-bold text-ink-muted">{searched ? "نتیجه‌ای برای جستجو پیدا نشد" : "خبری در این دسته نیست"}</p>
            {!searched && <p className="text-[11.5px] text-ink-muted/70">با دکمه سبز بالا اولین خبرت را بفرست</p>}
          </div>
        )}
        {list.map((n) => (
          <button key={n.id} onClick={() => setDetail(n.id)} className="w-full rounded-[26px] border border-line bg-surface p-4 text-right transition-colors hover:bg-surface-2">
            <div className="flex items-start gap-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                <Image src={`/img/cat-${n.category === "none" ? "local" : n.category}.png`} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-ink-muted">{CATEGORY_LABELS[n.category]}</span>
                  <StatusChip status={n.status} small />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13.5px] font-bold leading-6 text-ink">{n.title}</p>
                <p className="mt-1 text-[10.5px] text-ink-muted">
                  {n.code} · {jalali(n.createdAt)} · {durFmt(n.durationMin)}
                  {n.mediaUrl && n.mediaType === "photo" ? " · 📷" : n.mediaUrl && n.mediaType === "video" ? " · 🎬" : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <StageDots status={n.status} stage={n.reviewStage} />
              <StageChip status={n.status} stage={n.reviewStage} />
            </div>
          </button>
        ))}
      </div>

      {/* جزئیات خبر */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[84dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
          {detailNews && (
            <>
              <DialogHeader className="text-right">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold text-ink-muted">{CATEGORY_LABELS[detailNews.category]}</span>
                  <StatusChip status={detailNews.status} small />
                </div>
                <DialogTitle className="text-right text-[16px] leading-7 text-ink">{detailNews.title}</DialogTitle>
                <DialogDescription className="text-[11px] text-ink-muted">
                  {detailNews.code} · {jalali(detailNews.createdAt, true)} · {DISTRICT_LABELS[detailNews.district]}
                </DialogDescription>
              </DialogHeader>
              <p className="mt-1 whitespace-pre-line text-[13.5px] leading-7 text-ink/90">{detailNews.content}</p>

              {detailNews.mediaUrl && detailNews.mediaType === "photo" && (
                <img src={detailNews.mediaUrl} alt="رسانه خبر" className="mt-3 max-h-64 w-full rounded-2xl border border-line object-cover" />
              )}
              {detailNews.mediaUrl && detailNews.mediaType === "video" && (
                <video src={detailNews.mediaUrl} controls className="mt-3 max-h-64 w-full rounded-2xl border border-line bg-black" />
              )}

              {detailNews.status === "rejected" && (
                <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/8 p-4">
                  <p className="text-[12.5px] font-bold text-danger-soft">
                    دلیل رد: {REJECT_REASONS.find((r) => r.key === detailNews.rejectReason)?.label ?? "—"}
                  </p>
                  {detailNews.rejectNote && <p className="mt-1 text-[12px] leading-6 text-ink-muted">{detailNews.rejectNote}</p>}
                </div>
              )}

              <div className="mt-4">
                <p className="mb-2 text-[12.5px] font-black text-ink">پیش‌نمایش زنده چرخه بررسی</p>
                <StageTimeline news={detailNews} />
              </div>

              {detailNews.status === "rejected" && (
                <ResubmitButton newsId={detailNews.id} onDone={() => setDetail(null)} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ResubmitButton({ newsId, onDone }: { newsId: number; onDone: () => void }) {
  const { resubmitNews } = useApp()
  const [busy, setBusy] = useState(false)
  return (
    <button
      onClick={async () => {
        setBusy(true)
        await resubmitNews(newsId)
        setBusy(false)
        onDone()
      }}
      disabled={busy}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-50"
    >
      {busy ? <X className="hidden" /> : <PencilLine className="h-4.5 w-4.5" />}
      ویرایش و ارسال مجدد (چرخه از مدیر حوزه)
    </button>
  )
}
