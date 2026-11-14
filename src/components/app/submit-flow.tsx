"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Save, CheckCircle2, PartyPopper, ImageIcon, Video, ImageOff, UploadCloud, X, Loader2 } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, toFa } from "@/lib/format"
import { compressPhotoForUpload } from "@/lib/image"
import { NEWS_CATEGORIES, CATEGORY_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { JalaliPicker } from "@/components/app/jalali-picker"
import { useToast } from "@/hooks/use-toast"

const STEPS = ["دسته‌بندی", "محتوای خبر", "رسانه", "بازبینی نهایی"]

export function SubmitFlow({
  open,
  onClose,
  preset,
}: {
  open: boolean
  onClose: () => void
  preset?: {
    category?: string
    title?: string
    content?: string
    draftId?: number | null
    challengeId?: number | null
    mediaType?: string
    mediaUrl?: string
    durationMin?: number
    preparedAt?: string | null
  } | null
}) {
  const { state, submitNews, saveDraft, deleteDraft, uploadMedia } = useApp()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState(preset?.category ?? "local")
  const [title, setTitle] = useState(preset?.title ?? "")
  const [content, setContent] = useState(preset?.content ?? "")
  const [mediaType, setMediaType] = useState("none")
  const [mediaUrl, setMediaUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(30)
  // تاریخ و ساعت تهیه خبر — انتخاب خبرنگار با تقویم جلالی
  const [preparedAt, setPreparedAt] = useState<Date | null>(null)
  const [challengeId, setChallengeId] = useState<number | null>(preset?.challengeId ?? null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ points: number; message: string; badges: string[] } | null>(null)
  // شناسه پیش‌نویس فعال — از preset (ادامه پیش‌نویس) یا از اولین ذخیره
  const [draftId, setDraftId] = useState<number | null>(null)

  // بارگذاری محتوای پیش‌نویس هنگام باز شدن با preset.draftId (الگوی تنظیم state هنگام رندر)
  const presetKey = open && preset?.draftId ? preset.draftId : 0
  const [prevPresetKey, setPrevPresetKey] = useState(0)
  if (presetKey !== prevPresetKey) {
    setPrevPresetKey(presetKey)
    if (presetKey && preset) {
      setCategory(preset.category ?? "local")
      setTitle(preset.title ?? "")
      setContent(preset.content ?? "")
      setMediaType(preset.mediaType ?? "none")
      setMediaUrl(preset.mediaUrl ?? "")
      setDuration(preset.durationMin && preset.durationMin > 0 ? preset.durationMin : 30)
      setPreparedAt(preset.preparedAt ? new Date(preset.preparedAt) : null)
      setChallengeId(preset.challengeId ?? null)
      setDraftId(preset.draftId ?? null)
      setStep(0)
      setDone(null)
    }
  }

  const activeChallenges = useMemo(() => (state?.challenges ?? []).filter((c) => c.status === "active"), [state])
  const canNext = step === 0 ? !!category : step === 1 ? title.trim().length >= 8 && content.trim().length >= 30 : true

  const close = () => {
    onClose()
    setTimeout(() => {
      setStep(0)
      setDone(null)
      setDraftId(null)
      if (!preset) {
        setCategory("local")
        setTitle("")
        setContent("")
      }
      setMediaType("none")
      setMediaUrl("")
      setDuration(30)
      setPreparedAt(null)
      setChallengeId(null)
    }, 250)
  }

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    const isPhoto = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    if (!isPhoto && !isVideo) {
      toast({ title: "فرمت نامعتبر", description: "فقط عکس یا ویدیو انتخاب کنید", variant: "destructive" })
      return
    }
    const max = 30 * 1024 * 1024
    if (file.size > max) {
      toast({ title: "حجم زیاد", description: "حداکثر ۳۰ مگابایت — عکس‌ها خودکار فشرده می‌شوند", variant: "destructive" })
      return
    }
    setUploading(true)
    const payload = isPhoto ? await compressPhotoForUpload(file) : file
    const r = await uploadMedia(payload)
    setUploading(false)
    if (r.ok && r.url) {
      setMediaType(r.mediaType ?? (isPhoto ? "photo" : "video"))
      setMediaUrl(r.url)
      toast({ title: "بارگذاری شد", description: r.message })
    } else {
      toast({ title: "خطا در بارگذاری", description: r.message, variant: "destructive" })
    }
  }

  const clearMedia = () => {
    setMediaType("none")
    setMediaUrl("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const submit = async () => {
    setBusy(true)
    const r = await submitNews({
      category,
      title: title.trim(),
      content: content.trim(),
      mediaType,
      mediaUrl,
      durationMin: duration,
      preparedAt: preparedAt ? preparedAt.toISOString() : null,
      challengeId,
      draftId: draftId ?? preset?.draftId ?? null,
    })
    setBusy(false)
    if (r.ok) {
      setDone({ points: r.pointsEarned ?? 10, message: r.message ?? "خبر ثبت شد", badges: r.badgesAwarded ?? [] })
      // حذف پیش‌نویس پس از ارسال موفق (به‌جای خالی‌گذاشتن)
      const did = draftId ?? preset?.draftId
      if (did) {
        await deleteDraft(did)
        setDraftId(null)
      }
    } else {
      toast({ title: "خطا", description: r.message ?? "ارسال ناموفق بود", variant: "destructive" })
    }
  }

  const saveDraftNow = async () => {
    const r = await saveDraft({
      category,
      title: title.trim(),
      content: content.trim(),
      mediaType,
      mediaUrl,
      durationMin: duration,
      preparedAt: preparedAt ? preparedAt.toISOString() : null,
      draftId: draftId ?? preset?.draftId ?? null,
    })
    if (r.ok) {
      if ((r as { id?: number }).id) setDraftId((r as { id?: number }).id!)
      toast({ title: "ذخیره شد", description: r.message })
    } else {
      toast({ title: "خطا", description: r.message ?? "ذخیره ناموفق بود", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[24px] border-[var(--v3-line)] bg-[var(--v3-card)] p-5">
        {done ? (
          <div className="stage-enter flex flex-col items-center py-4 text-center">
            {/* کارت جشن موفقیت */}
            <div className="v3-tile-blue w-full rounded-[22px] p-5 shadow-[0_18px_40px_-18px_rgba(37,99,235,0.7)]">
              <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                <CheckCircle2 className="h-10 w-10" />
              </span>
              <h3 className="relative mt-4 flex items-center justify-center gap-2 text-[18px] font-black">
                خبر ثبت شد <PartyPopper className="h-5 w-5" />
              </h3>
              <p className="relative mt-2 text-[12.5px] leading-6 text-white/85">{done.message}</p>
              <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="v3-num rounded-full bg-white/20 px-4 py-2 text-[16px] font-black backdrop-blur-sm">+{fa(done.points)} امتیاز</span>
                <span className="rounded-full bg-black/25 px-4 py-2 text-[11.5px] font-bold text-white/90">مرحله ۱: مدیر حوزه</span>
              </div>
              {done.badges.length > 0 && (
                <div className="relative mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-white/85">نشان جدید:</span>
                  {done.badges.map((b, i) => (
                    <span key={i} className="rounded-full bg-[var(--v3-amber)] px-3 py-1 text-[11px] font-black text-[#42290a] shadow-[0_6px_16px_-6px_rgba(245,158,11,0.7)]">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={close} className="v3-btn mt-4 w-full py-3.5 text-[14px]">
              عالیه، متوجه شدم
            </button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-right">
              <DialogTitle className="text-[var(--v3-ink)]">ارسال خبر جدید</DialogTitle>
              <DialogDescription className="text-[var(--v3-ink-2)]">
                مرحله {toFa(step + 1)} از {toFa(4)} — {STEPS[step]}
              </DialogDescription>
            </DialogHeader>

            {challengeId && (
              <div className="mt-3 flex items-center justify-between rounded-[14px] border border-[var(--v3-azure)]/30 bg-[var(--v3-azure-soft)] px-4 py-2.5">
                <p className="text-[12px] font-bold text-[var(--v3-azure-deep)] dark:text-[#93c5fd]">
                  🎯 ثبت محتوا برای چالش: {activeChallenges.find((c) => c.id === challengeId)?.title ?? "چالش"}
                </p>
                <button onClick={() => setChallengeId(null)} className="text-[11px] font-bold text-[var(--v3-ink-2)] transition-colors hover:text-[var(--v3-ink)]">
                  برداشتن
                </button>
              </div>
            )}

            {/* نشانگر مراحل — کامل: آبی / فعلی: آبی پالس‌دار / بعدی: خنثی */}
            <div className="mt-3 flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < step ? "bg-[var(--v3-azure)]" : i === step ? "animate-pulse bg-[var(--v3-azure)]" : "bg-[var(--v3-card-2)]",
                  )}
                />
              ))}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto nice-scroll pl-0.5">
              {step === 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {NEWS_CATEGORIES.map((c, i) => (
                    <button
                      key={c.code}
                      onClick={() => setCategory(c.code)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-[14px] border px-2 py-3 text-[11.5px] font-bold transition-colors",
                        category === c.code
                          ? "border-[var(--v3-azure)] bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#93c5fd]"
                          : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
                      )}
                    >
                      <span className={cn("relative h-10 w-10 overflow-hidden rounded-[12px] p-[3px]", i % 2 === 0 ? "bg-[var(--v3-azure-soft)]" : "bg-[var(--v3-amber-soft)]")}>
                        <img src={`/img/cat-${c.code === "none" ? "local" : c.code}.png`} alt="" className="h-full w-full rounded-[9px] object-cover" />
                      </span>
                      {c.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setCategory("none")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-[14px] border px-2 py-3 text-[11.5px] font-bold transition-colors",
                      category === "none"
                        ? "border-[var(--v3-azure)] bg-[var(--v3-azure-soft)] text-[var(--v3-azure-deep)] dark:text-[#93c5fd]"
                        : "border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
                    )}
                  >
                    <ImageOff className="h-10 w-10 rounded-[12px] bg-[var(--v3-azure-soft)] p-2.5 text-[var(--v3-azure)]" />
                    بدون دسته
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">تیتر خبر</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="تیتر جذاب و استاندارد خبر..." className="v3-input rounded-2xl text-[var(--v3-ink)] placeholder:text-[var(--v3-ink-2)]/50" />
                    <p className="mt-1 text-[10px] text-[var(--v3-ink-2)]/70">{title.trim().length >= 8 ? "✓ تیتر مناسب است" : "حداقل ۸ کاراکتر"}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[var(--v3-ink-2)]">متن کامل خبر</label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7} placeholder="لید: مهم‌ترین بخش خبر... سپس جزئیات، نقل‌قول و اطلاعات تکمیلی." className="v3-input rounded-2xl text-[var(--v3-ink)] leading-7 placeholder:text-[var(--v3-ink-2)]/50" />
                    <p className="mt-1 text-[10px] text-[var(--v3-ink-2)]/70">{content.trim().length >= 30 ? `✓ ${fa(content.trim().length)} کاراکتر` : "حداقل ۳۰ کاراکتر"}</p>
                  </div>
                  <div className="v3-card-flat p-4">
                    <label className="mb-3 block text-[12px] font-semibold text-[var(--v3-ink-2)]">زمان تهیه خبر: {fa(duration)} دقیقه</label>
                    <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={5} max={120} step={5} className="[&_[data-slot=slider-range]]:bg-[var(--v3-azure)] [&_[data-slot=slider-track]]:bg-[var(--v3-line)] [&_[data-slot=slider-thumb]]:border-[var(--v3-azure)]" />
                  </div>
                  <div className="v3-card-flat p-4">
                    <JalaliPicker label="تاریخ و ساعت تهیه خبر" value={preparedAt} onChange={setPreparedAt} />
                  </div>
                  <button onClick={saveDraftNow} className="flex items-center gap-2 text-[12px] font-bold text-[var(--v3-azure)] transition-opacity hover:opacity-80">
                    <Save className="h-4 w-4" />
                    ذخیره پیش‌نویس
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2.5">
                  {["none", "photo", "video"].includes(mediaType) && mediaUrl && (
                    <div className="relative overflow-hidden rounded-[18px] border border-[var(--v3-azure)]/30">
                      {mediaType === "photo" ? (
                        <img src={mediaUrl} alt="پیش‌نمایش" className="max-h-44 w-full object-cover" />
                      ) : (
                        <video src={mediaUrl} controls className="max-h-44 w-full bg-black" />
                      )}
                      <button onClick={clearMedia} className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {["none", "photo", "video"].includes(mediaType) && !mediaUrl && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex w-full flex-col items-center gap-2 rounded-[18px] border border-dashed border-[var(--v3-azure)]/40 bg-[var(--v3-azure-soft)]/40 px-4 py-6 text-center transition-colors hover:bg-[var(--v3-azure-soft)]/70 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-6 w-6 animate-spin text-[var(--v3-azure)]" /> : <UploadCloud className="h-6 w-6 text-[var(--v3-azure)]" />}
                      <span className="text-[13px] font-bold text-[var(--v3-ink)]">{uploading ? "در حال بارگذاری..." : "انتخاب عکس یا ویدیو از دستگاه"}</span>
                      <span className="text-[10.5px] text-[var(--v3-ink-2)]">عکس (JPG/PNG/WebP/HEIC — خودکار فشرده می‌شود) · ویدیو تا ۳۰MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.heic,.heif" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />

                  {[
                    { key: "none", label: "بدون رسانه", desc: "فقط متن خبر", icon: <ImageOff className="h-5 w-5" /> },
                    { key: "photo", label: "عکس", desc: "تصویر میدانی از رویداد", icon: <ImageIcon className="h-5 w-5" /> },
                    { key: "video", label: "ویدیو", desc: "کلیپ کوتاه گزارش", icon: <Video className="h-5 w-5" /> },
                  ].map((m, i) => (
                    <button
                      key={m.key}
                      onClick={() => setMediaType(m.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[14px] border px-4 py-3.5 text-right transition-colors",
                        mediaType === m.key
                          ? "border-[var(--v3-azure)] bg-[var(--v3-azure-soft)]"
                          : "border-[var(--v3-line)] bg-[var(--v3-card-2)] hover:border-[var(--v3-azure)]/30",
                      )}
                    >
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-[12px]", mediaType === m.key ? "bg-[var(--v3-azure)] text-white" : i % 2 === 0 ? "bg-[var(--v3-azure-soft)] text-[var(--v3-azure)]" : "bg-[var(--v3-amber-soft)] text-[var(--v3-amber)]")}>{m.icon}</span>
                      <span className="flex-1">
                        <span className="block text-[13.5px] font-bold text-[var(--v3-ink)]">{m.label}</span>
                        <span className="block text-[11px] text-[var(--v3-ink-2)]">{m.desc}</span>
                      </span>
                      {mediaType === m.key && <CheckCircle2 className="h-5 w-5 text-[var(--v3-azure)]" />}
                    </button>
                  ))}

                  {activeChallenges.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-[12px] font-semibold text-[var(--v3-ink-2)]">ثبت در چالش (اختیاری)</p>
                      <div className="flex flex-wrap gap-2">
                        {activeChallenges.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setChallengeId(challengeId === c.id ? null : c.id)}
                            className={cn(
                              "rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-colors",
                              challengeId === c.id
                                ? "bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.6)]"
                                : "border border-[var(--v3-line)] bg-[var(--v3-card-2)] text-[var(--v3-ink-2)] hover:text-[var(--v3-ink)]",
                            )}
                          >
                            {c.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="v3-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="v3-chip px-3 py-1 text-[11px]">{CATEGORY_LABELS[category]}</span>
                    <span className="text-[10.5px] text-[var(--v3-ink-2)]">{mediaType === "none" ? "بدون رسانه" : mediaType === "photo" ? "با عکس" : "با ویدیو"} · {fa(duration)} دقیقه</span>
                  </div>
                  {mediaUrl && mediaType === "photo" && (
                    <img src={mediaUrl} alt="" className="mt-3 max-h-40 w-full rounded-[14px] object-cover" />
                  )}
                  {mediaUrl && mediaType === "video" && <video src={mediaUrl} controls className="mt-3 max-h-40 w-full rounded-[14px] bg-black" />}
                  <h4 className="mt-3 text-[15.5px] font-black leading-7 text-[var(--v3-ink)]">{title}</h4>
                  <p className="mt-2 line-clamp-6 whitespace-pre-line text-[12.5px] leading-6 text-[var(--v3-ink-2)]">{content}</p>
                  {challengeId && (
                    <p className="mt-3 rounded-[12px] bg-[var(--v3-azure-soft)] px-3 py-2 text-[11px] font-bold text-[var(--v3-azure-deep)] dark:text-[#93c5fd]">
                      ثبت‌شده برای چالش: {activeChallenges.find((c) => c.id === challengeId)?.title}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2 border-t border-[var(--v3-line)] pt-4">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="v3-btn-ghost flex items-center gap-1 px-5 py-3 text-[13px]">
                  <ArrowRight className="h-4 w-4" />
                  قبلی
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => canNext && setStep(step + 1)}
                  disabled={!canNext}
                  className="v3-btn flex flex-1 items-center justify-center gap-2 py-3 text-[14px] disabled:opacity-40"
                >
                  مرحله بعد
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={busy} className="v3-btn flex flex-1 items-center justify-center gap-2 py-3 text-[14px] disabled:opacity-50">
                  {busy ? "در حال ارسال..." : "ثبت نهایی خبر"}
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
