"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft, Save, CheckCircle2, PartyPopper, ImageIcon, Video, ImageOff, UploadCloud, X,
  Loader2, Hash, List, Quote, Bold, CalendarClock, FolderOpen, ChevronDown, Sparkles,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, toFa } from "@/lib/format"
import { compressPhotoForUpload } from "@/lib/image"
import { NEWS_CATEGORIES, CATEGORY_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { JalaliPicker } from "@/components/app/jalali-picker"
import { useToast } from "@/hooks/use-toast"

const TITLE_MAX = 70
const LEAD_MAX = 200

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
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [category, setCategory] = useState(preset?.category ?? "local")
  const [title, setTitle] = useState(preset?.title ?? "")
  const [lead, setLead] = useState("")
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
  const [autoSaved, setAutoSaved] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)

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
      setDone(null)
      setLead("")
    }
  }

  const activeChallenges = useMemo(() => (state?.challenges ?? []).filter((c) => c.status === "active"), [state])

  // شماره پروتکل تخمینی خبر بعدی (نمایشی — کد نهایی هنگام ثبت صادر می‌شود)
  const nextCode = useMemo(() => {
    const codes = (state?.news ?? [])
      .map((n) => parseInt((n.code || "").replace(/\D/g, ""), 10))
      .filter((x) => Number.isFinite(x) && x > 0)
    return codes.length ? `N-${Math.max(...codes) + 1}` : "N-••••"
  }, [state?.news])

  const canSubmit = title.trim().length >= 8 && content.trim().length >= 30

  const close = () => {
    onClose()
    setTimeout(() => {
      setDone(null)
      setDraftId(null)
      setAutoSaved(false)
      if (!preset) {
        setCategory("local")
        setTitle("")
        setLead("")
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

  // ذخیره خودکار بی‌صدا — ۲.۵ ثانیه پس از توقف تایپ (اگر حداقل شرایط)
  useEffect(() => {
    if (!open || done) return
    if (title.trim().length < 8 || content.trim().length < 30) return
    const t = setTimeout(async () => {
      const r = await saveDraft({
        category, title: title.trim(), lead: lead.trim(), content: content.trim(),
        mediaType, mediaUrl, durationMin: duration,
        preparedAt: preparedAt ? preparedAt.toISOString() : null,
        draftId: draftId ?? preset?.draftId ?? null,
      })
      if (r.ok && (r as { id?: number }).id) {
        setDraftId((r as { id?: number }).id!)
        setAutoSaved(true)
      }
    }, 2500)
    return () => clearTimeout(t)
  }, [open, done, title, lead, content, category, mediaType, mediaUrl, duration, preparedAt, draftId, preset, saveDraft])

  const submit = async () => {
    setBusy(true)
    const r = await submitNews({
      category,
      title: title.trim(),
      lead: lead.trim(),
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
      category, title: title.trim(), lead: lead.trim(), content: content.trim(),
      mediaType, mediaUrl, durationMin: duration,
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

  // درج ابزار متن در موقعیت نشانگر
  const insertAtCursor = (before: string, after = "") => {
    const el = contentRef.current
    if (!el) return
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const selected = content.slice(start, end)
    const next = content.slice(0, start) + before + selected + after + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + before.length + selected.length + after.length
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[28px] border-outline-variant/50 bg-surface-container-lowest p-5">
        {done ? (
          <div className="stage-enter flex flex-col items-center py-4 text-center">
            {/* کارت جشن موفقیت */}
            <div className="w-full rounded-[22px] bg-gradient-to-bl from-primary to-primary-container p-5 text-on-primary shadow-[0_18px_40px_-18px_rgba(157,66,58,0.6)]">
              <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                <CheckCircle2 className="h-10 w-10" />
              </span>
              <h3 className="relative mt-4 flex items-center justify-center gap-2 text-[18px] font-black">
                خبر ثبت شد <PartyPopper className="h-5 w-5" />
              </h3>
              <p className="relative mt-2 text-[12.5px] leading-6 text-white/85">{done.message}</p>
              <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="font-black tracking-tight rounded-full bg-white/20 px-4 py-2 text-[16px] font-black backdrop-blur-sm">+{fa(done.points)} امتیاز</span>
                <span className="rounded-full bg-black/25 px-4 py-2 text-[11.5px] font-bold text-white/90">مرحله ۱: مدیر حوزه</span>
              </div>
              {done.badges.length > 0 && (
                <div className="relative mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-white/85">نشان جدید:</span>
                  {done.badges.map((b, i) => (
                    <span key={i} className="rounded-full bg-warn px-3 py-1 text-[11px] font-black text-[#42290a] shadow-[0_6px_16px_-6px_rgba(217,119,6,0.7)]">
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
              <DialogTitle className="text-[15.5px] font-extrabold text-on-surface">ارسال و ثبت خبر جدید</DialogTitle>
              <DialogDescription className="text-[11px] text-on-surface-variant">
                سامانه تحریریه و مخابره رخداد — {CATEGORY_LABELS[category]}
              </DialogDescription>
            </DialogHeader>

            {/* شماره پروتکل + برچسب چرخه */}
            <div className="mt-2 flex items-center justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-low px-4 py-3">
              <span className="flex items-center gap-2">
                <span className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2 py-1 font-mono text-[12px] font-bold text-on-surface-variant">
                  <Hash className="mr-1 inline h-3.5 w-3.5" />
                  {nextCode}
                </span>
                <span className="text-[11px] font-bold text-on-surface">شناسه پروتکل پیگیری:</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-on-surface-variant">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-fixed/60 text-primary">
                  <FolderOpen className="h-3 w-3" />
                </span>
                مدیر حوزه ← کارشناس خبر
              </span>
            </div>

            {challengeId && (
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary-fixed/40 px-4 py-2.5">
                <p className="text-[12px] font-bold text-on-primary-fixed">
                  <Sparkles className="ml-1 inline h-4 w-4" />
                  ثبت محتوا برای چالش: {activeChallenges.find((c) => c.id === challengeId)?.title ?? "چالش"}
                </p>
                <button onClick={() => setChallengeId(null)} className="text-[11px] font-bold text-on-surface-variant transition-colors hover:text-on-surface">
                  برداشتن
                </button>
              </div>
            )}

            <div className="nice-scroll mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pl-0.5">
              {/* ===== دسته‌بندی موضوعی — چیپ‌های افقی ===== */}
              <div>
                <p className="mb-2 text-[13px] font-extrabold text-on-surface">دسته‌بندی موضوعی:</p>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {NEWS_CATEGORIES.filter((c) => c.code !== "none").map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCategory(c.code)}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-2 text-[12px] font-bold transition-colors",
                        category === c.code
                          ? "bg-primary text-on-primary shadow-[0_6px_16px_-6px_rgba(157,66,58,0.6)]"
                          : "border border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ===== تیتر خبر (الزامی) ===== */}
              <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-extrabold text-on-surface">
                    <span className="text-primary">۲</span> تیتر خبر
                    <span className="text-[10px] font-bold text-danger"> (الزامی)</span>
                  </p>
                  <span className="font-mono text-[10px] text-on-surface-variant">{toFa(title.trim().length)}/{toFa(TITLE_MAX)}</span>
                </div>
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  rows={2}
                  placeholder="تیتر موجز، جذاب و متناسب بر واقعه اصلی بنویسید..."
                  className="w-full resize-none rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-[13.5px] leading-6 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                {title.trim().length >= 8 && (
                  <p className="mt-1 text-[10px] font-bold text-tertiary">✓ تیتر مناسب است</p>
                )}
              </div>

              {/* ===== لید خبر ===== */}
              <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[13px] font-extrabold text-on-surface">لید خبر (خلاصهٔ کلیدی)</p>
                  <span className="font-mono text-[10px] text-on-surface-variant">{toFa(lead.trim().length)}/{toFa(LEAD_MAX)}</span>
                </div>
                <p className="mb-2.5 text-[10.5px] leading-5 text-on-surface-variant">
                  عناصر بنیادین خبر شامل چه کس، چه چیزی، کجا، کجا و چرا را با دقت ترسیم کنید.
                </p>
                <textarea
                  value={lead}
                  onChange={(e) => setLead(e.target.value.slice(0, LEAD_MAX))}
                  rows={2}
                  placeholder="بیان فشردهٔ اصل ماجرا جهت جذب سریع مخاطب..."
                  className="w-full resize-none rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-[13px] leading-6 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>

              {/* ===== متن مشروح خبر + ذخیره خودکار ===== */}
              <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-on-surface">
                    <EditNoteIcon />
                    متن مشروح خبر
                  </p>
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold",
                    autoSaved ? "bg-success-soft text-success" : "bg-surface-container text-on-surface-variant",
                  )}>
                    {autoSaved ? "ذخیرهٔ خودکار پیش‌نویس ✓" : "ذخیرهٔ خودکار فعال"}
                  </span>
                </div>
                {/* نوار ابزار متن */}
                <div className="mb-2 flex items-center gap-1 rounded-xl bg-surface-container-low px-2 py-1.5">
                  <ToolBtn onClick={() => insertAtCursor("**", "**")} label="بولد"><Bold className="h-4 w-4" /></ToolBtn>
                  <ToolBtn onClick={() => insertAtCursor("\n• ", "")} label="فهرست"><List className="h-4 w-4" /></ToolBtn>
                  <ToolBtn onClick={() => insertAtCursor("\n«", "»")} label="نقل قول"><Quote className="h-4 w-4" /></ToolBtn>
                  <span className="mr-auto font-mono text-[10px] text-on-surface-variant">{toFa(content.trim().length)} کاراکتر</span>
                </div>
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={7}
                  placeholder="متن کامل رویداد، جزئیات، نقل‌قول‌های دقیق و شرح زوایای موضوعی..."
                  className="w-full resize-none rounded-xl border border-outline-variant/50 bg-surface-container-low px-3.5 py-2.5 text-[13px] leading-7 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                {content.trim().length >= 30 ? (
                  <p className="mt-1 text-[10px] font-bold text-tertiary">✓ {fa(content.trim().length)} کاراکتر</p>
                ) : (
                  <p className="mt-1 text-[10px] text-on-surface-variant">حداقل ۳۰ کاراکتر</p>
                )}
              </div>

              {/* ===== پیوست چندرسانه‌ای ===== */}
              <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-on-surface">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    پیوست چندرسانه‌ای
                  </p>
                  <button onClick={() => setMediaOpen(!mediaOpen)} className="flex items-center gap-1 text-[10.5px] font-bold text-on-surface-variant">
                    {mediaType === "none" && !mediaUrl ? "بدون پیوست" : mediaType === "photo" ? "عکس" : "ویدیو"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mediaOpen && "rotate-180")} />
                  </button>
                </div>

                {/* پیش‌نمایش رسانه */}
                {mediaUrl && (
                  <div className="relative mt-3 overflow-hidden rounded-xl border border-primary/30">
                    {mediaType === "photo" ? (
                      <img src={mediaUrl} alt="پیش‌نمایش" className="max-h-44 w-full object-cover" />
                    ) : (
                      <video src={mediaUrl} controls className="max-h-44 w-full bg-black" />
                    )}
                    <button onClick={clearMedia} className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                      <X className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[9.5px] font-bold text-white">
                      {mediaType === "photo" ? "تصویر اصلی" : "ویدیو ضمیمه"}
                    </span>
                  </div>
                )}

                {/* دکمه آپلود */}
                {mediaOpen && (
                  <div className="mt-3">
                    {!mediaUrl && (
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-fixed/25 px-4 py-5 text-center transition-colors hover:bg-primary-fixed/45 disabled:opacity-60"
                      >
                        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-primary" />}
                        <span className="text-[13px] font-bold text-on-surface">{uploading ? "در حال بارگذاری..." : "افزودن تصویر/ویدیو"}</span>
                        <span className="text-[10px] text-on-surface-variant">JPG, PNG ≤ ۱۵MB (خودکار فشرده می‌شود) · ویدیو تا ۳۰MB</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.heic,.heif" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                    <div className="mt-2.5 flex gap-2">
                      {[
                        { key: "none", label: "بدون رسانه", icon: <ImageOff className="h-4 w-4" /> },
                        { key: "photo", label: "عکس میدانی", icon: <ImageIcon className="h-4 w-4" /> },
                        { key: "video", label: "کلیپ گزارش", icon: <Video className="h-4 w-4" /> },
                      ].map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setMediaType(m.key)}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-[10.5px] font-bold transition-colors",
                            mediaType === m.key
                              ? "border-primary bg-primary-fixed/50 text-on-primary-fixed"
                              : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant",
                          )}
                        >
                          {m.icon}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== زمان‌بندی و تقویم رسمی رخداد ===== */}
              <div className="rounded-2xl border border-outline-variant/40 bg-surface p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-on-surface">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    زمان‌بندی و تقویم رسمی رخداد
                  </p>
                  <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">
                    هجری شمسی
                  </span>
                </div>
                <JalaliPicker label="تاریخ و ساعت تهیه خبر" value={preparedAt} onChange={setPreparedAt} />
                <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                  <label className="mb-2 block text-[11.5px] font-bold text-on-surface-variant">زمان صرف‌شده برای تهیه: {fa(duration)} دقیقه</label>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-[var(--primary)]"
                  />
                </div>
              </div>
            </div>

            {/* ===== دکمه‌های نهایی ===== */}
            <div className="mt-3 flex flex-col gap-2 border-t border-outline-variant/40 pt-3">
              <button onClick={submit} disabled={busy || !canSubmit} className="v3-btn flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-50">
                {busy ? "در حال ارسال..." : "ارسال برای تایید حوزه"}
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              <button onClick={saveDraftNow} className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-surface py-3.5 text-[13px] font-bold text-on-surface transition-colors hover:bg-surface-container-low">
                <Save className="h-4 w-4" />
                ذخیره در پیش‌نویس‌ها
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ToolBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
    >
      {children}
    </button>
  )
}

function EditNoteIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-fixed/60 text-primary">
      <Bold className="h-3 w-3" />
    </span>
  )
}
