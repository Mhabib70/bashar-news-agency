"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, GraduationCap, Loader2, ShieldCheck, Plus, Trash2, FileDown, Video, FileText, X, UploadCloud } from "lucide-react"
import { useApp, type TrainingItem } from "@/lib/store"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { NeonAvatar } from "@/components/app/bits"
import { jalali, relTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// بخش آموزش — محتوای آموزشی خبرنگاران (متن/فایل/ویدئو)
// مشاهده: همه اعضای فعال · افزودن و حذف: ادمین کل و مدیر حوزه
export default function TrainingPage() {
  const router = useRouter()
  const { userId, state, booted, login, fetchTrainings, createTraining, deleteTraining, uploadMedia } = useApp()
  const { toast } = useToast()
  const [items, setItems] = useState<TrainingItem[] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ title: "", body: "", kind: "text", fileUrl: "" })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) login(uid).catch(() => router.replace("/"))
    else router.replace("/")
  }, [login, router])

  const load = () => {
    fetchTrainings().then(setItems)
  }
  useEffect(() => {
    if (userId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (!booted || !state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--page)]">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </main>
    )
  }
  const user = state.user
  const canManage = user.role === "admin" || user.role === "district_manager"

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    const r = await uploadMedia(file)
    setUploading(false)
    if (r.ok && r.url) {
      setF((p) => ({ ...p, fileUrl: r.url!, kind: r.mediaType === "video" ? "video" : "file" }))
      toast({ title: "فایل بارگذاری شد" })
    } else {
      toast({ title: "خطا در بارگذاری", description: r.message, variant: "destructive" })
    }
  }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    const r = await createTraining({ title: f.title.trim(), body: f.body.trim(), kind: f.kind, fileUrl: f.fileUrl })
    setBusy(false)
    if (r.ok) {
      toast({ title: "منتشر شد", description: r.message })
      setAddOpen(false)
      setF({ title: "", body: "", kind: "text", fileUrl: "" })
      load()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const remove = async (id: number) => {
    const r = await deleteTraining(id)
    if (r.ok) {
      toast({ title: "حذف شد", description: r.message })
      load()
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  return (
    <main className="min-h-dvh bg-[var(--page)]">
      <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink"
            aria-label="بازگشت"
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[13.5px] font-black text-ink">
              <GraduationCap className="h-4 w-4 text-neon" />
              آموزش خبرنگاران
            </p>
            <p className="text-[10px] font-semibold text-neon">متن، فایل و ویدئوهای آموزشی</p>
          </div>
          <NeonAvatar name={user.fullName} src={user.avatar} size={38} />
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[720px] space-y-3 px-4 py-5">
        {canManage && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground btn-glow"
          >
            <Plus className="h-4.5 w-4.5" />
            افزودن آموزش جدید
          </button>
        )}

        {items === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-line py-14 text-center">
            <GraduationCap className="h-9 w-9 text-neon/60" />
            <p className="text-[14px] font-bold text-ink">هنوز آموزشی منتشر نشده است</p>
            <p className="max-w-[280px] text-[11.5px] leading-5 text-ink-muted">
              {canManage ? "با دکمه بالا اولین محتوای آموزشی (متن، فایل PDF یا ویدئو) را برای خبرنگاران بفرستید." : "محتوای آموزشی توسط ادمین و مدیر حوزه منتشر می‌شود."}
            </p>
          </div>
        ) : (
          items.map((t) => (
            <div key={t.id} className="rounded-[24px] border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.kind === "video" ? "bg-danger/10 text-danger-soft" : t.kind === "file" ? "bg-neon/12 text-neon" : "bg-surface-2 text-ink-muted")}>
                    {t.kind === "video" ? <Video className="h-4.5 w-4.5" /> : t.kind === "file" ? <FileDown className="h-4.5 w-4.5" /> : <FileText className="h-4.5 w-4.5" />}
                  </span>
                  <div>
                    <p className="text-[14px] font-black text-ink">{t.title}</p>
                    <p className="text-[10px] text-ink-muted">{t.authorName || "مدیریت"} · {jalali(t.createdAt, true)} · {relTime(t.createdAt)}</p>
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => remove(t.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-danger/30 text-danger-soft" aria-label="حذف">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {t.body && <p className="mt-2.5 whitespace-pre-line text-[12.5px] leading-7 text-ink/90">{t.body}</p>}
              {t.fileUrl && (
                <a
                  href={t.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-full border border-neon/40 bg-neon/10 py-3 text-[12.5px] font-bold text-neon"
                >
                  {t.kind === "video" ? <Video className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
                  {t.kind === "video" ? "مشاهده ویدئو آموزشی" : "دانلود فایل آموزشی"}
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* دیالوگ افزودن آموزش */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[86dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">افزودن آموزش جدید</DialogTitle>
            <DialogDescription className="text-ink-muted">متن توضیحی + فایل PDF یا ویدئو — بلافاصله برای همه خبرنگاران منتشر می‌شود.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="عنوان آموزش (مثلاً: اصول لیدنویسی)" className="rounded-2xl border-line bg-surface text-ink" />
            <Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={5} placeholder="توضیحات / متن آموزش..." className="rounded-2xl border-line bg-surface text-[13px] leading-7 text-ink" />

            {f.fileUrl ? (
              <div className="flex items-center justify-between rounded-2xl border border-neon/35 bg-neon/8 px-4 py-3">
                <span className="truncate text-[12px] font-bold text-neon" dir="ltr">{f.fileUrl}</span>
                <button onClick={() => setF({ ...f, fileUrl: "", kind: "text" })} className="text-ink-muted"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-neon/40 bg-neon/5 px-4 py-5 text-center">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-neon" /> : <UploadCloud className="h-5 w-5 text-neon" />}
                <span className="text-[12.5px] font-bold text-ink">{uploading ? "در حال بارگذاری..." : "پیوست فایل PDF یا ویدئو (اختیاری)"}</span>
                <input type="file" accept="application/pdf,video/*,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}

            <button
              onClick={submit}
              disabled={busy || f.title.trim().length < 3}
              className="w-full rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-50"
            >
              {busy ? "در حال انتشار..." : "انتشار آموزش"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
