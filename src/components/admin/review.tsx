"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, X, ClipboardList, Inbox, ChevronDown, RefreshCw, Hourglass, Filter, Pencil, Search, Trash2, Eye, Heart } from "lucide-react"
import { useApp, type NewsDTO } from "@/lib/store"
import { fa, faNum, relTime, durFmt, jalali } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, reviewStageLabel, DISTRICT_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { NewsEditDialog } from "@/components/app/news-edit"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

// مدیریت کامل اخبار در پنل ادمین: «همهٔ اخبار» با جستجوی سروری (تیتر/متن/کد/خبرنگار)
// + فیلتر وضعیت و حوزه — نه فقط صف در انتظار. تایید/رد روی خبرهای در بررسی،
// ویرایش متن و حذف برای همهٔ اخبار (اختیار سردبیری ادمین کل).
const STATUS_FILTERS = [
  { key: "all", label: "همه", cls: "" },
  { key: "pending", label: "در بررسی", cls: "text-warn" },
  { key: "approved", label: "تاییدشده", cls: "text-neon" },
  { key: "rejected", label: "ردشده", cls: "text-danger-soft" },
] as const

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending: { label: "در بررسی", cls: "bg-warn/12 text-warn border-warn/30" },
  approved: { label: "تاییدشده", cls: "bg-neon/12 text-neon border-neon/30" },
  rejected: { label: "ردشده", cls: "bg-danger/10 text-danger-soft border-danger/30" },
}

export function AdminReviewSection() {
  const { fetchAllNews, reviewNews, deleteNews, refresh } = useApp()
  const { toast } = useToast()
  const [rows, setRows] = useState<NewsDTO[] | null>(null)
  const [status, setStatus] = useState<string>("all")
  const [district, setDistrict] = useState("all")
  const [q, setQ] = useState("")
  const [serverQ, setServerQ] = useState("")
  const [expanded, setExpanded] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<NewsDTO | null>(null)
  const [deleting, setDeleting] = useState<NewsDTO | null>(null)
  const [reason, setReason] = useState("insufficient")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)

  // جستجو با تاخیر کوتاه (سروری)
  useEffect(() => {
    const t = setTimeout(() => setServerQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  const load = async () => {
    setRows(null)
    const data = await fetchAllNews({ q: serverQ, status: status === "all" ? undefined : status })
    setRows(data)
  }
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await fetchAllNews({ q: serverQ, status: status === "all" ? undefined : status })
      if (!cancelled) setRows(data)
    })()
    return () => {
      cancelled = true
    }
  }, [serverQ, status])

  // فیلتر حوزه سمت کلاینت (سرور حوزه را فیلتر نمی‌کند)
  const list = useMemo(
    () => (rows ?? []).filter((n) => district === "all" || n.district === district),
    [rows, district],
  )

  const act = async (newsId: number, action: "approve" | "reject", r?: string, n?: string) => {
    setBusy(newsId)
    const res = await reviewNews(newsId, action, r, n)
    setBusy(null)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      setRejecting(null)
      setNote("")
      await load()
      refresh()
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  const doDelete = async (newsId: number) => {
    setBusy(newsId)
    const res = await deleteNews(newsId)
    setBusy(null)
    if (res.ok) {
      toast({ title: "حذف شد", description: res.message })
      setDeleting(null)
      await load()
      refresh()
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  const editingNews = list.find((n) => n.id === editing) ?? null

  return (
    <div className="space-y-5">
      {/* جستجو + فیلترها */}
      <div className="rounded-[24px] border border-outline-variant/40 bg-surface p-4">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در تیتر، متن، کد پیگیری یا خبرنگار..."
            className="rounded-2xl border-outline-variant/40 bg-surface-container-low pr-10 text-on-surface placeholder:text-on-surface-variant/60"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-on-surface-variant">
            <Filter className="h-3.5 w-3.5" />
            وضعیت:
          </span>
          {STATUS_FILTERS.map((s) => {
            const count = s.key === "all" ? list.length : list.filter((n) => n.status === s.key).length
            return (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11.5px] font-bold transition-colors",
                  status === s.key ? "border-neon bg-neon text-neon-foreground" : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:text-on-surface",
                )}
              >
                {s.label}
                <span className={cn("rounded-full px-1.5 text-[9.5px]", status === s.key ? "bg-black/15" : "bg-surface")}>{fa(count)}</span>
              </button>
            )
          })}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="mr-auto rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-[11.5px] font-bold text-on-surface"
          >
            <option value="all">همه حوزه‌ها</option>
            {Object.entries(DISTRICT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low text-on-surface-variant transition-colors hover:text-neon"
            aria-label="بارگذاری مجدد"
          >
            <RefreshCw className={cn("h-4 w-4", rows === null && "animate-spin")} />
          </button>
        </div>
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-on-surface-variant">
          <RefreshCw className="h-4 w-4 animate-spin" />
          در حال دریافت اخبار...
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-outline-variant/40 py-16 text-center">
          <Inbox className="h-10 w-10 text-neon/60" />
          <p className="text-[15px] font-bold text-on-surface">{serverQ || district !== "all" ? "با این جستجو/فیلترها خبری یافت نشد" : "هنوز خبری ثبت نشده است"}</p>
          <p className="max-w-[280px] text-[12px] leading-5 text-on-surface-variant">
            عبارت جستجو یا فیلتر وضعیت/حوزه را تغییر دهید.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => {
            const open = expanded === n.id
            const chip = STATUS_CHIP[n.status] ?? STATUS_CHIP.pending
            return (
              <div key={n.id} className="rounded-[26px] border border-outline-variant/40 bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", chip.cls)}>{chip.label}</span>
                    <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">{CATEGORY_LABELS[n.category] ?? n.category}</span>
                    {n.status === "pending" && (
                      <span className="flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-[10px] font-bold text-warn">
                        <Hourglass className="h-3 w-3" />
                        {reviewStageLabel(n.reviewStage)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">
                    <span dir="ltr">{n.code}</span> · {relTime(n.createdAt)} · {durFmt(n.durationMin)}
                  </span>
                </div>

                <p className="mt-2.5 text-[15px] font-bold leading-7 text-on-surface">{n.title}</p>

                {n.mediaUrl && n.mediaType === "photo" && (
                  <img src={n.mediaUrl} alt="رسانه خبر" className="mt-3 max-h-56 w-full rounded-2xl border border-outline-variant/40 object-cover" />
                )}
                {n.mediaUrl && n.mediaType === "video" && (
                  <video src={n.mediaUrl} controls className="mt-3 max-h-56 w-full rounded-2xl border border-outline-variant/40 bg-black" />
                )}

                <p className={cn("mt-2 text-[12.5px] leading-6 text-on-surface-variant", !open && "line-clamp-2")}>{n.content}</p>
                <button onClick={() => setExpanded(open ? null : n.id)} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-neon">
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                  {open ? "بستن متن کامل" : "متن کامل خبر"}
                </button>

                {n.status === "rejected" && (
                  <p className="mt-2 rounded-2xl border border-danger/25 bg-danger/6 px-3.5 py-2.5 text-[11px] leading-5 text-danger-soft">
                    دلیل رد: {REJECT_REASONS.find((r) => r.key === n.rejectReason)?.label ?? n.rejectReason}
                    {n.rejectNote ? ` — ${n.rejectNote}` : ""}
                  </p>
                )}
                {(n.views > 0 || n.eitaaReactions > 0) && (
                  <p className="mt-2 flex items-center gap-3 text-[10.5px] font-bold text-on-surface-variant">
                    {n.views > 0 && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {faNum(n.views)} بازدید</span>}
                    {n.eitaaReactions > 0 && <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {faNum(n.eitaaReactions)} واکنش ایتا</span>}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2 border-t border-outline-variant/40 pt-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon/12 text-[11px] font-black text-neon">
                    {n.reporterName.slice(0, 1)}
                  </span>
                  <span className="flex-1 text-[11px] text-on-surface-variant">
                    {n.reporterName} · {DISTRICT_LABELS[n.district] ?? n.district} · {jalali(n.createdAt)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {n.status === "pending" ? (
                    <>
                      <button
                        onClick={() => act(n.id, "approve")}
                        disabled={busy !== null}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neon py-3 text-[13px] font-bold text-neon-foreground transition-transform hover:scale-[1.01] disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {busy === n.id ? "..." : "تایید خبر"}
                      </button>
                      <button
                        onClick={() => { setRejecting(n); setReason("insufficient"); setNote("") }}
                        disabled={busy !== null}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/40 py-3 text-[13px] font-bold text-danger-soft transition-colors hover:bg-danger/8 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        رد با دلیل
                      </button>
                    </>
                  ) : (
                    <span className="flex-1 text-[11px] text-on-surface-variant/70">این خبر تصمیم نهایی گرفته است — فقط قابل ویرایش یا حذف.</span>
                  )}
                  <button
                    onClick={() => setEditing(n.id)}
                    disabled={busy !== null}
                    className="flex items-center justify-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface px-4 py-3 text-[12.5px] font-bold text-on-surface transition-colors hover:border-neon/40 hover:text-neon disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    ویرایش
                  </button>
                  <button
                    onClick={() => setDeleting(n)}
                    disabled={busy !== null}
                    className="flex items-center justify-center gap-1.5 rounded-full border border-danger/40 px-4 py-3 text-[12.5px] font-bold text-danger-soft transition-colors hover:bg-danger/8 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* دیالوگ رد */}
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent className="rounded-[28px] border-outline-variant/40 bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-on-surface">
              <ClipboardList className="h-5 w-5 text-danger" />
              رد خبر با دلیل
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
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
                  reason === r.key ? "border-danger/50 bg-danger/8" : "border-outline-variant/40 bg-surface hover:bg-surface-container-low",
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", reason === r.key ? "border-danger bg-danger text-white" : "border-outline-variant/40")}>
                  {reason === r.key && <Check className="h-3 w-3" />}
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-on-surface">{r.label}</span>
                  <span className="block text-[11px] text-on-surface-variant">{r.hint}</span>
                </span>
              </button>
            ))}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="توضیح تکمیلی برای خبرنگار (اختیاری)" className="rounded-2xl border-outline-variant/40 bg-surface text-on-surface leading-6 placeholder:text-on-surface-variant/50" />
          </div>
          <button
            onClick={() => rejecting !== null && act(rejecting.id, "reject", reason, note)}
            disabled={busy !== null}
            className="mt-4 w-full rounded-full bg-danger py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy !== null ? "..." : "ثبت رد خبر"}
          </button>
        </DialogContent>
      </Dialog>

      {/* دیالوگ حذف خبر */}
      <Dialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="rounded-[28px] border-outline-variant/40 bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-on-surface">
              <Trash2 className="h-5 w-5 text-danger" />
              حذف قطعی خبر
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              این عملیات غیرقابل بازگشت است و خبر از آرشیو سازمان پاک می‌شود.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <p className="mt-3 rounded-2xl border border-outline-variant/40 bg-surface p-3.5 text-[12.5px] font-bold leading-6 text-on-surface">
              «{deleting.title}» <span className="text-on-surface-variant" dir="ltr">({deleting.code})</span>
            </p>
          )}
          <button
            onClick={() => deleting !== null && doDelete(deleting.id)}
            disabled={busy !== null}
            className="mt-4 w-full rounded-full bg-danger py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy !== null ? "..." : "حذف کن"}
          </button>
        </DialogContent>
      </Dialog>

      {/* ویرایش متن خبر — اختیار سردبیری */}
      <NewsEditDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        news={editingNews ? { id: editingNews.id, title: editingNews.title, content: editingNews.content } : null}
        onSaved={load}
      />
    </div>
  )
}
