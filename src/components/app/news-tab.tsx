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
  const { state, fetchAllNews, deleteNews, sendToEitaa, refresh } = useApp()
  const { toast } = useToast()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all")
  const [detail, setDetail] = useState<number | null>(null)
  const [q, setQ] = useState("")
  const [scope, setScope] = useState<"all" | "mine">("all")
  const [allNews, setAllNews] = useState<NewsDTO[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [eitaaBusy, setEitaaBusy] = useState(false)
  const searched = q.trim().length >= 2

  const loadAll = async () => {
    setLoadingAll(true)
    const rows = await fetchAllNews()
    setAllNews(rows)
    setLoadingAll(false)
  }
  // بارگذاری فهرست «همه اخبار» هنگام ورود به این حالت.
  // واکشی داخل continuation انجام می‌شود تا setState همگام در بدنهٔ effect رخ ندهد
  // (قانون react-hooks/set-state-in-effect) و رندر آبشاری ایجاد نشود.
  useEffect(() => {
    if (scope !== "all") return
    let cancelled = false
    void fetchAllNews().then((rows) => {
      if (!cancelled) setAllNews(rows)
    })
    return () => {
      cancelled = true
    }
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

  const doEitaa = async (id: number) => {
    if (eitaaBusy) return
    setEitaaBusy(true)
    const r = await sendToEitaa(id)
    setEitaaBusy(false)
    if (r.ok) {
      toast({ title: "ارسال شد", description: r.message })
      setDetail(null)
      if (scope === "all") loadAll()
      refresh()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

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
        <h1 className="text-[22px] font-black text-[var(--v3-ink)]">اخبار خبرگزاری</h1>
        <button
          onClick={onQuickSubmit}
          className="v3-btn flex items-center gap-1.5 px-4 py-2.5 text-[13px] transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          ارسال خبر
        </button>
      </div>

      {/* انتخاب دامنه: همه اخبار سازمان / اخبار من */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-full border border-[var(--v3-line)] bg-[var(--v3-card-2)] p-1">
          {([
            { key: "all", label: "همه اخبار", icon: <Globe2 className="h-3.5 w-3.5" /> },
            { key: "mine", label: "اخبار من", icon: <UserRound className="h-3.5 w-3.5" /> },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-colors",
                scope === s.key
                  ? "bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.6)]"
                  : "text-[var(--v3-ink-2)]",
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] text-[var(--v3-ink-2)] transition-colors hover:text-[var(--v3-azure)] disabled:opacity-50"
            aria-label="بارگذاری مجدد"
          >
            <RefreshCw className={cn("h-4 w-4", loadingAll && "animate-spin")} />
          </button>
        )}
      </div>

      {/* جستجوی اخبار */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--v3-ink-2)]/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو در تیتر، متن یا کد پیگیری..."
          className="v3-input w-full rounded-full py-3 pl-4 pr-11 text-[12.5px] outline-none transition-colors placeholder:text-[var(--v3-ink-2)]/50"
        />
        {searched && (
          <button onClick={() => setQ("")} className="absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)]">
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
                filter === f.key
                  ? "border-transparent bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.6)]"
                  : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
              )}
            >
              {f.label} {count > 0 && <span className={cn("mr-1", filter === f.key ? "opacity-70" : "text-[var(--v3-ink-2)]/70")}>{fa(count)}</span>}
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
              <button key={d.id} onClick={onQuickSubmit} className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-[var(--v3-line)] bg-[var(--v3-card-2)]/60 p-3.5 text-right transition-colors hover:border-[var(--v3-azure)]/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] text-[var(--v3-ink-2)]">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-[var(--v3-ink)]">{d.title || "بدون عنوان"}</span>
                  <span className="block text-[11px] text-[var(--v3-ink-2)]">{CATEGORY_LABELS[d.category]} · ذخیره {relTime(d.savedAt)}</span>
                </span>
                <PencilLine className="h-4 w-4 shrink-0 text-[var(--v3-ink-2)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* لیست اخبار */}
      <div className="space-y-2.5">
        {list.length === 0 && (
          <div className="v3-card flex flex-col items-center gap-2 border-dashed py-12 text-center">
            <FileText className="h-8 w-8 text-[var(--v3-ink-2)]/50" />
            <p className="text-[13.5px] font-bold text-[var(--v3-ink-2)]">
              {loadingAll ? "در حال دریافت اخبار..." : searched ? "نتیجه‌ای برای جستجو پیدا نشد" : "خبری در این دسته نیست"}
            </p>
            {!searched && !loadingAll && <p className="text-[11.5px] text-[var(--v3-ink-2)]/70">با دکمه «ارسال خبر» اولین خبر را بفرستید</p>}
          </div>
        )}
        {list.map((n) => (
          <button key={n.id} onClick={() => setDetail(n.id)} className="v3-card w-full p-4 text-right transition-transform hover:scale-[1.01]">
            <div className="flex items-start gap-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px]">
                <Image src={`/img/cat-${n.category === "none" ? "local" : n.category}.png`} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[var(--v3-card-2)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--v3-ink-2)]">{CATEGORY_LABELS[n.category]}</span>
                  <StatusChip status={n.status} small />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13.5px] font-bold leading-6 text-[var(--v3-ink)]">{n.title}</p>
                <p className="mt-1 text-[10.5px] text-[var(--v3-ink-2)]">
                  {n.reporterId === me.id ? "شما" : n.reporterName} · {n.code} · {jalali(n.createdAt)}
                  {n.mediaUrl && n.mediaType === "photo" ? " · 📷" : n.mediaUrl && n.mediaType === "video" ? " · 🎬" : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--v3-line)] pt-3">
              <StageDots status={n.status} stage={n.reviewStage} />
              <StageChip status={n.status} stage={n.reviewStage} />
            </div>
          </button>
        ))}
      </div>

      {/* جزئیات خبر */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[84dvh] overflow-y-auto nice-scroll rounded-[24px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5">
          {detailNews && (
            <>
              <DialogHeader className="text-right">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--v3-card-2)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--v3-ink-2)]">{CATEGORY_LABELS[detailNews.category]}</span>
                  <StatusChip status={detailNews.status} small />
                </div>
                <DialogTitle className="text-right text-[16px] leading-7 text-[var(--v3-ink)]">{detailNews.title}</DialogTitle>
                <DialogDescription className="text-[11px] text-[var(--v3-ink-2)]">
                  {detailNews.reporterId === me.id ? "شما" : detailNews.reporterName} · {detailNews.code} · {jalali(detailNews.createdAt, true)} · {DISTRICT_LABELS[detailNews.district] ?? detailNews.district}
                </DialogDescription>
              </DialogHeader>

              {detailNews.mediaUrl && detailNews.mediaType === "photo" && (
                <img src={detailNews.mediaUrl} alt="رسانه خبر" className="mt-3 max-h-64 w-full rounded-2xl border border-[var(--v3-line)] object-cover" />
              )}
              {detailNews.mediaUrl && detailNews.mediaType === "video" && (
                <video src={detailNews.mediaUrl} controls className="mt-3 max-h-64 w-full rounded-2xl border border-[var(--v3-line)] bg-black" />
              )}

              <p className="mt-1 whitespace-pre-line text-[13.5px] leading-7 text-[var(--v3-ink)]/90">{detailNews.content}</p>

              {detailNews.status === "rejected" && (
                <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-50 p-4 dark:bg-red-500/12">
                  <p className="text-[12.5px] font-bold text-red-600 dark:text-red-400">
                    دلیل رد: {REJECT_REASONS.find((r) => r.key === detailNews.rejectReason)?.label ?? "—"}
                  </p>
                  {detailNews.rejectNote && <p className="mt-1 text-[12px] leading-6 text-[var(--v3-ink-2)]">{detailNews.rejectNote}</p>}
                </div>
              )}

              <div className="mt-4">
                <p className="mb-2 text-[12.5px] font-black text-[var(--v3-ink)]">چرخه بررسی خبر</p>
                <StageTimeline news={detailNews} />
              </div>

              {(canEditNews(detailNews) || canDeleteNews(detailNews)) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEditNews(detailNews) && (
                    <button
                      onClick={() => setEditing(detailNews.id)}
                      className="v3-btn-ghost flex flex-1 items-center justify-center gap-1.5 py-3 text-[12px]"
                    >
                      <PencilLine className="h-4 w-4" />
                      ویرایش متن
                    </button>
                  )}
                  {canDeleteNews(detailNews) && (
                    <button
                      onClick={() => setDeleting(detailNews.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-500/30 py-3 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/25 dark:text-red-400 dark:hover:bg-red-500/12"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف خبر
                    </button>
                  )}
                </div>
              )}

              {detailNews.status === "approved" && (me.role === "admin" || me.canSendEitaa) && (
                <button
                  onClick={() => doEitaa(detailNews.id)}
                  disabled={eitaaBusy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground btn-glow disabled:opacity-50"
                >
                  <Send className="h-4.5 w-4.5" />
                  {eitaaBusy ? "در حال ارسال به ایتا..." : "📨 ارسال به کانال ایتا"}
                </button>
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
        <DialogContent className="rounded-[24px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-[var(--v3-ink)]">حذف خبر</DialogTitle>
            <DialogDescription className="text-[var(--v3-ink-2)]">
              مطمئنید؟ خبر و تمام سوابق چرخه‌اش برای همیشه حذف می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setDeleting(null)} className="flex-1 rounded-[14px] border border-[var(--v3-line)] py-3 text-[13px] font-bold text-[var(--v3-ink-2)] transition-colors hover:bg-[var(--v3-card-2)]">
              انصراف
            </button>
            <button
              onClick={() => deleting !== null && doDelete(deleting)}
              className="flex-1 rounded-[14px] bg-red-50 py-3 text-[13px] font-black text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/12 dark:text-red-400 dark:hover:bg-red-500/20"
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
      className="v3-btn mt-3 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-50"
    >
      {busy ? <X className="hidden" /> : <Send className="h-4.5 w-4.5" />}
      ویرایش و ارسال مجدد (چرخه از مدیر حوزه)
    </button>
  )
}
