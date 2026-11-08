"use client"

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight, MessagesSquare, Loader2, Plus, Trash2, Pin, PinOff, Send,
  Paperclip, X, Download, BarChart3, SmilePlus, Link2, Check, Reply, Image as ImageIcon,
  Crown, Trophy, TrendingUp, CheckCheck, Users, Medal,
} from "lucide-react"
import {
  useApp, type ForumTopicItem, type ForumMessageItem, type ForumMemberItem,
  type ForumPollItem, type ForumThreadResult, type ForumHonorRow,
  type ForumWeeklyQuestionItem, type ForumViewerStats,
} from "@/lib/store"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { NeonAvatar } from "@/components/app/bits"
import { relTime, jalali, toFa } from "@/lib/format"
import { ROLE_LABELS, FORUM_BADGES } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// تالار گفتگو v4 — فضای گرافیکی زنده: پس‌زمینه شور، هیرو پنل، سکوی افتخارات،
// تایل‌های گرادیانی تاپیک، حباب‌های تلگرامی با دنباله و قرص واکنش شناور
// ایجاد تاپیک و پیام: همه اعضای فعال · نظرسنجی: ادمین/مدیر حوزه · سوال هفته: ادمین · سنجاق/حذف تاپیک دیگران: ادمین

const REACTION_EMOJIS = ["😍", "👍", "🔥", "💡"] as const
const GROUP_WINDOW_MS = 5 * 60 * 1000 // پیام‌های پشت‌سرهم یک نفر گروه می‌شوند

const TOPIC_TYPE_META: Record<string, { emoji: string; label: string; chip: string; tile: string; tileShadow: string; activeChip: string }> = {
  class: {
    emoji: "🎓", label: "کلاس تصویری",
    chip: "bg-neon/10 text-neon border-neon/30",
    tile: "bg-gradient-to-br from-[#7bb661] to-[#2f6b33]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(47,107,51,0.65)]",
    activeChip: "bg-[#2f6b33] text-white border-transparent",
  },
  brainstorm: {
    emoji: "🤝", label: "هم‌فکری",
    chip: "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30",
    tile: "bg-gradient-to-br from-[#38bdf8] to-[#075985]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(7,89,133,0.65)]",
    activeChip: "bg-[#075985] text-white border-transparent",
  },
  announce: {
    emoji: "📣", label: "اطلاع‌رسانی",
    chip: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30",
    tile: "bg-gradient-to-br from-[#fbbf24] to-[#92400e]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(146,64,14,0.65)]",
    activeChip: "bg-[#92400e] text-white border-transparent",
  },
  challenge: {
    emoji: "🏆", label: "چالش",
    chip: "bg-[#fb923c]/10 text-[#fb923c] border-[#fb923c]/30",
    tile: "bg-gradient-to-br from-[#fb923c] to-[#9a3412]",
    tileShadow: "shadow-[0_10px_22px_-8px_rgba(154,52,18,0.65)]",
    activeChip: "bg-[#9a3412] text-white border-transparent",
  },
}
const typeMeta = (t: string) => TOPIC_TYPE_META[t] ?? TOPIC_TYPE_META.class

const ROLE_BADGE: Record<string, string> = {
  reporter: "bg-surface-2 text-ink-muted",
  district_manager: "bg-[#fbbf24]/10 text-[#fbbf24]",
  specialist: "bg-[#c084fc]/10 text-[#c084fc]",
  admin: "bg-neon/10 text-neon",
}
// رنگ نام نویسنده به‌جای نقش — مثل رنگ نام اعضا در گروه‌های تلگرام
const ROLE_NAME_COLOR: Record<string, string> = {
  reporter: "text-[#7dd3fc]",
  district_manager: "text-[#fbbf24]",
  specialist: "text-[#c084fc]",
  admin: "text-neon",
}
const PODIUM = [
  { medal: "🥇", h: 66, bar: "from-[#fbbf24]/45 to-[#fbbf24]/8 border-[#fbbf24]/70", ring: "ring-[#fbbf24]/70", glow: "shadow-[0_0_22px_rgba(251,191,36,0.35)]" },
  { medal: "🥈", h: 46, bar: "from-slate-300/35 to-slate-300/8 border-slate-300/55", ring: "ring-slate-300/55", glow: "" },
  { medal: "🥉", h: 34, bar: "from-[#d97706]/40 to-[#d97706]/8 border-[#d97706]/55", ring: "ring-[#d97706]/55", glow: "" },
]

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|bmp)(\?|$)/i
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i
const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g
const MENTION_KEY_RE = /(\uE000\d+\uE001)/g

const timeHM = (iso: string) => new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
const dayKey = (iso: string) => new Date(iso).toDateString()
const dayLabel = (iso: string) => {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) return "امروز"
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return "دیروز"
  return jalali(d)
}
const isActive = (iso?: string) => !!iso && Date.now() - new Date(iso).getTime() < 60 * 60 * 1000

export default function ForumPage() {
  const router = useRouter()
  const {
    userId, state, booted, login,
    fetchForumTopics, fetchForumMessages, createForumTopic,
    sendForumMessage, deleteForumTopic, deleteForumMessage, pinForumTopic, uploadMedia,
    reactForumMessage, createForumPoll, voteForumPoll, deleteForumPoll,
    setForumWeeklyQuestion,
  } = useApp()
  const { toast } = useToast()
  const [topics, setTopics] = useState<ForumTopicItem[] | null>(null)
  const [members, setMembers] = useState<ForumMemberItem[]>([])
  const [honor, setHonor] = useState<ForumHonorRow[]>([])
  const [myStats, setMyStats] = useState<ForumViewerStats | null>(null)
  const [weeklyQ, setWeeklyQ] = useState<ForumWeeklyQuestionItem | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [openTopic, setOpenTopic] = useState<ForumThreadResult | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState("class")
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [replyTo, setReplyTo] = useState<ForumMessageItem | null>(null)
  const [pickerFor, setPickerFor] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<number | null>(null)
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null)
  const [pollCreating, setPollCreating] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""])
  const [wqOpen, setWqOpen] = useState(false)
  const [wqText, setWqText] = useState("")
  const threadRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    // نشست از کوکی خوانده می‌شود؛ فقط تلاش برای بازیابی
    if (uid) login().catch(() => router.replace("/"))
    else router.replace("/")
  }, [login, router])

  const loadTopics = () =>
    fetchForumTopics().then((r) => {
      if (r) {
        setTopics(r.topics)
        setMembers(r.members)
        setHonor(r.honorBoard ?? [])
        setMyStats(r.viewerStats ?? null)
        setWeeklyQ(r.weeklyQuestion ?? null)
      } else setTopics([])
    })
  useEffect(() => {
    if (userId) loadTopics()
  }, [userId])

  const refreshThread = async (topicId: number) => {
    const fresh = await fetchForumMessages(topicId)
    if (fresh) setOpenTopic(fresh)
  }

  // تازه‌سازی زنده تاپیک باز هر ۱۵ ثانیه (گفتگوی زنده + نظرسنجی زنده)
  useEffect(() => {
    if (!openTopic) return
    const t = setInterval(() => refreshThread(openTopic.topic.id), 15000)
    return () => clearInterval(t)
  }, [openTopic?.topic.id])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [openTopic?.messages.length, openTopic?.polls.length])

  if (!booted || !state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--page)]">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </main>
    )
  }
  const user = state.user
  const isAdmin = user.role === "admin"
  const canPoll = isAdmin || user.role === "district_manager"

  const openT = async (id: number) => {
    const r = await fetchForumMessages(id)
    if (r) { setOpenTopic(r); setReplyTo(null); setPickerFor(null) }
    else toast({ title: "خطا", description: "تاپیک باز نشد", variant: "destructive" })
  }

  const createTopic = async () => {
    if (newTitle.trim().length < 3 || busy) return
    setBusy(true)
    const r = await createForumTopic(newTitle.trim(), newType)
    setBusy(false)
    if (r.ok) {
      toast({ title: "ساخته شد", description: r.message })
      setCreating(false)
      setNewTitle("")
      loadTopics()
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const send = async () => {
    if ((!msg.trim() && !fileUrl) || busy || !openTopic) return
    setBusy(true)
    const r = await sendForumMessage({ topicId: openTopic.topic.id, body: msg.trim(), fileUrl, replyToId: replyTo?.id ?? null })
    setBusy(false)
    if (r.ok) {
      setMsg("")
      setFileUrl("")
      setReplyTo(null)
      setMention(null)
      await refreshThread(openTopic.topic.id)
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const react = async (messageId: number, emoji: string) => {
    const r = await reactForumMessage(messageId, emoji)
    if (r.ok && openTopic) await refreshThread(openTopic.topic.id)
    else if (!r.ok) toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    const r = await uploadMedia(file)
    setUploading(false)
    if (r.ok && r.url) {
      setFileUrl(r.url!)
      toast({ title: "پیوست آماده شد" })
    } else toast({ title: "خطا در بارگذاری", description: r.message, variant: "destructive" })
  }

  const jumpTo = (id: number) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setFlashId(id)
      setTimeout(() => setFlashId(null), 1400)
    }
  }

  const submitWeeklyQuestion = async () => {
    if (wqText.trim().length < 5 || busy) return
    setBusy(true)
    const r = await setForumWeeklyQuestion(wqText.trim())
    setBusy(false)
    if (r.ok) {
      toast({ title: "سوال هفته ثبت شد", description: r.message })
      setWqOpen(false)
      setWqText("")
      loadTopics()
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  // ── منشن: تایپ @ → پاپ‌آپ انتخاب عضو ──
  const onMsgChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMsg(val)
    const caret = e.target.selectionStart ?? val.length
    const upto = val.slice(0, caret)
    const at = upto.lastIndexOf("@")
    const afterAt = upto.slice(at + 1)
    // نام‌های فارسی فاصله دارند → تا وقتی @ دیگری یا خط جدید نیامده، منشن باز می‌ماند
    if (at >= 0 && afterAt.length <= 40 && !afterAt.includes("@") && !afterAt.includes("\n") && members.length > 0) {
      setMention({ query: afterAt, start: at })
    } else setMention(null)
  }
  const pickMember = (name: string) => {
    if (!mention) return
    const ta = taRef.current
    const caretEnd = mention.start + 1 + mention.query.length
    const next = msg.slice(0, mention.start) + "@" + name + " " + msg.slice(caretEnd)
    setMsg(next)
    setMention(null)
    // کرسر باید دقیقاً بعد از نام درج‌شده بیفتد تا ادامه تایپ جابه‌جا نشود
    requestAnimationFrame(() => {
      const pos = mention.start + 1 + name.length + 1
      ta?.focus()
      ta?.setSelectionRange(pos, pos)
    })
  }
  const mentionMatches = mention
    ? members.filter((m) => m.id !== user.id && m.fullName.includes(mention.query)).slice(0, 6)
    : []

  // ── رندر متن پیام: منشن نئونی + لینک‌کارت ──
  const renderBody = (text: string) => {
    let protectedText = text
    const mentionMap = new Map<string, string>()
    const sorted = [...members].sort((a, b) => b.fullName.length - a.fullName.length)
    for (const mem of sorted) {
      const tag = `@${mem.fullName}`
      if (protectedText.includes(tag)) {
        const key = `\uE000${mentionMap.size}\uE001`
        protectedText = protectedText.split(tag).join(key)
        mentionMap.set(key, mem.fullName)
      }
    }
    const parts = protectedText.split(URL_SPLIT_RE)
    return parts.map((part, i) => {
      if (/^https?:\/\//.test(part)) {
        let host = part
        try { host = new URL(part).host } catch { /* بی‌اهمیت */ }
        return (
          <a key={`u${i}`} href={part} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/8 px-3 py-2 transition-transform active:scale-[0.98]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon/15"><Link2 className="h-3.5 w-3.5 text-neon" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-neon" dir="ltr">{host}</span>
              <span className="block text-[9.5px] text-ink-muted">مشاهده لینک پیوست‌شده</span>
            </span>
          </a>
        )
      }
      const segs = part.split(MENTION_KEY_RE)
      return segs.map((seg, j) => {
        const mm = seg.match(/^\uE000(\d+)\uE001$/)
        if (mm) {
          const name = mentionMap.get(seg) ?? ""
          return <span key={`m${i}-${j}`} className="rounded bg-neon/10 px-1 font-bold text-neon">@{name}</span>
        }
        return <span key={`t${i}-${j}`}>{seg}</span>
      })
    })
  }

  // ── پیوست‌ها: عکس داخل حباب + ویدیو + چیپ فایل ──
  const renderAttachment = (url: string) => {
    if (IMG_RE.test(url)) {
      return (
        <button onClick={() => setLightbox(url)} className="mt-2 block w-full overflow-hidden rounded-2xl border border-line/70">
          <img src={url} alt="پیوست تصویری" className="max-h-[240px] w-full object-cover" loading="lazy" />
        </button>
      )
    }
    if (VIDEO_RE.test(url)) {
      return (
        <video src={url} controls className="mt-2 max-h-[240px] w-full rounded-2xl border border-line/70" preload="metadata" />
      )
    }
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 self-start rounded-full border border-neon/40 bg-surface px-3 py-1.5 text-[11px] font-bold text-neon">
        <Download className="h-3.5 w-3.5" />
        مشاهده فایل پیوست
      </a>
    )
  }

  // ── خط زمانی ترکیبی پیام‌ها + نظرسنجی‌ها ──
  const timeline: (
    | { kind: "msg"; at: string; msg: ForumMessageItem }
    | { kind: "poll"; at: string; poll: ForumPollItem }
  )[] = openTopic
    ? [
        ...openTopic.messages.map((m) => ({ kind: "msg" as const, at: m.createdAt, msg: m })),
        ...openTopic.polls.map((p) => ({ kind: "poll" as const, at: p.createdAt, poll: p })),
      ].sort((a, b) => a.at.localeCompare(b.at))
    : []

  const createPoll = async () => {
    const options = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (pollQuestion.trim().length < 3 || options.length < 2 || busy || !openTopic) return
    setBusy(true)
    const r = await createForumPoll({ topicId: openTopic.topic.id, question: pollQuestion.trim(), options })
    setBusy(false)
    if (r.ok) {
      toast({ title: "نظرسنجی ساخته شد", description: r.message })
      setPollCreating(false)
      setPollQuestion("")
      setPollOptions(["", ""])
      await refreshThread(openTopic.topic.id)
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const vote = async (pollId: number, optionIndex: number) => {
    const r = await voteForumPoll(pollId, optionIndex)
    if (r.ok && openTopic) await refreshThread(openTopic.topic.id)
    else if (!r.ok) toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const removePoll = async (pollId: number) => {
    const r = await deleteForumPoll(pollId)
    if (r.ok) {
      toast({ description: r.message })
      if (openTopic) await refreshThread(openTopic.topic.id)
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const filteredTopics = topics?.filter((t) => filter === "all" || t.type === filter) ?? null

  // ── خط پروفایل بالای حباب (نام رنگی + سطح + بج نقش) ──
  const profileLine = (m: ForumMessageItem) => (
    <div className="mb-1 flex items-center gap-1.5 px-1">
      <span className={cn("text-[12px] font-black", ROLE_NAME_COLOR[m.authorRole] ?? "text-ink")}>{m.authorName}</span>
      {m.authorLevelEmoji && <span className="text-[10.5px]" title="سطح عضو">{m.authorLevelEmoji}</span>}
      {m.authorRole && (
        <span className={cn("rounded-full px-1.5 py-px text-[8.5px] font-bold", ROLE_BADGE[m.authorRole] ?? "bg-surface-2 text-ink-muted")}>
          {ROLE_LABELS[m.authorRole] ?? m.authorRole}
        </span>
      )}
    </div>
  )

  // ── ردیف پیام سبک تلگرام v4: حباب دنباله‌دار + قرص واکنش شناور ──
  const messageRow = (m: ForumMessageItem, grouped: boolean) => {
    const mine = m.userId === user.id
    const hasReactions = m.reactions.length > 0
    return (
      <div
        id={`msg-${m.id}`}
        className={cn(
          "msg-pop flex w-full gap-2",
          mine ? "justify-end" : "items-start",
          flashId === m.id && "rounded-2xl bg-neon/8 ring-1 ring-neon/50",
        )}
      >
        {/* آواتار نویسنده — فقط پیام‌های دیگران؛ پیام‌های گروهی فقط اول‌شان آواتار دارد */}
        {!mine && (
          grouped ? (
            <span className="w-[38px] shrink-0" aria-hidden />
          ) : (
            <span className="relative mt-5 shrink-0">
              <NeonAvatar name={m.authorName} src={m.authorAvatar} size={38} />
              {m.authorOnline && <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-[var(--page)] bg-[#22c55e]" />}
            </span>
          )
        )}
        <div className={cn("flex min-w-0 max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
          {!mine && !grouped && profileLine(m)}
          {mine && !grouped && (
            <div className="mb-1 flex items-center gap-1.5 px-1">
              <span className="text-[11.5px] font-bold text-ink-muted">شما</span>
              {m.authorLevelEmoji && <span className="text-[10.5px]">{m.authorLevelEmoji}</span>}
            </div>
          )}
          <div className="relative">
            <div
              className={cn(
                "border px-3.5 pb-1.5 pt-2.5",
                mine
                  ? "rounded-[20px] rounded-tl-[6px] border-neon/45 bg-gradient-to-b from-neon/22 to-neon/6 shadow-[0_8px_22px_-10px_rgba(47,107,51,0.55)]"
                  : "rounded-[20px] rounded-tr-[6px] border-line bg-surface/95 shadow-sm backdrop-blur",
              )}
            >
              {m.replyTo && (
                <button
                  onClick={() => jumpTo(m.replyTo!.id)}
                  className="mb-1.5 flex w-full items-start gap-1.5 rounded-xl border-r-2 border-neon/70 bg-neon/6 px-2 py-1.5 text-right"
                >
                  <Reply className="mt-0.5 h-3 w-3 shrink-0 text-neon" />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black text-neon">{m.replyTo.authorName}</span>
                    <span className="block truncate text-[10.5px] text-ink-muted">{m.replyTo.body || "پیوست"}</span>
                  </span>
                </button>
              )}
              {m.body && <div className="whitespace-pre-line break-words text-[13px] leading-6 text-ink">{renderBody(m.body)}</div>}
              {m.fileUrl && renderAttachment(m.fileUrl)}
              <p className={cn("mt-1 flex items-center justify-end gap-1 text-[8.5px] font-semibold text-ink-muted/75")}>
                {timeHM(m.createdAt)}
                {mine && <CheckCheck className="h-3 w-3 text-neon" aria-label="تحویل شد" />}
              </p>
            </div>
            {/* قرص واکنش‌ها — شناور روی لبه حباب، امضای تلگرام */}
            {hasReactions && (
              <div className={cn("absolute -bottom-3.5 z-10 flex gap-1", mine ? "left-2" : "right-2")}>
                {m.reactions.map((g) => (
                  <button
                    key={g.emoji}
                    onClick={() => react(m.id, g.emoji)}
                    title={g.users.map((u) => u.name).join("، ")}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold shadow-md backdrop-blur transition-transform active:scale-95",
                      g.mine ? "border-neon/60 bg-neon/20 text-neon" : "border-line bg-[var(--page)]/90 text-ink-muted",
                    )}
                  >
                    <span>{g.emoji}</span>
                    <span>{toFa(g.count)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* نوار ابزار پیام */}
          <div className={cn("mt-1 flex items-center gap-1 px-1", mine && "flex-row-reverse", hasReactions && "mt-4.5")}>
            <button
              onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface/80 text-ink-muted"
              aria-label="افزودن واکنش"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setReplyTo(m)}
              className="flex h-6 items-center gap-0.5 rounded-full border border-line bg-surface/80 px-2 text-[9.5px] font-bold text-ink-muted"
            >
              <Reply className="h-3 w-3" />
              پاسخ
            </button>
            {(mine || isAdmin) && (
              <button
                onClick={async () => {
                  const r = await deleteForumMessage(m.id)
                  if (r.ok) await refreshThread(openTopic!.topic.id)
                  else toast({ title: "خطا", description: r.message, variant: "destructive" })
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted/50 hover:text-danger-soft"
                aria-label="حذف پیام"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* پاپ‌آپ انتخاب واکنش */}
          {pickerFor === m.id && (
            <div className={cn("z-20 flex items-center gap-1.5 rounded-full border border-line bg-popover px-2.5 py-1.5 shadow-xl", mine && "flex-row-reverse")}>
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { react(m.id, e); setPickerFor(null) }}
                  className="text-[20px] transition-transform hover:scale-125 active:scale-95"
                  aria-label={`واکنش ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── کارت نظرسنجی با پروفایل سازنده (مثل یک پیام) ──
  const pollRow = (p: ForumPollItem) => {
    const mineP = p.createdBy === user.id
    const creator = openTopic?.members.find((m) => m.id === p.createdBy)
    const myVote = p.votes[user.id]
    const voted = myVote !== undefined
    const canDelete = isAdmin || p.createdBy === user.id
    return (
      <div className={cn("msg-pop flex w-full gap-2", mineP ? "justify-end" : "items-start")}>
        {!mineP && (
          <span className="relative mt-5 shrink-0">
            <NeonAvatar name={creator?.fullName ?? "عضو"} src={creator?.avatar ?? ""} size={38} />
          </span>
        )}
        <div className={cn("flex min-w-0 max-w-[88%] flex-col", mineP ? "items-end" : "items-start")}>
          {!mineP && (
            <div className="mb-1 flex items-center gap-1.5 px-1">
              <span className={cn("text-[12px] font-black", ROLE_NAME_COLOR[creator?.role ?? ""] ?? "text-ink")}>{creator?.fullName ?? "عضو"}</span>
              {creator?.levelEmoji && <span className="text-[10.5px]">{creator.levelEmoji}</span>}
              <span className="rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-1.5 py-px text-[8.5px] font-bold text-[#38bdf8]">نظرسنجی</span>
            </div>
          )}
          {mineP && (
            <div className="mb-1 flex items-center gap-1.5 px-1">
              <span className="text-[11.5px] font-bold text-ink-muted">شما · نظرسنجی</span>
            </div>
          )}
          <div className="w-full rounded-[20px] rounded-tr-[6px] border border-[#38bdf8]/40 bg-gradient-to-b from-[#38bdf8]/10 to-[#38bdf8]/4 p-3.5 shadow-[0_8px_22px_-10px_rgba(7,89,133,0.5)] backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="type-tile h-9 w-9 bg-gradient-to-br from-[#38bdf8] to-[#075985] shadow-[0_6px_16px_-6px_rgba(7,89,133,0.6)]">
                <BarChart3 className="h-4.5 w-4.5" />
              </span>
              <p className="flex-1 text-[13.5px] font-black leading-6 text-ink">{p.question}</p>
            </div>
            <div className="mt-3 space-y-2">
              {p.options.map((opt, i) => {
                const count = p.counts[i] ?? 0
                const pct = p.totalVotes > 0 ? Math.round((count / p.totalVotes) * 100) : 0
                const isMine = myVote === i
                if (!voted) {
                  return (
                    <button
                      key={i}
                      onClick={() => vote(p.id, i)}
                      className="flex w-full items-center justify-between rounded-xl border border-line bg-surface/90 px-3 py-2.5 text-right text-[12px] font-bold text-ink transition-colors active:bg-surface-2"
                    >
                      <span>{opt}</span>
                      <span className="text-[9.5px] font-bold text-[#38bdf8]">رأی بده</span>
                    </button>
                  )
                }
                return (
                  <button key={i} onClick={() => vote(p.id, i)} className={cn(
                    "relative block w-full overflow-hidden rounded-xl border px-3 py-2.5 text-right",
                    isMine ? "border-[#38bdf8]/60 bg-[#38bdf8]/12" : "border-line bg-surface/90",
                  )}>
                    <span className={cn("absolute inset-y-0 right-0 rounded-xl transition-all duration-500", isMine ? "bg-gradient-to-l from-[#38bdf8]/25 to-[#38bdf8]/10" : "bg-ink/8")} style={{ width: `${pct}%` }} />
                    <span className="relative flex items-center justify-between text-[12px] font-bold text-ink">
                      <span className="flex items-center gap-1.5 truncate">
                        {isMine && <Check className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />}
                        {opt}
                      </span>
                      <span className={cn("shrink-0 text-[10px]", isMine ? "text-[#38bdf8]" : "text-ink-muted")}>{toFa(pct)}٪ · {toFa(count)} رأی</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2.5 flex items-center justify-between text-[9.5px] text-ink-muted">
              <span>{toFa(p.totalVotes)} رأی ثبت شده · با لمس گزینه می‌توانید رأی خود را تغییر دهید · {timeHM(p.createdAt)}</span>
              {canDelete && (
                <button onClick={() => removePoll(p.id)} className="font-bold text-danger-soft/80" aria-label="حذف نظرسنجی">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const onlineCount = members.filter((m) => m.online).length

  return (
    <main className="relative min-h-dvh bg-[var(--page)]">
      {/* ── پس‌زمینه گرافیکی ثابت: هاله‌های نور + شبکه نقطه‌ای ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span className="absolute -top-24 right-[-15%] h-[340px] w-[340px] rounded-full bg-neon/14 blur-[90px]" />
        <span className="absolute left-[-18%] top-1/3 h-[300px] w-[300px] rounded-full bg-[#38bdf8]/10 blur-[90px]" />
        <span className="absolute bottom-[-12%] right-1/4 h-[260px] w-[260px] rounded-full bg-[#fbbf24]/8 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.14) 1px, transparent 1.4px)", backgroundSize: "24px 24px" }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)]/85 backdrop-blur-xl">
        <div className="relative z-10 mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <button
            onClick={() => (openTopic ? setOpenTopic(null) : router.push("/"))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface/90 text-ink backdrop-blur"
            aria-label="بازگشت"
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-[13.5px] font-black text-ink">
              {openTopic ? (
                <>
                  <span className={cn("type-tile h-7 w-7 rounded-[9px] text-[13px]", typeMeta(openTopic.topic.type).tile)}>
                    {typeMeta(openTopic.topic.type).emoji}
                  </span>
                  <span className="truncate">{openTopic.topic.title}</span>
                </>
              ) : (
                <>
                  <span className="type-tile h-7 w-7 rounded-[9px] bg-gradient-to-br from-[#7bb661] to-[#2f6b33] shadow-[0_6px_14px_-6px_rgba(47,107,51,0.6)]">
                    <MessagesSquare className="h-3.5 w-3.5" />
                  </span>
                  تالار گفتگو
                </>
              )}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-neon">
              {openTopic ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
                  {toFa(openTopic.topic.participants ?? 0)} عضو در گفتگو · آخرین فعالیت {relTime(openTopic.topic.lastActivity ?? openTopic.topic.createdAt)}
                </>
              ) : (
                "کلاس‌ها، هم‌فکری و اطلاع‌رسانی — زنده و واکنش‌دار"
              )}
            </p>
          </div>
          <NeonAvatar name={user.fullName} src={user.avatar} size={38} />
          <div className="hidden sm:block"><ThemeToggle compact /></div>
        </div>
      </header>

      {!openTopic ? (
        /* ───────────ه لابی تالار — فضای گرافیکی ─────────── */
        <div className="relative z-10 mx-auto w-full max-w-[720px] space-y-3.5 px-4 py-5">
          {/* هیرو پنل */}
          <section className="fade-up relative overflow-hidden rounded-[28px] border border-neon/25 bg-gradient-to-l from-neon/14 via-surface/90 to-surface/75 p-5 shadow-[0_18px_44px_-20px_rgba(47,107,51,0.5)] backdrop-blur-xl">
            <span className="float-emoji absolute left-4 top-3 text-[26px] opacity-90" style={{ "--fr": "-12deg", "--fd": "0.2s" } as CSSProperties}>💬</span>
            <span className="float-emoji absolute left-1/3 top-2.5 text-[15px] opacity-60" style={{ "--fr": "8deg", "--fd": "1.3s" } as CSSProperties}>✨</span>
            <span className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-neon/20 blur-3xl" aria-hidden />
            <p className="relative flex items-center gap-2">
              <span className="rounded-full border border-neon/40 bg-neon/12 px-2.5 py-0.5 text-[9.5px] font-black text-neon">
                <span className="me-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neon align-middle" />
                زنده
              </span>
              <span className="rounded-full border border-line bg-surface/70 px-2.5 py-0.5 text-[9.5px] font-bold text-ink-muted">
                {toFa(members.length)} عضو · {toFa(onlineCount)} آنلاین
              </span>
            </p>
            <h1 className="relative mt-2.5 text-[21px] font-black leading-8 text-ink">
              صدای شما،
              <span className="bg-gradient-to-l from-neon to-[#7bb661] bg-clip-text text-transparent"> فضای خبرگزاری </span>
              را زنده نگه می‌دارد
            </h1>
            <p className="relative mt-1 text-[11.5px] leading-5 text-ink-muted">
              کلاس تصویری بگذارید، هم‌فکری راه بیندازید و به پیام‌ها واکنش نشان بدهید — هر فعالیت، امتیاز تالار دارد.
            </p>
            {/* پشته آواتار اعضا */}
            <div className="relative mt-3.5 flex flex-wrap items-center gap-y-2">
              <div className="flex -space-x-2.5 space-x-reverse">
                {members.slice(0, 5).map((m) => (
                  <span key={m.id} className="relative inline-block rounded-[13px] ring-2 ring-[var(--page)]">
                    <NeonAvatar name={m.fullName} src={m.avatar} size={32} />
                    {m.online && <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--page)] bg-[#22c55e]" />}
                  </span>
                ))}
                {members.length > 5 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-[11px] border-2 border-[var(--page)] bg-surface-2 text-[9.5px] font-black text-ink-muted">
                    +{toFa(members.length - 5)}
                  </span>
                )}
              </div>
              {honor[0] && (
                <span className="ms-auto flex max-w-full items-center gap-1.5 rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-2.5 py-1 text-[9.5px] font-black text-[#fbbf24]">
                  <span className="shrink-0">👑</span>
                  <span className="min-w-0 truncate">{honor[0].fullName} — صدرنشین هفته</span>
                </span>
              )}
            </div>
          </section>

          {/* دکمه ساخت تاپیک + سوال هفته ادمین */}
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(true)}
              className="btn-glow flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-l from-neon to-[#4e9c5c] py-3.5 text-[14px] font-black text-neon-foreground shadow-[0_12px_28px_-10px_rgba(47,107,51,0.65)] transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4.5 w-4.5" />
              تاپیک جدید (موضوع گفتگو)
            </button>
            {isAdmin && (
              <button
                onClick={() => setWqOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-[#fbbf24]/50 bg-[#fbbf24]/12 px-4 text-[12px] font-black text-[#fbbf24] backdrop-blur"
                aria-label="سوال هفته"
              >
                <Crown className="h-4 w-4" />
                سوال هفته
              </button>
            )}
          </div>

          {/* سه کارت آمار من */}
          {myStats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <TrendingUp className="h-4 w-4" />, label: "امتیاز تالار", value: toFa(myStats.totalForumPoints), tone: "text-neon", ring: "border-neon/30 bg-neon/10" },
                { icon: <Trophy className="h-4 w-4" />, label: "امتیاز هفته", value: `+${toFa(myStats.weeklyScore)}`, tone: "text-[#fbbf24]", ring: "border-[#fbbf24]/30 bg-[#fbbf24]/10" },
                { icon: <Medal className="h-4 w-4" />, label: "رتبه هفته", value: myStats.rank ? toFa(myStats.rank) : "—", tone: "text-[#c084fc]", ring: "border-[#c084fc]/30 bg-[#c084fc]/10" },
              ].map((c) => (
                <div key={c.label} className="fade-up rounded-2xl border border-line bg-surface/85 p-3 text-center backdrop-blur">
                  <span className={cn("mx-auto flex h-8 w-8 items-center justify-center rounded-full border", c.ring, c.tone)}>{c.icon}</span>
                  <p className={cn("mt-1.5 text-[16px] font-black leading-none", c.tone)}>{c.value}</p>
                  <p className="mt-1 text-[9.5px] font-bold text-ink-muted">{c.label}</p>
                </div>
              ))}
            </div>
          )}
          {myStats && myStats.badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-bold text-ink-muted">نشان‌های شما:</span>
              {myStats.badges.map((b) => (
                <span key={b} title={FORUM_BADGES[b]?.desc ?? ""} className="rounded-full border border-line bg-surface/85 px-2 py-0.5 text-[10px] font-bold text-ink backdrop-blur">
                  {FORUM_BADGES[b]?.emoji} {FORUM_BADGES[b]?.title}
                </span>
              ))}
            </div>
          )}

          {/* بنر سوال هفته */}
          {weeklyQ && (
            <button
              onClick={() => openT(weeklyQ.topicId)}
              className="shimmer-host fade-up relative block w-full overflow-hidden rounded-[26px] border border-[#fbbf24]/55 bg-gradient-to-l from-[#fbbf24]/18 via-[#fbbf24]/7 to-transparent p-4 text-right shadow-[0_14px_36px_-18px_rgba(251,191,36,0.45)]"
            >
              <span className="float-emoji absolute -left-2 -top-3 text-[64px] opacity-20" style={{ "--fr": "8deg", "--fd": "0.6s" } as CSSProperties}>❓</span>
              <span className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#fbbf24]/25 blur-2xl" aria-hidden />
              <p className="relative flex items-center gap-1.5 text-[11px] font-black text-[#fbbf24]">
                ❓ سوال هفته
                {weeklyQ.creatorName && <span className="opacity-75">· {weeklyQ.creatorName}</span>}
              </p>
              <p className="relative mt-1.5 text-[13.5px] font-black leading-6 text-ink">{weeklyQ.question}</p>
              <span className="relative mt-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-[#fbbf24] to-[#f59e0b] px-3.5 py-1.5 text-[11px] font-black text-[#3b2b00] shadow-[0_8px_18px_-8px_rgba(251,191,36,0.7)]">
                به گفتگو بپیوندید ←
              </span>
            </button>
          )}

          {/* سکوی افتخارات هفته */}
          <section className="fade-up rounded-[26px] border border-line bg-surface/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13px] font-black text-ink">
                <Trophy className="h-4 w-4 text-[#fbbf24]" />
                افتخارات هفته
              </p>
              <p className="text-[9px] font-semibold text-ink-muted">۷ روز اخیر · پیام +۲ · واکنش +۱ · تاپیک +۵</p>
            </div>
            {honor.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line py-4 text-center text-[11.5px] text-ink-muted">
                هنوز کسی این هفته امتیاز نگرفته — اولین نفر باش! ✨
              </p>
            ) : (
              <>
                {/* سکوی سه‌ستونه با ارتفاع پله‌ای */}
                <div className="mt-4 flex items-end justify-center gap-2.5">
                  {[1, 0, 2].map((slot) => {
                    const row = honor[slot]
                    if (!row) return <span key={slot} className="flex-1" />
                    const p = PODIUM[slot]
                    return (
                      <div key={row.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <span className="text-[16px] leading-none">{p.medal}</span>
                        <NeonAvatar name={row.fullName} src={row.avatar} size={slot === 0 ? 44 : 34} className={cn("ring-2", p.ring, p.glow)} />
                        <p className="w-full truncate text-center text-[9.5px] font-black text-ink">{row.fullName}</p>
                        <span className="rounded-full bg-neon/10 px-2 py-0.5 text-[9px] font-black text-neon">+{toFa(row.weeklyScore)}</span>
                        <div
                          className={cn("mt-1 w-full rounded-t-2xl border-t-2 bg-gradient-to-b", p.bar)}
                          style={{ height: p.h }}
                          aria-hidden
                        />
                      </div>
                    )
                  })}
                </div>
                {/* نفرات بعدی */}
                {honor.length > 3 && (
                  <div className="mt-3 space-y-1.5 border-t border-line pt-2.5">
                    {honor.slice(3).map((row, i) => (
                      <div key={row.id} className="flex items-center gap-2 rounded-xl border border-line bg-[var(--page)]/45 px-2.5 py-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[9.5px] font-black text-ink-muted">{toFa(i + 4)}</span>
                        <NeonAvatar name={row.fullName} src={row.avatar} size={22} />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-ink">{row.fullName}</span>
                        <span className="text-[9px]" title={row.badges.map((b) => FORUM_BADGES[b]?.title ?? "").join("، ")}>
                          {row.badges.slice(0, 3).map((b) => <span key={b}>{FORUM_BADGES[b]?.emoji}</span>)}
                        </span>
                        <span className="rounded-full bg-neon/10 px-2 py-0.5 text-[9.5px] font-black text-neon">+{toFa(row.weeklyScore)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {/* راهنمای نشان‌ها */}
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
              {Object.entries(FORUM_BADGES).map(([key, b]) => (
                <span key={key} title={b.desc} className="rounded-full border border-line bg-[var(--page)]/50 px-2 py-0.5 text-[9px] font-bold text-ink-muted">
                  {b.emoji} {b.title}
                </span>
              ))}
            </div>
          </section>

          {/* چیپ‌های فیلتر نوع — هر نوع با رنگ خودش */}
          {topics && topics.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilter("all")}
                className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-all", filter === "all" ? "border-neon bg-neon text-neon-foreground shadow-[0_8px_18px_-8px_rgba(47,107,51,0.7)]" : "border-line bg-surface/85 text-ink-muted backdrop-blur")}
              >
                همه ({toFa(topics.length)})
              </button>
              {Object.entries(TOPIC_TYPE_META).map(([key, meta]) => {
                const n = topics.filter((t) => t.type === key).length
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

          {filteredTopics === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
            </div>
          ) : filteredTopics.length === 0 && (topics?.length ?? 0) === 0 ? (
            /* ── حالت خالی جذاب ── */
            <div className="fade-up relative flex flex-col items-center gap-3 overflow-hidden rounded-[28px] border border-dashed border-line bg-surface/70 px-4 py-10 text-center backdrop-blur">
              <span className="float-emoji absolute left-6 top-6 text-[22px] opacity-70" style={{ "--fr": "-10deg" } as CSSProperties}>💬</span>
              <span className="float-emoji absolute right-8 top-10 text-[18px] opacity-60" style={{ "--fr": "8deg", "--fd": "0.8s" } as CSSProperties}>✨</span>
              <img src="/img/hero.png" alt="تالار گفتگو" className="w-44 rounded-[22px] opacity-90 shadow-[0_0_44px_rgba(47,107,51,0.25)]" />
              <p className="mt-1 text-[15px] font-black text-ink">هنوز گفتگویی شروع نشده است</p>
              <p className="max-w-[320px] text-[11.5px] leading-5 text-ink-muted">
                تالار را زنده کنید — کلاس تصویری بگذارید، هم‌فکری راه بیندازید یا اطلاع‌رسانی کنید.
              </p>
              <div className="mt-2 grid w-full max-w-[340px] grid-cols-1 gap-2">
                {[
                  { type: "class", label: "🎓 کلاس تصویری بساز", desc: "جلسه و لینک کلاس را همین‌جا بگذارید" },
                  { type: "brainstorm", label: "🤝 هم‌فکری شروع کن", desc: "درباره یک موضوع همدیگر را مطلع کنید" },
                  { type: "announce", label: "📣 اطلاع‌رسانی بده", desc: "اعلام رسمی برای همه اعضا" },
                ].map((b) => (
                  <button
                    key={b.type}
                    onClick={() => { setNewType(b.type); setCreating(true) }}
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
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="fade-up flex flex-col items-center gap-2 rounded-[28px] border border-dashed border-line bg-surface/70 py-12 text-center backdrop-blur">
              <p className="text-[13px] font-bold text-ink">از این نوع تاپیکی نیست</p>
              <button onClick={() => { setNewType(filter); setCreating(true) }} className="rounded-full bg-neon px-4 py-2 text-[11.5px] font-bold text-neon-foreground">
                اولین تاپیک این نوع را بساز
              </button>
            </div>
          ) : (
            /* ── تایل‌های تاپیک — هر نوع با تایل گرادیانی خودش ── */
            filteredTopics.map((t, i) => {
              const meta = typeMeta(t.type)
              const live = isActive(t.lastActivity)
              return (
                <div key={t.id} className="fade-up" style={{ "--fd": `${Math.min(i, 6) * 55}ms` } as CSSProperties}>
                  <div className={cn(
                    "relative overflow-hidden rounded-[26px] border p-3.5 transition-all",
                    t.pinned
                      ? "border-neon/50 bg-gradient-to-l from-neon/10 to-surface/85 shadow-[0_12px_30px_-16px_rgba(47,107,51,0.55)]"
                      : "border-line bg-surface/85 shadow-sm backdrop-blur",
                    !t.pinned && live && "border-neon/30",
                  )}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => openT(t.id)} className="shrink-0" aria-label={`باز کردن ${t.title}`}>
                        <span className={cn("type-tile relative h-[54px] w-[54px] text-[25px]", meta.tile, meta.tileShadow)}>
                          {meta.emoji}
                          {t.pinned && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-neon/50 bg-[var(--page)] text-[9px] shadow">📌</span>
                          )}
                        </span>
                      </button>
                      <button onClick={() => openT(t.id)} className="min-w-0 flex-1 text-right">
                        <p className="truncate text-[14.5px] font-black leading-6 text-ink">{t.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-muted">
                          <span className="font-bold text-ink/75">{t.creatorName || "عضو"}</span>
                          <span>· {relTime(t.lastActivity ?? t.createdAt)}</span>
                          {live && (
                            <span className="flex items-center gap-1 rounded-full bg-neon/10 px-1.5 py-px text-[8.5px] font-black text-neon">
                              <span className="h-1 w-1 animate-pulse rounded-full bg-neon" /> فعال
                            </span>
                          )}
                        </p>
                        {t.lastMessage && (
                          <p className="mt-1.5 flex items-center gap-1 truncate rounded-xl bg-surface-2/70 px-2 py-1 text-[11px] text-ink-muted">
                            <span className="shrink-0 font-black text-ink/70">{t.lastMessage.authorName}:</span>
                            <span className="truncate">{t.lastMessage.body}</span>
                          </p>
                        )}
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[9.5px]">
                          <span className={cn("rounded-full border px-2 py-0.5 font-bold", meta.chip)}>{meta.emoji} {meta.label}</span>
                          <span className="rounded-full border border-line bg-[var(--page)]/50 px-2 py-0.5 font-bold text-ink-muted">💬 {toFa(t.replies ?? 0)} پیام</span>
                          {(t.participants ?? 0) > 0 && (
                            <span className="rounded-full border border-line bg-[var(--page)]/50 px-2 py-0.5 font-bold text-ink-muted">👥 {toFa(t.participants ?? 0)} نفر</span>
                          )}
                          <span className="text-ink-muted/70">{jalali(t.createdAt, true)}</span>
                        </p>
                      </button>
                      {isAdmin && (
                        <div className="flex shrink-0 flex-col gap-1.5">
                          <button onClick={async () => { const r = await pinForumTopic(t.id); if (r.ok) { toast({ description: r.message }); loadTopics() } }} className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/80 text-ink-muted" aria-label="سنجاق">
                            {t.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </button>
                          <button onClick={async () => { const r = await deleteForumTopic(t.id); if (r.ok) { toast({ description: r.message }); loadTopics() } else toast({ title: "خطا", description: r.message, variant: "destructive" }) }} className="flex h-8 w-8 items-center justify-center rounded-full border border-danger/30 bg-surface/80 text-danger-soft" aria-label="حذف">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* ───────────ه گفتگوی تاپیک — سبک تلگرام ─────────── */
        <div className="relative z-10 mx-auto flex w-full max-w-[720px] flex-col px-3 py-4" style={{ minHeight: "calc(100dvh - 120px)" }}>
          <div ref={threadRef} className="nice-scroll flex-1 space-y-3 overflow-y-auto pb-3" style={{ maxHeight: "calc(100dvh - 240px)" }}>
            {timeline.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="float-emoji text-[42px]" style={{ "--fr": "-6deg" } as CSSProperties}>💬</span>
                <p className="bg-gradient-to-l from-neon to-[#7bb661] bg-clip-text text-[15px] font-black text-transparent">اولین پیام را بفرستید</p>
                <p className="max-w-[280px] text-[11px] leading-5 text-ink-muted">مثلاً لینک کلاس تصویری یا سوال خود را بپرسید — هر پیام ‎+۲ امتیاز تالار دارد.</p>
              </div>
            )}
            {timeline.map((item, idx) => {
              const prev = idx > 0 ? timeline[idx - 1] : null
              const newDay = !prev || dayKey(prev.at) !== dayKey(item.at)
              const grouped =
                item.kind === "msg" &&
                prev?.kind === "msg" &&
                prev.msg.userId === item.msg.userId &&
                new Date(item.msg.createdAt).getTime() - new Date(prev.msg.createdAt).getTime() < GROUP_WINDOW_MS &&
                !newDay
              return (
                <Fragment key={item.kind === "msg" ? `m${item.msg.id}` : `p${item.poll.id}`}>
                  {newDay && (
                    <div className="flex justify-center py-1.5">
                      <span className="rounded-full border border-line bg-[var(--nav-bg)]/90 px-3.5 py-1 text-[10px] font-black text-ink-muted shadow-sm backdrop-blur">
                        {dayLabel(item.at)}
                      </span>
                    </div>
                  )}
                  {item.kind === "poll" ? pollRow(item.poll) : messageRow(item.msg, grouped)}
                </Fragment>
              )
            })}
          </div>

          {/* جعبه ارسال سبک تلگرام + پیش‌نمایش پاسخ + منشن */}
          <div className="sticky bottom-0 space-y-2 bg-gradient-to-t from-[var(--page)] via-[var(--page)]/92 to-transparent pt-3">
            {replyTo && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border-r-2 border-neon bg-neon/10 px-3 py-2 backdrop-blur">
                <span className="min-w-0 text-[10.5px] text-ink-muted">
                  <span className="font-bold text-neon">پاسخ به {replyTo.authorName}: </span>
                  <span className="truncate">{replyTo.body || "پیوست"}</span>
                </span>
                <button onClick={() => setReplyTo(null)} className="text-ink-muted" aria-label="لغو پاسخ"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            {fileUrl && (
              <div className="flex items-center justify-between rounded-2xl border border-neon/35 bg-neon/10 px-3 py-2 backdrop-blur">
                <span className="flex items-center gap-1.5 truncate text-[11px] font-bold text-neon" dir="ltr">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  {fileUrl}
                </span>
                <button onClick={() => setFileUrl("")} className="text-ink-muted" aria-label="حذف پیوست"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            {mentionMatches.length > 0 && (
              <div className="mx-1 rounded-2xl border border-line bg-popover/95 p-1.5 shadow-xl backdrop-blur">
                {mentionMatches.map((mem) => (
                  <button
                    key={mem.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickMember(mem.fullName)}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-surface-2"
                  >
                    <NeonAvatar name={mem.fullName} src={mem.avatar} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-bold text-ink">{mem.fullName}</span>
                      <span className="block text-[9px] text-ink-muted">{ROLE_LABELS[mem.role] ?? mem.role}</span>
                    </span>
                    {mem.online && <span className="h-2 w-2 rounded-full bg-[#22c55e]" />}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              {canPoll && (
                <button
                  onClick={() => setPollCreating(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#38bdf8]/40 bg-surface/90 text-[#38bdf8] backdrop-blur"
                  aria-label="نظرسنجی جدید"
                >
                  <BarChart3 className="h-4.5 w-4.5" />
                </button>
              )}
              <div className="flex flex-1 items-end gap-1 rounded-[26px] border border-line bg-surface/95 py-1.5 pl-2 pr-1.5 shadow-lg backdrop-blur">
                <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors active:bg-surface-2">
                  {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin text-neon" /> : <Paperclip className="h-4.5 w-4.5" />}
                  <input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                <Textarea
                  ref={taRef}
                  value={msg}
                  onChange={onMsgChange}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                  rows={1}
                  placeholder="پیام... (@ برای اشاره به عضو)"
                  className="max-h-[120px] min-h-[36px] flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[13px] text-ink focus-visible:ring-0"
                />
              </div>
              <button
                onClick={send}
                disabled={busy || (!msg.trim() && !fileUrl)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon to-[#2f6b33] text-neon-foreground shadow-[0_0_18px_rgba(47,107,51,0.45)] transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
                aria-label="ارسال"
              >
                <Send className="h-4.5 w-4.5 -translate-x-px" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تاپیک جدید — با انتخاب نوع */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">تاپیک جدید</DialogTitle>
            <DialogDescription className="text-ink-muted">نوع گفتگو را انتخاب و عنوان بدهید · +۵ امتیاز تالار</DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(TOPIC_TYPE_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setNewType(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[12px] font-bold transition-colors",
                  newType === key ? "border-neon bg-neon/10 text-neon" : "border-line bg-surface text-ink-muted",
                )}
              >
                <span>{meta.emoji}</span>
                {meta.label}
                {newType === key && <Check className="mr-auto h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTopic()} placeholder="عنوان تاپیک — مثلاً «کلاس تصویری اصول خبرنویسی»" className="mt-3 rounded-2xl border-line bg-surface text-ink" />
          <button onClick={createTopic} disabled={busy || newTitle.trim().length < 3} className="mt-4 w-full rounded-full bg-gradient-to-l from-neon to-[#4e9c5c] py-3.5 text-[14px] font-black text-neon-foreground disabled:opacity-50">
            {busy ? "..." : "ایجاد تاپیک"}
          </button>
        </DialogContent>
      </Dialog>

      {/* نظرسنجی جدید */}
      <Dialog open={pollCreating} onOpenChange={setPollCreating}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-1.5 text-ink"><BarChart3 className="h-4 w-4 text-[#38bdf8]" /> نظرسنجی جدید</DialogTitle>
            <DialogDescription className="text-ink-muted">سوال و گزینه‌ها را وارد کنید — اعضا داخل همین تاپیک رأی می‌دهند</DialogDescription>
          </DialogHeader>
          <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="سوال نظرسنجی — مثلاً «بهترین ساعت کلاس تصویری؟»" className="mt-3 rounded-2xl border-line bg-surface text-ink" />
          <div className="mt-3 space-y-2">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-ink-muted">{toFa(i + 1)}</span>
                <Input
                  value={opt}
                  onChange={(e) => setPollOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                  placeholder={`گزینه ${toFa(i + 1)}`}
                  className="rounded-2xl border-line bg-surface text-ink"
                />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))} className="text-ink-muted" aria-label="حذف گزینه">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => setPollOptions((prev) => (prev.length < 5 ? [...prev, ""] : prev))}
              disabled={pollOptions.length >= 5}
              className="flex items-center gap-1 text-[11px] font-bold text-[#38bdf8] disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> گزینه بیشتر
            </button>
            <span className="text-[9.5px] text-ink-muted">حداقل ۲ گزینه · حداکثر ۵ گزینه</span>
          </div>
          <button
            onClick={createPoll}
            disabled={busy || pollQuestion.trim().length < 3 || pollOptions.filter((o) => o.trim()).length < 2}
            className="mt-4 w-full rounded-full bg-[#38bdf8] py-3.5 text-[14px] font-bold text-[#082032] disabled:opacity-50"
          >
            {busy ? "..." : "ایجاد نظرسنجی"}
          </button>
        </DialogContent>
      </Dialog>

      {/* سوال هفته — فقط ادمین */}
      <Dialog open={wqOpen} onOpenChange={setWqOpen}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-1.5 text-ink"><Crown className="h-4 w-4 text-[#fbbf24]" /> سوال هفته ادمین</DialogTitle>
            <DialogDescription className="text-ink-muted">
              سوال ثبت می‌شود، تاپیک گفتگوی سنجاق‌شده ساخته می‌شود و به همه اعضا اعلان می‌رود.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={wqText}
            onChange={(e) => setWqText(e.target.value)}
            rows={3}
            placeholder="مثلاً «موفق‌ترین برنامه پایگاه شما این ماه چه بود و چرا؟»"
            className="mt-3 rounded-2xl border-line bg-surface text-[13px] text-ink"
          />
          <button
            onClick={submitWeeklyQuestion}
            disabled={busy || wqText.trim().length < 5}
            className="mt-4 w-full rounded-full bg-[#fbbf24] py-3.5 text-[14px] font-bold text-[#3b2b00] disabled:opacity-50"
          >
            {busy ? "..." : "ثبت و اطلاع‌رسانی به همه"}
          </button>
        </DialogContent>
      </Dialog>

      {/* لایت‌باکس تصویر */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="نمایش پیوست" className="max-h-[85dvh] max-w-full rounded-2xl border border-line object-contain" />
          <a
            href={lightbox}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-neon/40 bg-black/60 px-4 py-2 text-[11.5px] font-bold text-neon"
          >
            باز کردن در تب جدید
          </a>
          <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-ink" aria-label="بستن" onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </main>
  )
}
