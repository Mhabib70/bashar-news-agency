"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MessagesSquare, Loader2, Plus, Trash2, Pin, PinOff, Send, Paperclip, X, Download } from "lucide-react"
import { useApp, type ForumTopicItem, type ForumMessageItem } from "@/lib/store"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { NeonAvatar } from "@/components/app/bits"
import { relTime, jalali } from "@/lib/format"
import { ROLE_LABELS } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// تالار گفتگو — تاپیک‌ها و پیام‌ها (کلاس تصویری با لینک، هم‌فکری، اطلاع‌رسانی)
// ایجاد تاپیک و پیام: همه اعضای فعال · سنجاق و حذف تاپیک دیگران: ادمین
export default function ForumPage() {
  const router = useRouter()
  const {
    userId, state, booted, login,
    fetchForumTopics, fetchForumMessages, createForumTopic,
    sendForumMessage, deleteForumTopic, deleteForumMessage, pinForumTopic, uploadMedia,
  } = useApp()
  const { toast } = useToast()
  const [topics, setTopics] = useState<ForumTopicItem[] | null>(null)
  const [openTopic, setOpenTopic] = useState<{ topic: ForumTopicItem; messages: ForumMessageItem[] } | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [msg, setMsg] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) login(uid).catch(() => router.replace("/"))
    else router.replace("/")
  }, [login, router])

  const loadTopics = () => fetchForumTopics().then(setTopics)
  useEffect(() => {
    if (userId) loadTopics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // تازه‌سازی زنده تاپیک باز هر ۱۵ ثانیه (کلاس و گفتگوی زنده)
  useEffect(() => {
    if (!openTopic) return
    const t = setInterval(async () => {
      const fresh = await fetchForumMessages(openTopic.topic.id)
      if (fresh) setOpenTopic(fresh)
    }, 15000)
    return () => clearInterval(t)
  }, [openTopic, fetchForumMessages])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [openTopic?.messages.length])

  if (!booted || !state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--page)]">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </main>
    )
  }
  const user = state.user
  const isAdmin = user.role === "admin"

  const openT = async (id: number) => {
    const r = await fetchForumMessages(id)
    if (r) setOpenTopic(r)
    else toast({ title: "خطا", description: "تاپیک باز نشد", variant: "destructive" })
  }

  const createTopic = async () => {
    if (newTitle.trim().length < 3 || busy) return
    setBusy(true)
    const r = await createForumTopic(newTitle.trim())
    setBusy(false)
    if (r.ok) {
      toast({ title: "ساخته شد", description: r.message })
      setCreating(false)
      setNewTitle("")
      loadTopics()
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
  }

  const send = async () => {
    if ((!msg.trim() && !fileUrl) || busy) return
    if (!openTopic) return
    setBusy(true)
    const r = await sendForumMessage({ topicId: openTopic.topic.id, body: msg.trim(), fileUrl })
    setBusy(false)
    if (r.ok) {
      setMsg("")
      setFileUrl("")
      const fresh = await fetchForumMessages(openTopic.topic.id)
      if (fresh) setOpenTopic(fresh)
    } else toast({ title: "خطا", description: r.message, variant: "destructive" })
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

  const linkify = (text: string) =>
    text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noreferrer" className="font-bold text-neon underline underline-offset-4" dir="ltr">
          {part.length > 48 ? part.slice(0, 45) + "…" : part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      ),
    )

  return (
    <main className="min-h-dvh bg-[var(--page)]">
      <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <button
            onClick={() => (openTopic ? setOpenTopic(null) : router.push("/"))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink"
            aria-label="بازگشت"
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[13.5px] font-black text-ink">
              <MessagesSquare className="h-4 w-4 text-neon" />
              {openTopic ? openTopic.topic.title : "تالار گفتگو"}
            </p>
            <p className="text-[10px] font-semibold text-neon">
              {openTopic ? `${openTopic.messages.length} پیام · به‌روزرسانی خودکار` : "کلاس‌ها، هم‌فکری و اطلاع‌رسانی"}
            </p>
          </div>
          <NeonAvatar name={user.fullName} src={user.avatar} size={38} />
          <div className="hidden sm:block"><ThemeToggle compact /></div>
        </div>
      </header>

      {!openTopic ? (
        /* ---- فهرست تاپیک‌ها ---- */
        <div className="mx-auto w-full max-w-[720px] space-y-3 px-4 py-5">
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground btn-glow"
          >
            <Plus className="h-4.5 w-4.5" />
            تاپیک جدید (موضوع گفتگو)
          </button>

          {topics === null ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
            </div>
          ) : topics.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[26px] border border-dashed border-line py-14 text-center">
              <MessagesSquare className="h-9 w-9 text-neon/60" />
              <p className="text-[14px] font-bold text-ink">هنوز گفتگویی شروع نشده است</p>
              <p className="max-w-[300px] text-[11.5px] leading-5 text-ink-muted">
                اولین تاپیک را بسازید — مثلاً «کلاس تصویری خبرنویسی» و لینک جلسه را داخلش بفرستید.
              </p>
            </div>
          ) : (
            topics.map((t) => (
              <div key={t.id} className={cn("rounded-[24px] border p-4", t.pinned ? "border-neon/40 bg-neon/5" : "border-line bg-surface")}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => openT(t.id)} className="min-w-0 flex-1 text-right">
                    <p className="flex items-center gap-1.5 text-[14px] font-black text-ink">
                      {t.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-neon" />}
                      {t.title}
                    </p>
                    <p className="mt-1 text-[10.5px] text-ink-muted">
                      {t.creatorName || "عضو"} · {jalali(t.createdAt, true)} · {t.replies ?? 0} پیام
                    </p>
                    {t.lastMessage && (
                      <p className="mt-1.5 truncate text-[11.5px] text-ink-muted/80">
                        {t.lastMessage.authorName}: {t.lastMessage.body}
                      </p>
                    )}
                  </button>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={async () => { const r = await pinForumTopic(t.id); if (r.ok) { toast({ description: r.message }); loadTopics() } }} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted" aria-label="سنجاق">
                        {t.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                      <button onClick={async () => { const r = await deleteForumTopic(t.id); if (r.ok) { toast({ description: r.message }); loadTopics() } else toast({ title: "خطا", description: r.message, variant: "destructive" }) }} className="flex h-8 w-8 items-center justify-center rounded-full border border-danger/30 text-danger-soft" aria-label="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ---- پیام‌های تاپیک ---- */
        <div className="mx-auto flex w-full max-w-[720px] flex-col px-4 py-4" style={{ minHeight: "calc(100dvh - 120px)" }}>
          <div ref={threadRef} className="nice-scroll flex-1 space-y-2.5 overflow-y-auto pb-3" style={{ maxHeight: "calc(100dvh - 240px)" }}>
            {openTopic.messages.length === 0 && (
              <p className="py-8 text-center text-[12.5px] text-ink-muted">اولین پیام را بفرستید — مثلاً لینک کلاس تصویری.</p>
            )}
            {openTopic.messages.map((m) => {
              const mine = m.userId === user.id
              return (
                <div key={m.id} className={cn("flex flex-col items-start", mine && "items-end")}>
                  <div className={cn("max-w-[85%] rounded-[20px] border p-3", mine ? "border-neon/35 bg-neon/8" : "border-line bg-surface")}>
                    <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-ink-muted">
                      {mine ? "شما" : m.authorName}
                      {m.authorRole && !mine && <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-ink-muted">{ROLE_LABELS[m.authorRole] ?? m.authorRole}</span>}
                      <span className="opacity-70">· {relTime(m.createdAt)}</span>
                    </p>
                    {m.body && <p className="mt-1 whitespace-pre-line text-[12.5px] leading-6 text-ink/90 break-words">{linkify(m.body)}</p>}
                    {m.fileUrl && (
                      <a href={m.fileUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 rounded-full border border-neon/40 bg-surface px-3 py-1.5 text-[11px] font-bold text-neon">
                        <Download className="h-3.5 w-3.5" />
                        مشاهده فایل پیوست
                      </a>
                    )}
                  </div>
                  {(mine || isAdmin) && (
                    <button
                      onClick={async () => {
                        const r = await deleteForumMessage(m.id)
                        if (r.ok) {
                          const fresh = await fetchForumMessages(openTopic.topic.id)
                          if (fresh) setOpenTopic(fresh)
                        } else toast({ title: "خطا", description: r.message, variant: "destructive" })
                      }}
                      className="mt-0.5 text-[9.5px] font-bold text-ink-muted/60 hover:text-danger-soft"
                    >
                      حذف
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* جعبه ارسال */}
          <div className="sticky bottom-0 space-y-2 border-t border-line bg-[var(--page)] pt-3">
            {fileUrl && (
              <div className="flex items-center justify-between rounded-2xl border border-neon/35 bg-neon/8 px-3 py-2">
                <span className="truncate text-[11px] font-bold text-neon" dir="ltr">{fileUrl}</span>
                <button onClick={() => setFileUrl("")} className="text-ink-muted"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-muted">
                {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin text-neon" /> : <Paperclip className="h-4.5 w-4.5" />}
                <input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder="پیام خود را بنویسید... (لینک کلاس را همین‌جا بفرستید)"
                className="min-h-[44px] flex-1 rounded-2xl border-line bg-surface px-4 py-2.5 text-[13px] text-ink"
              />
              <button onClick={send} disabled={busy} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neon text-neon-foreground disabled:opacity-50">
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تاپیک جدید */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">تاپیک جدید</DialogTitle>
            <DialogDescription className="text-ink-muted">موضوع گفتگو — مثلاً «کلاس تصویری اصول خبرنویسی»</DialogDescription>
          </DialogHeader>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTopic()} placeholder="عنوان تاپیک" className="mt-3 rounded-2xl border-line bg-surface text-ink" />
          <button onClick={createTopic} disabled={busy || newTitle.trim().length < 3} className="mt-4 w-full rounded-full bg-neon py-3.5 text-[14px] font-bold text-neon-foreground disabled:opacity-50">
            {busy ? "..." : "ایجاد تاپیک"}
          </button>
        </DialogContent>
      </Dialog>
    </main>
  )
}
