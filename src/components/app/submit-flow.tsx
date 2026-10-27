"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Save, CheckCircle2, PartyPopper, ImageIcon, Video, ImageOff } from "lucide-react"
import { useApp } from "@/lib/store"
import { fa, toFa } from "@/lib/format"
import { NEWS_CATEGORIES, CATEGORY_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"

const STEPS = ["دسته‌بندی", "محتوای خبر", "رسانه", "بازبینی نهایی"]

export function SubmitFlow({
  open,
  onClose,
  preset,
}: {
  open: boolean
  onClose: () => void
  preset?: { category?: string; title?: string; content?: string; draftId?: number | null } | null
}) {
  const { state, submitNews, saveDraft } = useApp()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState(preset?.category ?? "local")
  const [title, setTitle] = useState(preset?.title ?? "")
  const [content, setContent] = useState(preset?.content ?? "")
  const [mediaType, setMediaType] = useState("none")
  const [duration, setDuration] = useState(30)
  const [challengeId, setChallengeId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ points: number; message: string; badges: string[] } | null>(null)

  const activeChallenges = useMemo(() => (state?.challenges ?? []).filter((c) => c.status === "active"), [state])
  const canNext = step === 0 ? !!category : step === 1 ? title.trim().length >= 8 && content.trim().length >= 30 : true

  const close = () => {
    onClose()
    setTimeout(() => {
      setStep(0)
      setDone(null)
      if (!preset) {
        setCategory("local")
        setTitle("")
        setContent("")
      }
      setMediaType("none")
      setDuration(30)
      setChallengeId(null)
    }, 250)
  }

  const submit = async () => {
    setBusy(true)
    const r = await submitNews({
      category,
      title: title.trim(),
      content: content.trim(),
      mediaType,
      durationMin: duration,
      challengeId,
      draftId: preset?.draftId ?? null,
    })
    setBusy(false)
    if (r.ok) {
      setDone({ points: r.pointsEarned ?? 10, message: r.message ?? "خبر ثبت شد", badges: r.badgesAwarded ?? [] })
      if (preset?.draftId) await saveDraft({ category, title: title.trim(), content: "", draftId: preset.draftId })
    } else {
      toast({ title: "خطا", description: r.message ?? "ارسال ناموفق بود", variant: "destructive" })
    }
  }

  const saveDraftNow = async () => {
    const r = await saveDraft({ category, title: title.trim(), content: content.trim(), draftId: preset?.draftId ?? null })
    if (r.ok) toast({ title: "ذخیره شد", description: r.message })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[28px] border-line bg-popover p-5">
        {done ? (
          <div className="flex flex-col items-center py-6 text-center stage-enter">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-neon/15 text-neon">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <h3 className="mt-4 flex items-center gap-2 text-[18px] font-black text-ink">
              خبر ثبت شد <PartyPopper className="h-5 w-5 text-neon" />
            </h3>
            <p className="mt-2 max-w-[280px] text-[12.5px] leading-6 text-ink-muted">{done.message}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-neon px-4 py-2 text-[13px] font-black text-neon-foreground">+{fa(done.points)} امتیاز</span>
              <span className="rounded-full border border-line bg-surface px-4 py-2 text-[12px] font-bold text-ink-muted">مرحله ۱: مدیر حوزه</span>
            </div>
            {done.badges.length > 0 && (
              <p className="mt-3 text-[12px] font-bold text-warn">نشان جدید: {done.badges.join("، ")}</p>
            )}
            <button onClick={close} className="mt-6 w-full rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground">
              عالیه، متوجه شدم
            </button>
          </div>
        ) : (
          <>
            <DialogHeader className="text-right">
              <DialogTitle className="text-ink">ارسال خبر جدید</DialogTitle>
              <DialogDescription className="text-ink-muted">
                مرحله {toFa(step + 1)} از {toFa(4)} — {STEPS[step]}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-neon" : "bg-surface-2")} />
              ))}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto nice-scroll pl-0.5">
              {step === 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {NEWS_CATEGORIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCategory(c.code)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[11.5px] font-bold transition-colors",
                        category === c.code ? "border-neon bg-neon/10 text-neon" : "border-line bg-surface text-ink-muted hover:text-ink",
                      )}
                    >
                      <span className="relative h-10 w-10 overflow-hidden rounded-xl">
                        <img src={`/img/cat-${c.code === "none" ? "local" : c.code}.png`} alt="" className="h-full w-full object-cover" />
                      </span>
                      {c.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setCategory("none")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-[11.5px] font-bold transition-colors",
                      category === "none" ? "border-neon bg-neon/10 text-neon" : "border-line bg-surface text-ink-muted",
                    )}
                  >
                    <ImageOff className="h-10 w-10 rounded-xl bg-surface-2 p-2.5" />
                    بدون دسته
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">تیتر خبر</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="تیتر جذاب و استاندارد خبر..." className="rounded-2xl border-line bg-surface text-ink placeholder:text-ink-muted/50" />
                    <p className="mt-1 text-[10px] text-ink-muted/70">{title.trim().length >= 8 ? "✓ تیتر مناسب است" : "حداقل ۸ کاراکتر"}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">متن کامل خبر</label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7} placeholder="لید: مهم‌ترین بخش خبر... سپس جزئیات، نقل‌قول و اطلاعات تکمیلی." className="rounded-2xl border-line bg-surface text-ink leading-7 placeholder:text-ink-muted/50" />
                    <p className="mt-1 text-[10px] text-ink-muted/70">{content.trim().length >= 30 ? `✓ ${fa(content.trim().length)} کاراکتر` : "حداقل ۳۰ کاراکتر"}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-ink-muted">زمان تهیه خبر: {fa(duration)} دقیقه</label>
                    <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={5} max={120} step={5} className="[&_[data-slot=slider-range]]:bg-neon [&_[data-slot=slider-thumb]]:border-neon" />
                  </div>
                  <button onClick={saveDraftNow} className="flex items-center gap-2 text-[12px] font-bold text-neon">
                    <Save className="h-4 w-4" />
                    ذخیره پیش‌نویس
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2.5">
                  {[
                    { key: "none", label: "بدون رسانه", desc: "فقط متن خبر", icon: <ImageOff className="h-5 w-5" /> },
                    { key: "photo", label: "عکس", desc: "تصویر میدانی از رویداد", icon: <ImageIcon className="h-5 w-5" /> },
                    { key: "video", label: "ویدیو", desc: "کلیپ کوتاه گزارش", icon: <Video className="h-5 w-5" /> },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMediaType(m.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors",
                        mediaType === m.key ? "border-neon bg-neon/8" : "border-line bg-surface hover:bg-surface-2",
                      )}
                    >
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", mediaType === m.key ? "bg-neon/15 text-neon" : "bg-surface-2 text-ink-muted")}>{m.icon}</span>
                      <span className="flex-1">
                        <span className="block text-[13.5px] font-bold text-ink">{m.label}</span>
                        <span className="block text-[11px] text-ink-muted">{m.desc}</span>
                      </span>
                      {mediaType === m.key && <CheckCircle2 className="h-5 w-5 text-neon" />}
                    </button>
                  ))}

                  {activeChallenges.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-[12px] font-semibold text-ink-muted">ثبت در چالش (اختیاری)</p>
                      <div className="flex flex-wrap gap-2">
                        {activeChallenges.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setChallengeId(challengeId === c.id ? null : c.id)}
                            className={cn(
                              "rounded-full border px-3.5 py-2 text-[11.5px] font-bold transition-colors",
                              challengeId === c.id ? "border-neon bg-neon text-neon-foreground" : "border-line bg-surface text-ink-muted",
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
                <div className="rounded-[24px] border border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-neon/12 px-3 py-1 text-[11px] font-bold text-neon">{CATEGORY_LABELS[category]}</span>
                    <span className="text-[10.5px] text-ink-muted">{mediaType === "none" ? "بدون رسانه" : mediaType === "photo" ? "با عکس" : "با ویدیو"} · {fa(duration)} دقیقه</span>
                  </div>
                  <h4 className="mt-3 text-[15.5px] font-black leading-7 text-ink">{title}</h4>
                  <p className="mt-2 line-clamp-6 whitespace-pre-line text-[12.5px] leading-6 text-ink-muted">{content}</p>
                  {challengeId && (
                    <p className="mt-3 rounded-xl bg-neon/8 px-3 py-2 text-[11px] font-bold text-neon">
                      ثبت‌شده برای چالش: {activeChallenges.find((c) => c.id === challengeId)?.title}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 rounded-full border border-line px-5 py-3 text-[13px] font-bold text-ink-muted transition-colors hover:text-ink">
                  <ArrowRight className="h-4 w-4" />
                  قبلی
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => canNext && setStep(step + 1)}
                  disabled={!canNext}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-neon py-3 text-[14px] font-bold text-neon-foreground transition-transform hover:scale-[1.01] disabled:opacity-40"
                >
                  مرحله بعد
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-neon py-3 text-[14px] font-bold text-neon-foreground disabled:opacity-50">
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
