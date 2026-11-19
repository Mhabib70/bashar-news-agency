"use client"

import { useState } from "react"
import { Check, X, ClipboardCheck, Inbox, AlertTriangle, Eye, ChevronLeft, Rocket, ArrowUpCircle, Pencil, Timer, ShieldCheck, Archive, FileWarning, Loader2 } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, faNum, relTime, durFmt } from "@/lib/format"
import { CATEGORY_LABELS, REJECT_REASONS, reviewStageLabel, DISTRICT_LABELS, ROLE_STAGE, REVIEW_STAGES } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { StageTimeline, StageChip, Avatar } from "@/components/app/bits"
import { NewsEditDialog } from "@/components/app/news-edit"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { NewsDTO } from "@/lib/server/state"

type CartableTab = "waiting" | "corrections" | "approved" | "archive"

export function ReviewScreen() {
  const { state, fetchAllNews } = useApp()
  const { toast } = useToast()
  const [rejecting, setRejecting] = useState<number | null>(null)
  const [reason, setReason] = useState("insufficient")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<number | null>(null)
  const [detail, setDetail] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [tab, setTab] = useState<CartableTab>("waiting")
  // کش اخبار سایر تب‌ها — یک‌بار بارگذاری و نگه‌داری
  const [allNews, setAllNews] = useState<NewsDTO[] | null>(null)
  const [allLoading, setAllLoading] = useState(false)
  const { reviewNews, refresh } = useApp()

  if (!state) return null
  const queue = state.reviewQueue
  const role = state.user.role
  const stageKey = ROLE_STAGE[role]
  const stageIdx = REVIEW_STAGES.findIndex((s) => s.key === stageKey)
  const isAdmin = role === "admin"
  const staff = state.staffCounts

  // هشدار چرخه: مرحله‌ای که خبر در آن منتظر است نیروی فعال ندارد
  const stageHasStaff = (k: string) =>
    k === "district" ? staff.district > 0 : k === "specialist" ? staff.specialist > 0 : staff.admin > 0
  const stuckStages = Array.from(new Set(queue.filter((n) => n.status === "pending" && !stageHasStaff(n.reviewStage)).map((n) => n.reviewStage)))

  const loadAllNews = async () => {
    if (allNews) return
    setAllLoading(true)
    try {
      const rows = await fetchAllNews({ status: "all" })
      setAllNews(rows ?? [])
    } catch { /* شبکه */ }
    setAllLoading(false)
  }

  const selectTab = (t: CartableTab) => {
    setTab(t)
    if (t !== "waiting") void loadAllNews()
  }

  const act = async (newsId: number, action: "approve" | "reject", r?: string, n?: string, mode?: "advance" | "final") => {
    setBusy(newsId)
    const res = await reviewNews(newsId, action, r, n, mode)
    setBusy(null)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      setRejecting(null)
      setNote("")
      setDetail(null)
      setAllNews(null) // کش تب‌های دیگر به‌روزرسانی شود
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  // لیست فعال هر تب
  const tabList: NewsDTO[] =
    tab === "waiting"
      ? queue
      : allLoading || !allNews
        ? []
        : tab === "corrections"
          ? allNews.filter((n) => n.status === "rejected" && (n.reviewedBy === state.user.id || isAdmin))
          : tab === "approved"
            ? allNews.filter((n) => n.status === "approved")
            : allNews.filter((n) => n.status === "rejected")

  const correctionsCount = tab === "waiting" ? "—" : allNews?.filter((n) => n.status === "rejected").length
  const avgWait = isAdmin ? (state as unknown as { adminAvgWait?: number }).adminAvgWait : undefined

  const detailNews = queue.find((n) => n.id === detail) ?? (detail !== null && allNews ? allNews.find((n) => n.id === detail) : undefined)
  const canEditNews = isAdmin || role === "specialist"

  const TABS: { key: CartableTab; label: string; count: string }[] = [
    { key: "waiting", label: "در انتظار من", count: fa(queue.length) },
    { key: "corrections", label: "اصلاحیه", count: correctionsCount === "—" ? "—" : faNum(correctionsCount ?? 0) },
    { key: "approved", label: "تایید شده", count: allNews ? faNum(allNews.filter((n) => n.status === "approved").length) : "…" },
    { key: "archive", label: "بایگانی", count: allNews ? faNum(allNews.filter((n) => n.status === "rejected").length) : "…" },
  ]

  return (
    <div className="stage-enter mx-auto flex w-full flex-col gap-space-md px-3 pb-4 pt-4 lg:max-w-[680px] lg:px-0 lg:pt-2">
      {/* ===== سربرگ کارتابل ===== */}
      <div className="flex items-start justify-between px-1">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-[19px] font-extrabold tracking-tight text-on-surface">کارتابل نظارت و ارزیابی</h1>
          <p className="mt-1 text-[11.5px] font-medium text-on-surface-variant">
            بررسی اصالت، راستی‌آزمایی مستندات و تایید چرخه انتشار
            {stageIdx >= 0 && ` · مرحله ${fa(stageIdx + 1)}: ${reviewStageLabel(stageKey)}`}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-[0_8px_20px_-8px_rgba(157,66,58,0.55)]">
          <ClipboardCheck className="h-5 w-5" />
        </span>
      </div>

      {/* ===== KPI های کارتابل ===== */}
      <div className="grid grid-cols-3 gap-2.5">
        <KpiCard icon={<Timer className="h-4.5 w-4.5" />} label="در انتظار تصمیم" value={fa(queue.length)} tone="warn" />
        <KpiCard icon={<ShieldCheck className="h-4.5 w-4.5" />} label="رسیدگی‌شده من" value={allNews ? faNum(allNews.filter((n) => n.status !== "pending" && n.reviewedBy === state.user.id).length) : "…"} tone="tertiary" />
        <KpiCard icon={<Archive className="h-4.5 w-4.5" />} label="بایگانی کل" value={allNews ? faNum(allNews.filter((n) => n.status === "rejected").length) : "…"} tone="plain" />
      </div>

      {/* ===== تب‌ها ===== */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-full bg-surface-container-low p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-colors",
              tab === t.key ? "bg-primary text-on-primary shadow-[0_4px_12px_-4px_rgba(157,66,58,0.5)]" : "text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9.5px]", tab === t.key ? "bg-white/25" : "bg-surface-container-highest/70")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ===== نقشه چرخه ===== */}
      {tab === "waiting" && (
        <div className="v3-card p-3.5">
          <div className="flex items-center justify-between gap-2">
            {REVIEW_STAGES.map((s, i) => {
              const count = queue.filter((n) => n.status === "pending" && n.reviewStage === s.key).length
              const hasStaff = stageHasStaff(s.key)
              const isMine = s.key === stageKey
              return (
                <div key={s.key} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex-1 rounded-2xl border px-2.5 py-2.5 text-center transition-colors",
                      isMine ? "border-primary/45 bg-primary-fixed/40" : "border-line bg-surface-2/60",
                    )}
                  >
                    <p className="text-[10.5px] font-bold text-ink-muted">
                      {fa(i + 1)}. {s.label}
                    </p>
                    <p className={cn("v3-num mt-0.5 text-[16px] leading-6", count > 0 ? "text-warn" : "text-ink-muted/50")}>{fa(count)}</p>
                    <p className={cn("text-[9px] font-bold", hasStaff ? "text-tertiary" : "text-danger")}>
                      {hasStaff ? `${fa(s.key === "district" ? staff.district : s.key === "specialist" ? staff.specialist : staff.admin)} نیرو` : "بدون نیرو!"}
                    </p>
                  </div>
                  {i < 2 && <ChevronLeft className="h-4 w-4 shrink-0 text-line" />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== هشدار توقف چرخه ===== */}
      {tab === "waiting" && stuckStages.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warn" />
          <div className="text-[11.5px] leading-5 text-warn">
            <p className="font-black">چرخه در مرحله «{stuckStages.map(reviewStageLabel).join("، ")}» متوقف است</p>
            <p className="mt-0.5 opacity-80">
              هیچ نیروی فعالی برای این مرحله وجود ندارد. از پنل مدیریت، یک کاربر را به این نقش منصوب کنید یا خودتان تصمیم بگیرید.
            </p>
          </div>
        </div>
      )}

      {/* ===== لیست اخبار تب فعال ===== */}
      {(allLoading || (tab !== "waiting" && !allNews)) ? (
        <div className="flex flex-col items-center gap-2 py-14 text-[12px] text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          در حال دریافت اخبار...
        </div>
      ) : tabList.length === 0 ? (
        <div className="v3-card flex flex-col items-center gap-2 border-dashed py-14 text-center">
          <Inbox className="h-9 w-9 text-primary/50" />
          <p className="text-[14px] font-bold text-ink">
            {tab === "waiting" ? "صف بررسی خالی است" : tab === "corrections" ? "اصلاحیه‌ای وجود ندارد" : tab === "approved" ? "هنوز خبری منتشر نشده" : "بایگانی خالی است"}
          </p>
          <p className="max-w-[240px] text-[11.5px] leading-5 text-ink-muted">
            {tab === "waiting" ? "همه خبرهای رسیده به مرحله شما رسیدگی شده‌اند. کارت عالی!" : "با انتخاب این بخش، اخبار مربوطه همین‌جا نمایش داده می‌شود."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tabList.slice(0, 30).map((n) => (
            <div key={n.id} className="rounded-3xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)]">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant">{CATEGORY_LABELS[n.category]}</span>
                <span className="text-[10px] font-medium text-outline">
                  {n.code} · {relTime(n.createdAt)} · {durFmt(n.durationMin)}
                </span>
              </div>
              <p className="mt-2 text-[14px] font-bold leading-6 text-on-surface">{n.title}</p>
              {n.lead && <p className="mt-1 line-clamp-2 text-[11.5px] font-medium leading-5 text-tertiary">{n.lead}</p>}
              {n.mediaUrl && n.mediaType === "photo" && (
                <img src={n.mediaUrl} alt="رسانه خبر" className="mt-2.5 max-h-44 w-full rounded-2xl border border-line object-cover" />
              )}
              {n.mediaUrl && n.mediaType === "video" && (
                <video src={n.mediaUrl} controls className="mt-2.5 max-h-44 w-full rounded-2xl border border-line bg-black" />
              )}
              <p className="mt-1.5 line-clamp-3 text-[12px] leading-6 text-on-surface-variant">{n.content}</p>

              {/* چیپ مرحله فعلی — پیش‌نمایش زنده موقعیت خبر در چرخه */}
              <div className="mt-3 flex items-center justify-between">
                <StageChip status={n.status} stage={n.reviewStage} />
                <button
                  onClick={() => setDetail(n.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary transition-opacity hover:opacity-75"
                >
                  <Eye className="h-3.5 w-3.5" />
                  ردپای چرخه
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <Avatar name={n.reporterName} src={n.reporterAvatar} size={32} />
                <span className="flex-1 text-[11px] text-ink-muted">
                  {n.reporterName} · {DISTRICT_LABELS[n.district] ?? n.district}
                </span>
              </div>

              {/* دکمه‌های تصمیم — فقط در تب انتظار */}
              {tab === "waiting" && n.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  {isAdmin && n.reviewStage !== "admin" ? (
                    <>
                      {/* ادمین: ارجاع به مرحله بعد (حفظ چرخه) */}
                      <button
                        onClick={() => act(n.id, "approve", undefined, undefined, "advance")}
                        disabled={busy !== null}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary/35 bg-primary-fixed/40 py-3 text-[12.5px] font-bold text-on-primary-fixed transition-transform hover:scale-[1.01] disabled:opacity-50"
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        {busy === n.id ? "..." : "تایید و ارجاع"}
                      </button>
                      {/* ادمین: تایید نهایی و انتشار فوری */}
                      <button
                        onClick={() => act(n.id, "approve", undefined, undefined, "final")}
                        disabled={busy !== null}
                        className="v3-btn flex flex-1 items-center justify-center gap-1.5 py-3 text-[12.5px] transition-transform hover:scale-[1.01] disabled:opacity-50"
                      >
                        <Rocket className="h-4 w-4" />
                        {busy === n.id ? "..." : "انتشار فوری"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => act(n.id, "approve")}
                      disabled={busy !== null}
                      className="v3-btn flex flex-1 items-center justify-center gap-1.5 py-3 text-[13px] transition-transform hover:scale-[1.01] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {busy === n.id ? "..." : isAdmin ? "تایید نهایی و انتشار" : "تایید و ارجاع به مرحله بعد"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRejecting(n.id)
                      setReason("insufficient")
                    }}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-error-container/25 py-3 text-[13px] font-bold text-on-error-container transition-colors hover:bg-error-container/40 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    رد با دلیل
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* دیالوگ ردپای چرخه (پیش‌نمایش آنلاین برای مدیر) */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="nice-scroll max-h-[84dvh] overflow-y-auto rounded-[24px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5">
          {detailNews && (
            <>
              <DialogHeader className="text-right">
                <DialogTitle className="text-right text-[16px] leading-7 text-ink">{detailNews.title}</DialogTitle>
                <DialogDescription className="text-[11px] text-ink-muted">
                  {detailNews.code} · {detailNews.reporterName} · {DISTRICT_LABELS[detailNews.district] ?? detailNews.district}
                </DialogDescription>
              </DialogHeader>
              {/* پیش‌نمایش خبر — همان شکلی که منتشر می‌شود */}
              <div className="v3-card-flat mt-3 p-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black text-ink-muted">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  پیش‌نمایش خبر (پیش از تصمیم)
                </p>
                {detailNews.mediaUrl && detailNews.mediaType === "photo" && (
                  <img src={detailNews.mediaUrl} alt="رسانه خبر" className="mb-3 max-h-52 w-full rounded-2xl border border-line object-cover" />
                )}
                {detailNews.mediaUrl && detailNews.mediaType === "video" && (
                  <video src={detailNews.mediaUrl} controls className="mb-3 max-h-52 w-full rounded-2xl border border-line bg-black" />
                )}
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant">{CATEGORY_LABELS[detailNews.category]}</span>
                  <span className="text-[10px] text-ink-muted">
                    {detailNews.reporterName} · {DISTRICT_LABELS[detailNews.district] ?? detailNews.district} · {durFmt(detailNews.durationMin)}
                  </span>
                </div>
                {detailNews.lead && (
                  <p className="mt-2 rounded-xl bg-surface-container-low px-3 py-2 text-[12px] font-medium leading-6 text-tertiary">{detailNews.lead}</p>
                )}
                <p className="mt-2 text-[15px] font-black leading-7 text-ink">{detailNews.title}</p>
                <p className="mt-1.5 whitespace-pre-line text-[13px] leading-7 text-ink/90">{detailNews.content}</p>
              </div>
              <div className="mt-3">
                <StageTimeline news={detailNews} />
              </div>
              {canEditNews && (
                <button
                  onClick={() => setEditing(detailNews.id)}
                  className="v3-btn-ghost mt-3 flex w-full items-center justify-center gap-1.5 py-3 text-[12px]"
                >
                  <Pencil className="h-4 w-4" />
                  ویرایش متن خبر
                </button>
              )}
              {isAdmin && detailNews.status === "pending" && detailNews.reviewStage !== "admin" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => act(detailNews.id, "approve", undefined, undefined, "advance")}
                    disabled={busy !== null}
                    className="rounded-full border border-primary/35 bg-primary-fixed/40 py-3 text-[12.5px] font-bold text-on-primary-fixed disabled:opacity-50"
                  >
                    تایید و ارجاع به بعدی
                  </button>
                  <button
                    onClick={() => act(detailNews.id, "approve", undefined, undefined, "final")}
                    disabled={busy !== null}
                    className="v3-btn py-3 text-[12.5px] disabled:opacity-50"
                  >
                    انتشار فوری
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* رد با دلیل */}
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent className="rounded-[24px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5">
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
                  reason === r.key ? "border-danger/40 bg-error-container/20" : "border-line bg-surface-2/60 hover:bg-surface-2",
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", reason === r.key ? "border-danger bg-danger text-white" : "border-line")}>
                  {reason === r.key && <Check className="h-3 w-3" />}
                </span>
                <span>
                  <span className="flex items-center gap-1.5 block text-[13px] font-bold text-ink">
                    <FileWarning className="h-3.5 w-3.5 text-danger/70" />
                    {r.label}
                  </span>
                  <span className="block text-[11px] text-ink-muted">{r.hint}</span>
                </span>
              </button>
            ))}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="توضیح تکمیلی برای خبرنگار (اختیاری)" className="v3-input rounded-2xl leading-6 placeholder:text-ink-muted/50" />
          </div>
          <button
            onClick={() => rejecting !== null && act(rejecting, "reject", reason, note)}
            disabled={busy !== null}
            className="mt-4 w-full rounded-full bg-danger py-3.5 text-[14px] font-black text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {busy !== null ? "..." : "ثبت رد خبر"}
          </button>
        </DialogContent>
      </Dialog>

      {/* ویرایش متن خبر — ادمین کل و کارشناس */}
      <NewsEditDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        news={detailNews ? { id: detailNews.id, title: detailNews.title, content: detailNews.content } : null}
        onSaved={() => setDetail(null)}
      />
    </div>
  )
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "warn" | "tertiary" | "plain" }) {
  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-2xl border p-3 text-center",
      tone === "warn" ? "border-warn/30 bg-warn/10" : tone === "tertiary" ? "border-tertiary/25 bg-tertiary-fixed/25" : "border-line bg-surface",
    )}>
      <span className={cn(
        "mx-auto flex h-8 w-8 items-center justify-center rounded-xl",
        tone === "warn" ? "bg-warn/20 text-warn" : tone === "tertiary" ? "bg-tertiary text-on-tertiary" : "bg-surface-2 text-ink-muted",
      )}>
        {icon}
      </span>
      <span className="text-[18px] font-black leading-none text-ink">{value}</span>
      <span className="text-[9.5px] font-bold text-ink-muted">{label}</span>
    </div>
  )
}
