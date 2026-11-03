"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Plus, PencilLine, X, FileText, Search, Trash2, RefreshCw, Globe2, UserRound, Send } from "lucide-react"
import { useApp, type NewsDTO } from "@/lib/store"
import { SectionHeader, StatusChip, StageDots, StageTimeline, StageChip } from "@/components/app/bits"
import { NewsEditDialog } from "@/components/app/news-edit"
import { fa, durFmt, relTime, jalali } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, DISTRICT_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const FILTERS = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در بررسی" },
  { key: "approved", label: "تایید شده" },
  { key: "rejected", label: "رد شده" },
] as const

export function NewsScreen({ onQuickSubmit, draftsView }: { onQuickSubmit: () => void; draftsView?: boolean }) {
  const { state, fetchAllNews, deleteNews, refresh } = useApp()
  const { toast } = useToast()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all")
  const [detail, setDetail] = useState<number | null>(null)
  const [q, setQ] = useState("")
  const [scope, setScope] = useState<"all" | "mine">("all")
  const [allNews, setAllNews] = useState<NewsDTO[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const searched = q.trim().length >= 2

  const loadAll = async () => {
    setLoadingAll(true)
    const rows = await fetchAllNews()
    setAllNews(rows)
    setLoadingAll(false)
  }
  useEffect(() => {
    if (scope === "all") loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const base = scope === "all" ? allNews : (state?.news ?? [])
  const list = useMemo(() => {
    let rows = base
    if (filter !== "all") rows = rows.filter((n) => n.status === filter)
    if (searched) {
      const s = q.trim().toLowerCase()
      rows = rows.filter((n) => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s) || n.code.toLowerCase().includes(s))
    }
    return rows
  }, [base, filter, q, searched])

  if (!state) return null
  const me = state.user
  const detailNews = base.find((n) => n.id === detail)
  const canEditNews = (n: NewsDTO) =>
    (["admin", "specialist"].includes(me.role)) || (n.reporterId === me.id && n.status === "pending")
  const canDeleteNews = (n: NewsDTO) =>
    me.role === "admin" || (n.reporterId === me.id && (n.status === "pending" || n.status === "rejected"))

  const doDelete = async (id: number) => {
    const r = await deleteNews(id)
    if (r.ok) {
      toast({ title: "حذف شد", description: r.message })
      setDetail(null)
      setDeleting(null)
      if (scope === "all") loadAll()
      refresh()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  return (
    <div className="stage-enter flex flex-col gap-4 px-5 pb-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-black text-ink">اخبار خبرگزاری</h1>
        <button
          onClick={onQuickSubmit}
          className="flex items-center gap-1.5 rounded-full bg-neon px-4 py-2.5 text-[13px] font-bold text-neon-foreground btn-glow transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          ارسال خبر
        </button>
      </div>

      {/* انتخاب دامنه: همه اخبار سازمان / اخبار من */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-full border border-line bg-surface p-1">
          {([
            { key: "all", label: "همه اخبار", icon: <Globe2 className="h-3.5 w-3.5" /> },
            { key: "mine", label: "اخبار من", icon: <UserRound className="h-3.5 w-3.5" /> },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-colors",
                scope === s.key ? "bg-neon text-neon-foreground" : "text-ink-muted",
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
        {scope === "all" && (
          <button
            onClick={loadAll}
            disabled={loadingAll}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-neon disabled:opacity-50"
            aria-label="بارگذاری مجدد"
          >
            <RefreshCw className={cn("h-4 w-4", loadingAll && "animate-spin")} />
          </button>
        )}
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
          const count = f.key === "all" ? base.length : base.filter((n) => n.status === f.key).length
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
      {draftsView && scope === "mine" && state.drafts.length > 0 && (
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
            <p className="text-[13.5px] font-bold text-ink-muted">
              {loadingAll ? "در حال دریافت اخبار..." : searched ? "نتیجه‌ای برای جستجو پیدا نشد" : "خبری در این دسته نیست"}
            </p>
            {!searched && !loadingAll && <p className="text-[11.5px] text-ink-muted/70">با دکمه «ارسال خبر» اولین خبر را بفرستید</p>}
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
                  {n.reporterId === me.id ? "شما" : n.reporterName} · {n.code} · {jalali(n.createdAt)}
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
                  {detailNews.reporterId === me.id ? "شما" : detailNews.reporterName} · {detailNews.code} · {jalali(detailNews.createdAt, true)} · {DISTRICT_LABELS[detailNews.district] ?? detailNews.district}
                </DialogDescription>
              </DialogHeader>

              {detailNews.mediaUrl && detailNews.mediaType === "photo" && (
                <img src={detailNews.mediaUrl} alt="رسانه خبر" className="mt-3 max-h-64 w-full rounded-2xl border border-line object-cover" />
              )}
              {detailNews.mediaUrl && detailNews.mediaType === "video" && (
                <video src={detailNews.mediaUrl} controls className="mt-3 max-h-64 w-full rounded-2xl border border-line bg-black" />
              )}

              <p className="mt-1 whitespace-pre-line text-[13.5px] leading-7 text-ink/90">{detailNews.content}</p>

              {detailNews.status === "rejected" && (
                <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/8 p-4">
                  <p className="text-[12.5px] font-bold text-danger-soft">
                    دلیل رد: {REJECT_REASONS.find((r) => r.key === detailNews.rejectReason)?.label ?? "—"}
                  </p>
                  {detailNews.rejectNote && <p className="mt-1 text-[12px] leading-6 text-ink-muted">{detailNews.rejectNote}</p>}
                </div>
              )}

              <div className="mt-4">
                <p className="mb-2 text-[12.5px] font-black text-ink">چرخه بررسی خبر</p>
                <StageTimeline news={detailNews} />
              </div>

              {(canEditNews(detailNews) || canDeleteNews(detailNews)) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEditNews(detailNews) && (
                    <button
                      onClick={() => setEditing(detailNews.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-3 text-[12px] font-bold text-ink transition-colors hover:border-neon/40 hover:text-neon"
                    >
                      <PencilLine className="h-4 w-4" />
                      ویرایش متن
                    </button>
                  )}
                  {canDeleteNews(detailNews) && (
                    <button
                      onClick={() => setDeleting(detailNews.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/30 py-3 text-[12px] font-bold text-danger-soft transition-colors hover:bg-danger/8"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف خبر
                    </button>
                  )}
                </div>
              )}

              {detailNews.status === "rejected" && detailNews.reporterId === me.id && (
                <ResubmitButton newsId={detailNews.id} onDone={() => setDetail(null)} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ویرایش متن خبر */}
      <NewsEditDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        news={detailNews ? { id: detailNews.id, title: detailNews.title, content: detailNews.content } : null}
        onSaved={() => {
          setDetail(null)
          if (scope === "all") loadAll()
          refresh()
        }}
      />

      {/* تایید حذف */}
      <Dialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">حذف خبر</DialogTitle>
            <DialogDescription className="text-ink-muted">
              مطمئنید؟ خبر و تمام سوابق چرخه‌اش برای همیشه حذف می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setDeleting(null)} className="flex-1 rounded-full border border-line py-3 text-[13px] font-bold text-ink-muted">
              انصراف
            </button>
            <button
              onClick={() => deleting !== null && doDelete(deleting)}
              className="flex-1 rounded-full bg-danger py-3 text-[13px] font-bold text-white"
            >
              بله، حذف کن
            </button>
          </div>
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
      {busy ? <X className="hidden" /> : <Send className="h-4.5 w-4.5" />}
      ویرایش و ارسال مجدد (چرخه از مدیر حوزه)
    </button>
  )
}
