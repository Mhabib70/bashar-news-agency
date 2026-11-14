"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { useApp } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// دیالوگ ویرایش متن خبر — مخصوص ادمین کل و کارشناس خبر (اختیار سردبیری)
// تیتر و متن کامل خبر قابل ویرایش است؛ رویداد آن در ردپای چرخه ثبت می‌شود.
export function NewsEditDialog({
  open,
  onClose,
  news,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  news: { id: number; title: string; content: string } | null
  onSaved?: () => void
}) {
  const { editNews, refresh } = useApp()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)

  // همگام‌سازی فیلدها با خبرِ انتخاب‌شده هنگام باز شدن دیالوگ.
  // به‌جای useEffect (که با هر رندرِ والد، متن تایپ‌شدهٔ کاربر را پاک می‌کرد)
  // از الگوی رسمی React برای «تنظیم state هنگام تغییر prop» استفاده می‌شود:
  // فقط وقتی خبرِ دیگری باز شود فیلدها بازنشانی می‌شوند.
  const editKey = open && news ? String(news.id) : ""
  const [prevEditKey, setPrevEditKey] = useState("")
  if (editKey !== prevEditKey) {
    setPrevEditKey(editKey)
    if (news) {
      setTitle(news.title)
      setContent(news.content)
    }
  }

  const titleOk = title.trim().length >= 8
  const contentOk = content.trim().length >= 30

  const save = async () => {
    if (!news || busy) return
    setBusy(true)
    const res = await editNews(news.id, { title, content })
    setBusy(false)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      onClose()
      await refresh()
      onSaved?.()
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[86dvh] overflow-y-auto nice-scroll rounded-[24px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5 sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-[var(--v3-ink)]">
            <Pencil className="h-4.5 w-4.5 text-[var(--v3-azure)]" />
            ویرایش متن خبر
          </DialogTitle>
          <DialogDescription className="text-[var(--v3-ink-2)]">
            تیتر و متن کامل خبر را اصلاح کنید. این ویرایش در ردپای چرخه ثبت و به خبرنگار اعلان می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">
              تیتر خبر <span className={titleOk ? "text-[var(--v3-azure)]" : "text-red-600 dark:text-red-400"}>({title.trim().length}/۸)</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="v3-input rounded-2xl"
              placeholder="تیتر خبر"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">
              متن کامل خبر <span className={contentOk ? "text-[var(--v3-azure)]" : "text-red-600 dark:text-red-400"}>({content.trim().length}/۳۰)</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="v3-input rounded-2xl text-[13px] leading-7"
              placeholder="متن کامل خبر..."
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={busy || !titleOk || !contentOk}
          className="v3-btn mt-4 w-full py-3.5 text-[14px] disabled:opacity-50"
        >
          {busy ? "در حال ذخیره..." : "ذخیره ویرایش"}
        </button>
      </DialogContent>
    </Dialog>
  )
}
