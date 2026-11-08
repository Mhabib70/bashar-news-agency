"use client"

import { useEffect, useState, type CSSProperties, type JSX } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight, GraduationCap, Loader2, ShieldCheck, Plus, Trash2, FileDown, Video, FileText, X, UploadCloud,
  Search, Eye, Clock3, CheckCircle2, Circle, Sparkles, PlayCircle, BookOpenCheck, Users,
} from "lucide-react"
import { useApp, type TrainingItem } from "@/lib/store"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { NeonAvatar } from "@/components/app/bits"
import { jalali, relTime, toFa } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// ─────────── آکادمی خبرنگاران v2 ───────────
// فضای گرافیکی زنده مثل تالار v4: هیروپنل با نوار پیشرفت، دسته‌های گرادیانی،
// کارت درس با سطح/مدت/بازدید، خواننده درس با «خوانده شد»، آمار من
// مشاهده: همه اعضای فعال · افزودن و حذف: ادمین کل و مدیر حوزه

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp)(\?|$)/i

const CATEGORY_META: Record<string, { emoji: string; label: string; tile: string; tileShadow: string; chip: string; activeChip: string }> = {
  writing: {
    emoji: "✍️", label: "نگارش و لید",
    tile: "bg-gradient-to-br from-[#7bb661] to-[#2f6b33]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(47,107,51,0.65)]",
    chip: "bg-neon/10 text-neon border-neon/30",
    activeChip: "bg-[#2f6b33] text-white border-transparent",
  },
  photo: {
    emoji: "📷", label: "عکاسی خبری",
    tile: "bg-gradient-to-br from-[#38bdf8] to-[#075985]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(7,89,133,0.65)]",
    chip: "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30",
    activeChip: "bg-[#075985] text-white border-transparent",
  },
  reporting: {
    emoji: "🎙", label: "گزارشگری و مصاحبه",
    tile: "bg-gradient-to-br from-[#fbbf24] to-[#92400e]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(146,64,14,0.65)]",
    chip: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30",
    activeChip: "bg-[#92400e] text-white border-transparent",
  },
  media: {
    emoji: "📰", label: "رسانه و اخلاق",
    tile: "bg-gradient-to-br from-[#c084fc] to-[#6b21a8]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(107,33,168,0.6)]",
    chip: "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30",
    activeChip: "bg-[#6b21a8] text-white border-transparent",
  },
  tech: {
    emoji: "📱", label: "اپ و ابزار",
    tile: "bg-gradient-to-br from-[#fb7185] to-[#9f1239]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(159,18,57,0.6)]",
    chip: "bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/30",
    activeChip: "bg-[#9f1239] text-white border-transparent",
  },
}
const catMeta = (c: string) => CATEGORY_META[c] ?? CATEGORY_META.writing

const LEVEL_META: Record<string, { emoji: string; label: string; chip: string }> = {
  beginner: { emoji: "🌱", label: "مبتدی", chip: "bg-neon/10 text-neon border-neon/30" },
  intermediate: { emoji: "⭐", label: "متوسط", chip: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30" },
  advanced: { emoji: "🚀", label: "پیشرفته", chip: "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/30" },
}
const levelMeta = (l: string) => LEVEL_META[l] ?? LEVEL_META.beginner

const KIND_META: Record<string, { label: string; icon: JSX.Element }> = {
  text: { label: "متن آموزشی", icon: <FileText className="h-3 w-3" /> },
  file: { label: "فایل / PDF", icon: <FileDown className="h-3 w-3" /> },
  video: { label: "ویدئو", icon: <Video className="h-3 w-3" /> },
}

export default function TrainingPage() {
  const router = useRouter()
  const { userId, state, booted, login, fetchTrainings, createTraining, deleteTraining, viewTraining, toggleTrainingComplete, uploadMedia } = useApp()
  const { toast } = useToast()
  const [feed, setFeed] = useState<{ trainings: TrainingItem[]; stats: { total: number; completed: number; minutes: number } } | null>(null)
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [openLesson, setOpenLesson] = useState<TrainingItem | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ title: "", body: "", kind: "text", fileUrl: "", category: "writing", level: "beginner", minutes: 5 })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) login(uid).catch(() => router.replace("/"))
    else router.replace("/")
  }, [login, router])

  const load = () => {
    fetchTrainings().then((r) => setFeed(r ?? { trainings: [], stats: { total: 0, completed: 0, minutes: 0 } }))
  }
  useEffect(() => {
    if (userId) load()
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
  const items = feed?.trainings ?? null

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
    const r = await createTraining({ title: f.title.trim(), body: f.body.trim(), kind: f.kind, fileUrl: f.fileUrl, category: f.category, level: f.level, minutes: f.minutes })
    setBusy(false)
    if (r.ok) {
      toast({ title: "منتشر شد", description: r.message })
      setAddOpen(false)
      setF({ title: "", body: "", kind: "text", fileUrl: "", category: f.category, level: "beginner", minutes: 5 })
      load()
    } else {
      toast({ title: "خطا", description: r.message, variant: "destructive" })
    }
  }

  const remove = async (id: number) => {
    const r = await deleteTraining(id)
    if (r.ok) {
      toast({ title: "حذف شد", description: r.message })
      setOpenLesson(null)
      load()
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  // باز کردن درس — ثبت بازدید و به‌روزرسانی محلی
  const openLessonFn = (t: TrainingItem) => {
    setOpenLesson({ ...t, views: t.views + 1 })
    viewTraining(t.id)
  }

  const toggleComplete = async (t: TrainingItem) => {
    const r = await toggleTrainingComplete(t.id)
    if (r.ok) {
      const completed = !!r.completed
      setFeed((p) => {
        if (!p) return p
        const trainings = p.trainings.map((x) => x.id === t.id ? { ...x, completed, readers: x.readers + (completed ? 1 : -1) } : x)
        return { trainings, stats: { total: p.stats.total, completed: trainings.filter((x) => x.completed).length, minutes: trainings.filter((x) => x.completed).reduce((s, x) => s + x.minutes, 0) } }
      })
      setOpenLesson((ol) => ol && ol.id === t.id ? { ...ol, completed } : ol)
      toast({ description: r.message })
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const stats = feed?.stats ?? { total: 0, completed: 0, minutes: 0 }
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const nextLesson = items?.find((t) => !t.completed) ?? null

  const filtered = (items ?? [])
    .filter((t) => filter === "all" || t.category === filter)
    .filter((t) => !query.trim() || t.title.includes(query.trim()) || t.body.includes(query.trim()))

  // ── کارت درس ──
  const lessonCard = (t: TrainingItem, i: number) => {
    const meta = catMeta(t.category)
    const lv = levelMeta(t.level)
    return (
      <div key={t.id} className="fade-up" style={{ "--fd": `${Math.min(i, 6) * 55}ms` } as CSSProperties}>
        <div className={cn(
          "relative overflow-hidden rounded-[26px] border p-3.5 transition-all",
          t.completed
            ? "border-neon/45 bg-gradient-to-l from-neon/10 to-surface/85 shadow-[0_12px_30px_-16px_rgba(47,107,51,0.55)]"
            : "border-line bg-surface/85 shadow-sm backdrop-blur",
        )}>
          <div className="flex items-start gap-3">
            <button onClick={() => openLessonFn(t)} className="shrink-0" aria-label={`خواندن ${t.title}`}>
              <span className={cn("type-tile relative h-[54px] w-[54px] text-[25px]", meta.tile, meta.tileShadow)}>
                {meta.emoji}
                {t.completed && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-neon/60 bg-[var(--page)] text-neon shadow">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
            </button>
            <button onClick={() => openLessonFn(t)} className="min-w-0 flex-1 text-right">
              <p className="truncate text-[14.5px] font-black leading-6 text-ink">{t.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-muted">
                <span className="font-bold text-ink/75">{t.authorName || "مدیریت"}</span>
                <span>· {relTime(t.createdAt)}</span>
              </p>
              {t.body && <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-ink-muted">{t.body}</p>}
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[9.5px]">
                <span className={cn("rounded-full border px-2 py-0.5 font-bold", meta.chip)}>{meta.emoji} {meta.label}</span>
                <span className={cn("rounded-full border px-2 py-0.5 font-bold", lv.chip)}>{lv.emoji} {lv.label}</span>
                <span className="rounded-full border border-line bg-[var(--page)]/50 px-2 py-0.5 font-bold text-ink-muted"><Clock3 className="me-0.5 inline h-2.5 w-2.5" />{toFa(t.minutes)} دقیقه</span>
                <span className="rounded-full border border-line bg-[var(--page)]/50 px-2 py-0.5 font-bold text-ink-muted"><Eye className="me-0.5 inline h-2.5 w-2.5" />{toFa(t.views)}</span>
                {t.fileUrl && <span className="rounded-full border border-line bg-[var(--page)]/50 px-2 py-0.5 font-bold text-ink-muted">{KIND_META[t.kind]?.icon} {KIND_META[t.kind]?.label}</span>}
              </p>
            </button>
            {canManage && (
              <button onClick={() => remove(t.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-danger/30 bg-surface/80 text-danger-soft" aria-label="حذف">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="relative min-h-dvh bg-[var(--page)]">
      {/* ── پس‌زمینه گرافیکی ثابت: هاله‌های نور + شبکه نقطه‌ای ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span className="absolute -top-24 right-[-15%] h-[340px] w-[340px] rounded-full bg-neon/14 blur-[90px]" />
        <span className="absolute left-[-18%] top-1/3 h-[300px] w-[300px] rounded-full bg-[#38bdf8]/10 blur-[90px]" />
        <span className="absolute bottom-[-12%] right-1/4 h-[260px] w-[260px] rounded-full bg-[#c084fc]/8 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.14) 1px, transparent 1.4px)", backgroundSize: "24px 24px" }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)]/85 backdrop-blur-xl">
        <div className="relative z-10 mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface/90 text-ink backdrop-blur"
            aria-label="بازگشت"
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-[13.5px] font-black text-ink">
              <span className="type-tile h-7 w-7 rounded-[9px] bg-gradient-to-br from-[#7bb661] to-[#2f6b33] shadow-[0_6px_14px_-6px_rgba(47,107,51,0.6)]">
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              آکادمی خبرنگاران
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-neon">دسته‌بندی‌شده، سطح‌بندی‌شده، با پیشرفت شخصی</p>
          </div>
          <NeonAvatar name={user.fullName} src={user.avatar} size={38} />
          <div className="hidden sm:block"><ThemeToggle compact /></div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[720px] space-y-3.5 px-4 py-5">
        {/* هیرو پنل آکادمی */}
        <section className="fade-up relative overflow-hidden rounded-[28px] border border-neon/25 bg-gradient-to-l from-neon/14 via-surface/90 to-surface/75 p-5 shadow-[0_18px_44px_-20px_rgba(47,107,51,0.5)] backdrop-blur-xl">
          <span className="float-emoji absolute left-4 top-3 text-[26px] opacity-90" style={{ "--fr": "-12deg", "--fd": "0.2s" } as CSSProperties}>🎓</span>
          <span className="float-emoji absolute left-1/3 top-2.5 text-[15px] opacity-60" style={{ "--fr": "8deg", "--fd": "1.3s" } as CSSProperties}>✨</span>
          <span className="float-emoji absolute bottom-3 left-16 text-[17px] opacity-50" style={{ "--fr": "10deg", "--fd": "0.7s" } as CSSProperties}>📝</span>
          <span className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-neon/20 blur-3xl" aria-hidden />
          <p className="relative flex items-center gap-2">
            <span className="rounded-full border border-neon/40 bg-neon/12 px-2.5 py-0.5 text-[9.5px] font-black text-neon">
              <span className="me-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neon align-middle" />
              آکادمی فعال
            </span>
            <span className="rounded-full border border-line bg-surface/70 px-2.5 py-0.5 text-[9.5px] font-bold text-ink-muted">
              {toFa(stats.total)} درس · {toFa(stats.completed)} خوانده‌شده
            </span>
          </p>
          <h1 className="relative mt-2.5 text-[21px] font-black leading-8 text-ink">
            خبرنگار حرفه‌ای،
            <span className="bg-gradient-to-l from-neon to-[#7bb661] bg-clip-text text-transparent"> اینجا ساخته می‌شود </span>
          </h1>
          <p className="relative mt-1 text-[11.5px] leading-5 text-ink-muted">
            درس‌های کوتاه و کاربردی در پنج دسته — هر درس را که خواندید علامت بزنید تا پیشرفت‌تان کامل شود.
          </p>
          {/* نوار پیشرفت من */}
          <div className="relative mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-ink"><BookOpenCheck className="h-3.5 w-3.5 text-neon" /> پیشرفت آموزشی من</span>
              <span className="text-neon">{toFa(pct)}٪ · {toFa(stats.completed)} از {toFa(stats.total)} درس</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border border-line bg-[var(--page)]/70">
              <div
                className="relative h-full rounded-full bg-gradient-to-l from-neon to-[#7bb661] shadow-[0_0_14px_rgba(47,107,51,0.55)] transition-all duration-700"
                style={{ width: `${Math.max(pct, stats.total > 0 ? 4 : 0)}%` }}
              >
                <span className="absolute inset-0 rounded-full bg-white/25 mix-blend-overlay" />
              </div>
            </div>
            <p className="mt-1.5 text-[9.5px] text-ink-muted">⏱ {toFa(stats.minutes)} دقیقه آموزش خوانده‌اید — ادامه دهید!</p>
          </div>
        </section>

        {/* دکمه افزودن (مدیران) + ادامه یادگیری */}
        {canManage && (
          <button
            onClick={() => setAddOpen(true)}
            className="btn-glow flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-neon to-[#4e9c5c] py-3.5 text-[14px] font-black text-neon-foreground shadow-[0_12px_28px_-10px_rgba(47,107,51,0.65)] transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4.5 w-4.5" />
            آموزش جدید (انتشار برای همه + اعلان)
          </button>
        )}

        {/* سه کارت آمار من */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <GraduationCap className="h-4 w-4" />, label: "درس‌ها", value: toFa(stats.total), tone: "text-neon", ring: "border-neon/30 bg-neon/10" },
            { icon: <CheckCircle2 className="h-4 w-4" />, label: "خوانده‌شده", value: toFa(stats.completed), tone: "text-[#38bdf8]", ring: "border-[#38bdf8]/30 bg-[#38bdf8]/10" },
            { icon: <Clock3 className="h-4 w-4" />, label: "دقیقه یادگیری", value: toFa(stats.minutes), tone: "text-[#fbbf24]", ring: "border-[#fbbf24]/30 bg-[#fbbf24]/10" },
          ].map((c) => (
            <div key={c.label} className="fade-up rounded-2xl border border-line bg-surface/85 p-3 text-center backdrop-blur">
              <span className={cn("mx-auto flex h-8 w-8 items-center justify-center rounded-full border", c.ring, c.tone)}>{c.icon}</span>
              <p className={cn("mt-1.5 text-[16px] font-black leading-none", c.tone)}>{c.value}</p>
              <p className="mt-1 text-[9.5px] font-bold text-ink-muted">{c.label}</p>
            </div>
          ))}
        </div>

        {/* بنر ادامه یادگیری */}
        {nextLesson && stats.completed < stats.total && (
          <button
            onClick={() => openLessonFn(nextLesson)}
            className="shimmer-host fade-up relative block w-full overflow-hidden rounded-[26px] border border-[#38bdf8]/55 bg-gradient-to-l from-[#38bdf8]/18 via-[#38bdf8]/7 to-transparent p-4 text-right shadow-[0_14px_36px_-18px_rgba(7,89,133,0.5)]"
          >
            <span className="float-emoji absolute -left-2 -top-3 text-[58px] opacity-20" style={{ "--fr": "8deg", "--fd": "0.6s" } as CSSProperties}>📚</span>
            <span className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#38bdf8]/25 blur-2xl" aria-hidden />
            <p className="relative flex items-center gap-1.5 text-[11px] font-black text-[#38bdf8]">
              <Sparkles className="h-3.5 w-3.5" /> ادامه یادگیری — درس بعدی شما
            </p>
            <p className="relative mt-1.5 text-[13.5px] font-black leading-6 text-ink">{nextLesson.title}</p>
            <span className="relative mt-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-[#38bdf8] to-[#0284c7] px-3.5 py-1.5 text-[11px] font-black text-white shadow-[0_8px_18px_-8px_rgba(56,189,248,0.7)]">
              شروع درس ({toFa(nextLesson.minutes)} دقیقه) ←
            </span>
          </button>
        )}

        {/* جستجو */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در آموزش‌ها..."
            className="rounded-full border-line bg-surface/85 py-3 pr-10 text-[12.5px] text-ink backdrop-blur"
          />
        </div>

        {/* چیپ‌های فیلتر دسته — هر دسته با رنگ خودش */}
        {items && items.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter("all")}
              className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-all", filter === "all" ? "border-neon bg-neon text-neon-foreground shadow-[0_8px_18px_-8px_rgba(47,107,51,0.7)]" : "border-line bg-surface/85 text-ink-muted backdrop-blur")}
            >
              همه ({toFa(items.length)})
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const n = items.filter((t) => t.category === key).length
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-all",
                    filter === key ? cn(meta.activeChip, "shadow-md") : "border-line bg-surface/85 text-ink-muted backdrop-blur",
                  )}
                >
                  <span>{meta.emoji}</span>
                  {meta.label}
                  {n > 0 && <span className={cn("rounded-full px-1.5 text-[9px]", filter === key ? "bg-white/25" : "bg-surface-2")}>{toFa(n)}</span>}
                </button>
              )
            })}
          </div>
        )}

        {items === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
          </div>
        ) : items.length === 0 ? (
          /* ── حالت خالی جذاب ── */
          <div className="fade-up relative flex flex-col items-center gap-3 overflow-hidden rounded-[28px] border border-dashed border-line bg-surface/70 px-4 py-10 text-center backdrop-blur">
            <span className="float-emoji absolute left-6 top-6 text-[22px] opacity-70" style={{ "--fr": "-10deg" } as CSSProperties}>🎓</span>
            <span className="float-emoji absolute right-8 top-10 text-[18px] opacity-60" style={{ "--fr": "8deg", "--fd": "0.8s" } as CSSProperties}>✨</span>
            <img src="/img/hero.png" alt="آکادمی خبرنگاران" className="w-44 rounded-[22px] opacity-90 shadow-[0_0_44px_rgba(47,107,51,0.25)]" />
            <p className="mt-1 text-[15px] font-black text-ink">آکادمی هنوز درسی ندارد</p>
            <p className="max-w-[320px] text-[11.5px] leading-5 text-ink-muted">
              {canManage ? "اولین درس را منتشر کنید — خبرنگاران با اعلان از آن باخبر می‌شوند." : "مدیران خبرگزاری به‌زودی درس‌های آموزشی را اینجا منتشر می‌کنند."}
            </p>
            {canManage && (
              <div className="mt-2 grid w-full max-w-[340px] grid-cols-1 gap-2">
                {[
                  { cat: "writing", label: "✍️ درس نگارش و لید", desc: "اصول نوشتن لید خبری جذاب" },
                  { cat: "photo", label: "📷 درس عکاسی خبری", desc: "قاب‌بندی و لحظه‌یابی درست" },
                  { cat: "tech", label: "📱 درس اپ و ابزار", desc: "کار با اپ خبرگزاری و ابزارها" },
                ].map((b) => (
                  <button
                    key={b.cat}
                    onClick={() => { setF((p) => ({ ...p, category: b.cat })); setAddOpen(true) }}
                    className="flex items-center justify-between rounded-2xl border border-line bg-surface/90 px-4 py-3 text-right backdrop-blur transition-colors active:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold text-ink">{b.label}</span>
                      <span className="block truncate text-[10px] text-ink-muted">{b.desc}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-neon" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="fade-up flex flex-col items-center gap-2 rounded-[28px] border border-dashed border-line bg-surface/70 py-12 text-center backdrop-blur">
            <Search className="h-7 w-7 text-ink-muted" />
            <p className="text-[13px] font-bold text-ink">چیزی یافت نشد</p>
            <p className="text-[11px] text-ink-muted">عبارت جستجو یا فیلتر دسته را تغییر دهید</p>
          </div>
        ) : (
          /* ── کارت‌های درس ── */
          <div className="space-y-3">{filtered.map((t, i) => lessonCard(t, i))}</div>
        )}

        {items && items.length > 0 && (
          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[10px] text-ink-muted">
            <Users className="h-3 w-3" /> آموزش‌ها توسط ادمین کل و مدیران حوزه منتشر می‌شود · هر درس با اعلان همگانی اعلام می‌شود
          </p>
        )}
      </div>

      {/* ═══════════ خواننده درس — فضای شکیل مطالعه ═══════════ */}
      <Dialog open={!!openLesson} onOpenChange={(v) => !v && setOpenLesson(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-0 sm:max-w-[640px]">
          <DialogTitle className="sr-only">خواننده درس آموزشی</DialogTitle>
          <DialogDescription className="sr-only">مطالعه درس و علامت‌زدن خوانده‌شدن</DialogDescription>
          {openLesson && (() => {
            const meta = catMeta(openLesson.category)
            const lv = levelMeta(openLesson.level)
            return (
              <div>
                {/* هدر گرادیانی درس */}
                <div className={cn("relative overflow-hidden p-5 pb-6", meta.tile)}>
                  <span className="float-emoji absolute -left-2 -top-4 text-[70px] opacity-20" style={{ "--fr": "8deg", "--fd": "0.4s" } as CSSProperties}>{meta.emoji}</span>
                  <span className="absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" aria-hidden />
                  <div className="relative flex items-center justify-between">
                    <span className="rounded-full bg-black/25 px-2.5 py-1 text-[9.5px] font-black text-white backdrop-blur">
                      {meta.emoji} {meta.label}
                    </span>
                    <button onClick={() => setOpenLesson(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur" aria-label="بستن">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <h2 className="relative mt-3 text-[19px] font-black leading-8 text-white drop-shadow">{openLesson.title}</h2>
                  <div className="relative mt-2.5 flex flex-wrap items-center gap-2 text-[9.5px] font-bold">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-white backdrop-blur">
                      <NeonAvatar name={openLesson.authorName || "مدیریت"} size={18} />
                      {openLesson.authorName || "مدیریت"}
                    </span>
                    <span className="rounded-full bg-black/20 px-2.5 py-1 text-white backdrop-blur">{lv.emoji} {lv.label}</span>
                    <span className="rounded-full bg-black/20 px-2.5 py-1 text-white backdrop-blur"><Clock3 className="me-0.5 inline h-2.5 w-2.5" />{toFa(openLesson.minutes)} دقیقه</span>
                    <span className="rounded-full bg-black/20 px-2.5 py-1 text-white backdrop-blur"><Eye className="me-0.5 inline h-2.5 w-2.5" />{toFa(openLesson.views)} بازدید</span>
                    <span className="rounded-full bg-black/20 px-2.5 py-1 text-white/85 backdrop-blur">{jalali(openLesson.createdAt, true)}</span>
                  </div>
                </div>

                {/* بدنه درس */}
                <div className="p-5">
                  {openLesson.body ? (
                    <p className="whitespace-pre-line text-[13.5px] leading-8 text-ink/95">{openLesson.body}</p>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-line py-6 text-center text-[12px] text-ink-muted">متن این درس کوتاه است — محتوای اصلی در پیوست است.</p>
                  )}

                  {/* پیوست: ویدئو / عکس / فایل */}
                  {openLesson.fileUrl && IMG_RE.test(openLesson.fileUrl) && (
                    <img src={openLesson.fileUrl} alt="تصویر درس" className="mt-4 w-full rounded-2xl border border-line" loading="lazy" />
                  )}
                  {openLesson.fileUrl && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(openLesson.fileUrl) && (
                    <video src={openLesson.fileUrl} controls className="mt-4 w-full rounded-2xl border border-line" preload="metadata" />
                  )}
                  {openLesson.fileUrl && !IMG_RE.test(openLesson.fileUrl) && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(openLesson.fileUrl) && (
                    <a
                      href={openLesson.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("mt-4 flex items-center gap-3 rounded-2xl border p-3.5", meta.chip)}
                    >
                      <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-white", meta.tile)}>
                        {openLesson.kind === "video" ? <PlayCircle className="h-5 w-5" /> : <FileDown className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-black">{openLesson.kind === "video" ? "مشاهده ویدئوی آموزشی" : "دانلود فایل آموزشی (PDF و...)"}</span>
                        <span className="block truncate text-[10px] opacity-75" dir="ltr">{openLesson.fileUrl}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </a>
                  )}

                  {/* دکمه خوانده شد + حذف (مدیر) */}
                  <div className="mt-5 flex items-center gap-2">
                    <button
                      onClick={() => toggleComplete(openLesson)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[13.5px] font-black transition-all active:scale-[0.98]",
                        openLesson.completed
                          ? "border border-neon/50 bg-neon/12 text-neon"
                          : "bg-gradient-to-l from-neon to-[#4e9c5c] text-neon-foreground shadow-[0_12px_28px_-10px_rgba(47,107,51,0.65)]",
                      )}
                    >
                      {openLesson.completed ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Circle className="h-4.5 w-4.5" />}
                      {openLesson.completed ? "خوانده شد — آفرین! ✓" : "این درس را خواندم ✓"}
                    </button>
                    {canManage && (
                      <button onClick={() => remove(openLesson.id)} className="flex h-11 w-11 items-center justify-center rounded-full border border-danger/30 text-danger-soft" aria-label="حذف درس">
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2.5 flex items-center justify-center gap-1 text-[9.5px] text-ink-muted">
                    <Sparkles className="h-3 w-3" /> با خواندن درس‌ها، دانش خبرنگاری‌تان سطح‌به‌سطح بالا می‌رود
                  </p>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══════════ دیالوگ افزودن آموزش (مدیران) ═══════════ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-ink">
              <span className="type-tile h-8 w-8 rounded-xl bg-gradient-to-br from-[#7bb661] to-[#2f6b33] text-[15px]">🎓</span>
              انتشار درس جدید
            </DialogTitle>
            <DialogDescription className="text-ink-muted">برای همه خبرنگاران منتشر می‌شود و اعلان همگانی می‌رود.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="عنوان درس (مثلاً: اصول لیدنویسی)" className="rounded-2xl border-line bg-surface text-ink" />

            {/* انتخاب دسته */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold text-ink-muted">دسته آموزش:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setF({ ...f, category: key })}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                      f.category === key ? cn(meta.activeChip, "shadow-md") : "border-line bg-surface text-ink-muted",
                    )}
                  >
                    {meta.emoji} {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* انتخاب سطح + مدت */}
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="mb-1.5 text-[11px] font-bold text-ink-muted">سطح:</p>
                <div className="flex gap-1.5">
                  {Object.entries(LEVEL_META).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setF({ ...f, level: key })}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10.5px] font-bold transition-all",
                        f.level === key ? cn(meta.chip, "shadow-sm") : "border-line bg-surface text-ink-muted",
                      )}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-[110px]">
                <p className="mb-1.5 text-[11px] font-bold text-ink-muted">مدت (دقیقه):</p>
                <Input
                  type="number" min={1} max={180} value={f.minutes}
                  onChange={(e) => setF({ ...f, minutes: Math.min(180, Math.max(1, Number(e.target.value) || 5)) })}
                  className="rounded-xl border-line bg-surface text-center text-ink"
                />
              </div>
            </div>

            <Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={5} placeholder="متن درس... (نکات آموزشی را مرحله‌به‌مرحله بنویسید)" className="rounded-2xl border-line bg-surface text-[13px] leading-7 text-ink" />

            {f.fileUrl ? (
              <div className="flex items-center justify-between rounded-2xl border border-neon/35 bg-neon/8 px-4 py-3">
                <span className="truncate text-[12px] font-bold text-neon" dir="ltr">{f.fileUrl}</span>
                <button onClick={() => setF({ ...f, fileUrl: "", kind: "text" })} className="text-ink-muted"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-neon/40 bg-neon/5 px-4 py-5 text-center">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-neon" /> : <UploadCloud className="h-5 w-5 text-neon" />}
                <span className="text-[12.5px] font-bold text-ink">{uploading ? "در حال بارگذاری..." : "پیوست ویدئو، PDF یا تصویر (اختیاری)"}</span>
                <input type="file" accept="application/pdf,video/*,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}

            <button
              onClick={submit}
              disabled={busy || f.title.trim().length < 3}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-neon to-[#4e9c5c] py-3.5 text-[14px] font-black text-neon-foreground shadow-[0_12px_28px_-10px_rgba(47,107,51,0.65)] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <ShieldCheck className="h-4.5 w-4.5" />}
              {busy ? "در حال انتشار..." : "انتشار درس + اعلان همگانی"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
