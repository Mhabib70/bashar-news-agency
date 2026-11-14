"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { Plus, PencilLine, X, FileText, Search, Trash2, RefreshCw, Globe2, UserRound, Send, CalendarDays, List, Eye, Heart, Trophy, Loader2 } from "lucide-react"
import { useApp, type NewsDTO } from "@/lib/store"
import { SectionHeader, StatusChip, StageDots, StageTimeline, StageChip } from "@/components/app/bits"
import { NewsEditDialog } from "@/components/app/news-edit"
import { ContentCalendar } from "@/components/app/content-calendar"
import { fa, faNum, durFmt, relTime, jalali } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, DISTRICT_LABELS, NEWS_CATEGORIES } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const FILTERS = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در بررسی" },
  { key: "approved", label: "تایید شده" },
  { key: "rejected", label: "رد شده" },
] as const

export type SubmitPreset = {
  category?: string
  title?: string
  content?: string
  draftId?: number | null
  challengeId?: number | null
  mediaType?: string
  mediaUrl?: string
  durationMin?: number
  preparedAt?: string | null
}

export function NewsScreen({
  onQuickSubmit,
  draftsView,
  initialNewsId,
  onConsumeNewsId,
}: {
  onQuickSubmit: (preset?: SubmitPreset) => void
  draftsView?: boolean
  initialNewsId?: number | null
  onConsumeNewsId?: () => void
}) {
  const { state, fetchAllNews, deleteNews, sendToEitaa, refresh, viewNews, setEitaaStats, praiseNews, deleteDraft } = useApp()
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
  // فیلترهای آرشیو (سروری — فقط دامنه «همه اخبار»)
  const [cat, setCat] = useState("all")
  const [period, setPeriod] = useState("all")
  const [serverQ, setServerQ] = useState("")
  // نمای تقویم محتوا
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  // ورود مستقیم به یک خبر (از اعلان یا بنر خبر هفته)
  const [consumedNewsId, setConsumedNewsId] = useState<number | null>(null)
  // ورود دستی واکنش‌های ایتا
  const [reactionsDraft, setReactionsDraft] = useState("")
  const [statsBusy, setStatsBusy] = useState(false)
  const searched = q.trim().length >= 2

  const openDetail = (id: number) => {
    setDetail(id)
    setReactionsDraft("")
    void viewNews(id) // شمارش بازدید
  }

  const loadAll = async () => {
    setLoadingAll(true)
    const rows = await fetchAllNews({ q: serverQ, category: cat, period })
    setAllNews(rows)
    setLoadingAll(false)
  }
  // بارگذاری فهرست «همه اخبار» با فیلترهای سروری (جستجو با تاخیر کوتاه)
  useEffect(() => {
    if (scope !== "all") return
    const t = setTimeout(() => setServerQ(q), 350)
    return () => clearTimeout(t)
  }, [q, scope])
  useEffect(() => {
    if (scope !== "all") return
    let cancelled = false
    void fetchAllNews({ q: serverQ, category: cat, period }).then((rows) => {
      if (!cancelled) setAllNews(rows)
    })
    return () => {
      cancelled = true
    }
  }, [scope, serverQ, cat, period])

  // باز کردن مستقیم خبر (از اعلان‌ها یا بنر خبر هفته)
  useEffect(() => {
    if (!initialNewsId || consumedNewsId === initialNewsId) return
    let cancelled = false
    void (async () => {
      const own = state?.news.find((n) => n.id === initialNewsId)
      const rows = own ? [] : await fetchAllNews()
      if (cancelled) return
      if (!own && rows.length) setAllNews(rows)
      setScope("all")
      setDetail(initialNewsId)
      setReactionsDraft("")
      void viewNews(initialNewsId)
      setConsumedNewsId(initialNewsId)
      onConsumeNewsId?.()
    })()
    return () => {
      cancelled = true
    }
  }, [initialNewsId])

  const base = scope === "all" ? allNews : (state?.news ?? [])
  const list = useMemo(() => {
    let rows = base
    if (filter !== "all") rows = rows.filter((n) => n.status === filter)
    // در دامنه «همه اخبار» جستجو سمت سرور انجام می‌شود؛ فقط «اخبار من» جستجوی محلی دارد
    if (scope === "mine" && searched) {
      const s = q.trim().toLowerCase()
      rows = rows.filter((n) => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s) || n.code.toLowerCase().includes(s))
    }
    return rows
  }, [base, filter, q, searched, scope])

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

  const doDeleteDraft = async (id: number) => {
    const r = await deleteDraft(id)
    if (r.ok) toast({ title: "حذف شد", description: r.message })
    else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const saveReactions = async (id: number) => {
    const n = Number(reactionsDraft.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))
    if (Number.isNaN(n) || n < 0) {
      toast({ title: "عدد نامعتبر", description: "تعداد واکنش‌ها را وارد کنید", variant: "destructive" })
      return
    }
    setStatsBusy(true)
    const r = await setEitaaStats(id, n)
    setStatsBusy(false)
    if (r.ok) {
      // به‌روزرسانی فهرست جاری تا عدد ثبت‌شده فوراً در دیالوگ دیده شود
      if (scope === "all") await loadAll()
      else await refresh()
      toast({ title: "ثبت شد", description: r.message })
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const doPraise = async (id: number) => {
    setEitaaBusy(true)
    const r = await praiseNews(id)
    setEitaaBusy(false)
    if (r.ok) {
      if (scope === "all") await loadAll()
      else await refresh()
      toast({ title: "تقدیر ارسال شد", description: r.message })
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  return (
    <div className="stage-enter flex flex-col gap-4 px-5 pb-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-black text-[var(--v3-ink)]">اخبار خبرگزاری</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
              viewMode === "calendar"
                ? "border-transparent bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white"
                : "border-[var(--v3-line)] bg-[var(--v3-card)] text-[var(--v3-ink-2)] hover:text-[var(--v3-azure)]",
            )}
            aria-label={viewMode === "list" ? "نمای تقویم محتوا" : "نمای فهرست"}
            title={viewMode === "list" ? "تقویم محتوا" : "فهرست اخبار"}
          >
            {viewMode === "list" ? <CalendarDays className="h-4.5 w-4.5" /> : <List className="h-4.5 w-4.5" />}
          </button>
          <button
            onClick={() => onQuickSubmit()}
            className="v3-btn flex items-center gap-1.5 px-4 py-2.5 text-[13px] transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            ارسال خبر
          </button>
        </div>
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
        {scope === "all" && viewMode === "list" && (
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

      {/* جستجوی اخبار (در نمای تقویم مخفی) */}
      {viewMode === "list" && (
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
      )}

      {/* فیلترهای آرشیو: دسته و بازه زمانی (فقط دامنه «همه اخبار» و نمای فهرست) */}
      {viewMode === "list" && scope === "all" && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
          {[{ key: "all", label: "همه دسته‌ها" }, ...NEWS_CATEGORIES.map((c) => ({ key: c.code, label: c.label }))].map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-colors",
                cat === c.key
                  ? "border-transparent bg-[var(--v3-ink)] text-[var(--v3-card)]"
                  : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
              )}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-0.5 w-px shrink-0 bg-[var(--v3-line)]" />
          {[{ key: "all", label: "هر زمان" }, { key: "week", label: "۷ روز" }, { key: "month", label: "۳۰ روز" }].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-colors",
                period === p.key
                  ? "border-[var(--v3-azure)] bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#93c5fd]"
                  : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* فیلترهای وضعیت */}
      {viewMode === "list" && (
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
      )}

      {/* پیش‌نویس‌ها — با ادامه ویرایش و حذف */}
      {draftsView && scope === "mine" && viewMode === "list" && state.drafts.length > 0 && (
        <div>
          <SectionHeader title="پیش‌نویس‌ها" />
          <div className="space-y-2">
            {state.drafts.map((d) => (
              <div key={d.id} className="flex w-full items-center gap-1 rounded-3xl border border-dashed border-[var(--v3-line)] bg-[var(--v3-card-2)]/60 p-2.5 transition-colors hover:border-[var(--v3-azure)]/40">
                <button
                  onClick={() =>
                    onQuickSubmit({
                      draftId: d.id,
                      category: d.category,
                      title: d.title,
                      content: d.content,
                      mediaType: d.mediaType,
                      mediaUrl: d.mediaUrl,
                      durationMin: d.durationMin,
                      preparedAt: d.preparedAt,
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-full p-1 text-right"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--v3-line)] bg-[var(--v3-card)] text-[var(--v3-ink-2)]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-[var(--v3-ink)]">{d.title || "بدون عنوان"}</span>
                    <span className="block text-[11px] text-[var(--v3-ink-2)]">{CATEGORY_LABELS[d.category]} · ذخیره {relTime(d.savedAt)}{d.mediaUrl ? " · با رسانه" : ""}</span>
                  </span>
                  <PencilLine className="h-4 w-4 shrink-0 text-[var(--v3-ink-2)]" />
                </button>
                <button
                  onClick={() => doDeleteDraft(d.id)}
                  className="mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--v3-ink-2)]/70 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/12 dark:hover:text-red-400"
                  aria-label="حذف پیش‌نویس"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نمای تقویم محتوا */}
      {viewMode === "calendar" && <ContentCalendar mine={scope === "mine"} onOpenNews={openDetail} />}

      {/* لیست اخبار */}
      {viewMode === "list" && (
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
          <button key={n.id} onClick={() => openDetail(n.id)} className="v3-card w-full p-4 text-right transition-transform hover:scale-[1.01]">
            <div className="flex items-start gap-3">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px]">
                <Image src={`/img/cat-${n.category === "none" ? "local" : n.category}.png`} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 rounded-full bg-[var(--v3-card-2)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--v3-ink-2)]">{CATEGORY_LABELS[n.category]}</span>
                    {(n as { isWeekFeatured?: boolean }).isWeekFeatured && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--v3-amber-soft)] px-2 py-0.5 text-[9.5px] font-black text-amber-600 dark:text-amber-400">
                        <Trophy className="h-2.5 w-2.5" />
                        خبر هفته
                      </span>
                    )}
                  </span>
                  <StatusChip status={n.status} small />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13.5px] font-bold leading-6 text-[var(--v3-ink)]">{n.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10.5px] text-[var(--v3-ink-2)]">
                  <span>{n.reporterId === me.id ? "شما" : n.reporterName} · {n.code} · {jalali(n.createdAt)}</span>
                  <span className="flex items-center gap-2.5">
                    {n.views > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{faNum(n.views)}</span>}
                    {n.eitaaReactions > 0 && <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{faNum(n.eitaaReactions)}</span>}
                    {n.mediaUrl && n.mediaType === "photo" ? " · 📷" : n.mediaUrl && n.mediaType === "video" ? " · 🎬" : ""}
                  </span>
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
      )}

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
                <>
                  <button
                    onClick={() => doEitaa(detailNews.id)}
                    disabled={eitaaBusy}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground btn-glow disabled:opacity-50"
                  >
                    <Send className="h-4.5 w-4.5" />
                    {eitaaBusy ? "در حال ارسال به ایتا..." : "📨 ارسال به کانال ایتا"}
                  </button>
                  {/* آمار ایتا + تقدیر خبرنگار — بستن حلقه اثرگذاری */}
                  <div className="mt-3 rounded-[16px] border border-[var(--v3-line)] bg-[var(--v3-card-2)]/60 p-3">
                    <p className="flex items-center gap-1.5 text-[11.5px] font-black text-[var(--v3-ink)]">
                      <Heart className="h-3.5 w-3.5 text-red-500" />
                      واکنش‌های کانال ایتا
                      <span className="mr-auto text-[11px] font-bold text-[var(--v3-ink-2)]">ثبت‌شده: {faNum(detailNews.eitaaReactions)}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={reactionsDraft}
                        onChange={(e) => setReactionsDraft(e.target.value.replace(/[^۰-۹\d]/g, ""))}
                        inputMode="numeric"
                        dir="ltr"
                        placeholder="تعداد واکنش از کانال"
                        className="v3-input flex-1 rounded-xl text-center text-[13px]"
                      />
                      <button onClick={() => saveReactions(detailNews.id)} disabled={statsBusy} className="v3-btn shrink-0 px-4 py-2.5 text-[12px] disabled:opacity-50">
                        {statsBusy ? "..." : "ثبت"}
                      </button>
                    </div>
                    {me.role === "admin" && (
                      <button
                        onClick={() => doPraise(detailNews.id)}
                        disabled={eitaaBusy}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--v3-amber)]/40 bg-[var(--v3-amber-soft)] py-2.5 text-[12px] font-bold text-amber-600 transition-colors hover:bg-[var(--v3-amber)]/25 dark:text-amber-400 disabled:opacity-50"
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        تقدیر خبرنگار در کانال ایتا
                      </button>
                    )}
                  </div>
                </>
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
