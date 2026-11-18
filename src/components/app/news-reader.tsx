"use client"

import { X, Eye, Heart, CalendarClock, Newspaper, CheckCircle2, XCircle, Hourglass } from "lucide-react"
import { Avatar } from "@/components/app/bits"
import { fa, faNum, durFmt, preparedFmt, relTime } from "@/lib/format"
import { CATEGORY_LABELS } from "@/lib/domain"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// خوانندهٔ خبر — باز کردن و مطالعهٔ کامل خبر در همان صفحه (خانه/فعالیت/…) بدون تعویض تب
export type ReaderNews = {
  id: number
  code?: string
  title: string
  content: string
  category?: string
  mediaType?: string
  mediaUrl?: string
  durationMin?: number
  preparedAt?: string | null
  createdAt: string
  reporterName: string
  reporterAvatar?: string
  reporterDistrict?: string
  status?: string
  views?: number
  eitaaReactions?: number
}

export function NewsReaderDialog({
  news,
  onClose,
}: {
  news: ReaderNews | null
  onClose: () => void
}) {
  if (!news) return null
  const hasPhoto = news.mediaType === "photo" && !!news.mediaUrl
  const hasVideo = news.mediaType === "video" && !!news.mediaUrl
  const status = news.status
  return (
    <Dialog open={!!news} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto nice-scroll rounded-[26px] border-[var(--v3-line)] bg-[var(--v3-card)] p-0 sm:max-w-xl">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            aria-label="بستن"
          >
            <X className="h-4.5 w-4.5" />
          </button>
          {hasPhoto && <img src={news.mediaUrl} alt={news.title} className="h-52 w-full rounded-t-[26px] object-cover" />}
          {hasVideo && <video src={news.mediaUrl} controls className="h-52 w-full rounded-t-[26px] bg-black object-cover" />}
          {!hasPhoto && !hasVideo && (
            <div className="v3-tile-blue flex h-28 items-end rounded-t-[26px] p-4">
              <Newspaper className="h-8 w-8 opacity-80" />
            </div>
          )}
        </div>

        <div className="p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-[17px] font-black leading-7 text-[var(--v3-ink)]">{news.title}</DialogTitle>
          </DialogHeader>

          {/* سرصفحه خبرنگار + وضعیت */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Avatar name={news.reporterName} src={news.reporterAvatar} size={30} />
            <span className="text-[11.5px] font-bold text-[var(--v3-ink)]">{news.reporterName}</span>
            <span className="text-[10px] text-[var(--v3-ink-2)]">{relTime(news.createdAt)}</span>
            {status && status !== "approved" && (
              <span
                className={cn(
                  "mr-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black",
                  status === "approved" && "bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#fca5a5]",
                  status === "rejected" && "bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-400",
                  status === "pending" && "bg-[var(--v3-amber-soft)] text-amber-600 dark:text-amber-400",
                )}
              >
                {status === "approved" ? <CheckCircle2 className="h-3 w-3" /> : status === "rejected" ? <XCircle className="h-3 w-3" /> : <Hourglass className="h-3 w-3" />}
                {status === "approved" ? "منتشر شده" : status === "rejected" ? "بازگشتی" : "در بررسی"}
              </span>
            )}
          </div>

          {/* متن کامل */}
          <p className="mt-4 whitespace-pre-line text-[13.5px] leading-8 text-[var(--v3-ink)]">{news.content}</p>

          {/* پانوشت مشخصات */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-[var(--v3-line)] pt-3 text-[10px] font-semibold text-[var(--v3-ink-2)]">
            {news.category && <span className="rounded-full bg-[var(--v3-card-2)] px-2.5 py-1">{CATEGORY_LABELS[news.category] ?? news.category}</span>}
            {news.code && <span className="rounded-full bg-[var(--v3-card-2)] px-2.5 py-1" dir="ltr">{news.code}</span>}
            {!!news.durationMin && news.durationMin > 0 && <span className="rounded-full bg-[var(--v3-card-2)] px-2.5 py-1">{durFmt(news.durationMin)}</span>}
            {news.preparedAt && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--v3-card-2)] px-2.5 py-1">
                <CalendarClock className="h-3 w-3" />
                {preparedFmt(news.preparedAt)}
              </span>
            )}
            {typeof news.views === "number" && news.views > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--v3-card-2)] px-2.5 py-1">
                <Eye className="h-3 w-3" /> {faNum(news.views)}
              </span>
            )}
            {typeof news.eitaaReactions === "number" && news.eitaaReactions > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-red-500 dark:bg-red-500/12 dark:text-red-400">
                <Heart className="h-3 w-3" /> {faNum(news.eitaaReactions)}
              </span>
            )}
          </div>
          {status === "approved" && <p className="mt-3 text-center text-[9.5px] text-[var(--v3-ink-2)]/70">خبر تأییدشده — {fa(25)} امتیاز برای خبرنگار</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
