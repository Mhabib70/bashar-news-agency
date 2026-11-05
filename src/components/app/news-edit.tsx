"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    if (open && news) {
      setTitle(news.title)
      setContent(news.content)
    }
  }, [open, news])

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
      <DialogContent className="max-h-[86dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5 sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-ink">
            <Pencil className="h-4.5 w-4.5 text-neon" />
            ویرایش متن خبر
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            تیتر و متن کامل خبر را اصلاح کنید. این ویرایش در ردپای چرخه ثبت و به خبرنگار اعلان می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">
              تیتر خبر <span className={titleOk ? "text-neon" : "text-danger-soft"}>({title.trim().length}/۸)</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-2xl border-line bg-surface text-ink"
              placeholder="تیتر خبر"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">
              متن کامل خبر <span className={contentOk ? "text-neon" : "text-danger-soft"}>({content.trim().length}/۳۰)</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="rounded-2xl border-line bg-surface text-[13px] leading-7 text-ink"
              placeholder="متن کامل خبر..."
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={busy || !titleOk || !contentOk}
          className="mt-4 w-full rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-50"
        >
          {busy ? "در حال ذخیره..." : "ذخیره ویرایش"}
        </button>
      </DialogContent>
    </Dialog>
  )
}
