"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, SwitchCamera, Zap, Trophy, Flame, BellRing, ShieldCheck, Users2, Timer, Award, ChevronDown, BadgeCheck, Share2, FileDown, Camera, Trash2, Loader2, Landmark } from "lucide-react"
import { useApp } from "@/lib/store"
import { Ring, SectionHeader, Avatar } from "@/components/app/bits"
import { fa, faNum, jalali } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS, EDUCATION_LABELS, LEVELS, levelIndex } from "@/lib/domain"
import { fileToAvatarDataUrl } from "@/lib/image"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export function ProfileScreen({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  const { state, saveSettings, logout, uploadAvatar } = useApp()
  const { toast } = useToast()
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!state) return null
  const { user, stats } = state

  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    setUploading(true)
    try {
      const dataUrl = await fileToAvatarDataUrl(f)
      const r = await uploadAvatar(dataUrl)
      if (r.ok) toast({ title: "ثبت شد", description: "عکس پروفایل شما به‌روزرسانی شد" })
      else toast({ title: "خطا", description: r.message, variant: "destructive" })
    } catch (err) {
      toast({ title: "خطا", description: (err as Error).message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    setUploading(true)
    const r = await uploadAvatar("")
    setUploading(false)
    if (r.ok) toast({ title: "حذف شد", description: "عکس پروفایل حذف شد" })
  }

  const lvIdx = levelIndex(user.levelKey)
  const lv = LEVELS[lvIdx]
  const nx = LEVELS[lvIdx + 1] ?? null
  const progressToNext = nx ? Math.min(100, Math.round(((user.points - lv.min) / (nx.min - lv.min)) * 100)) : 100

  const unlockedBadges = state.badges.filter((b) => b.unlocked).length

  const shareCard = async () => {
    const text = `🎖 کارت خبرنگاری دیجیتال\n${user.fullName}\n${ROLE_LABELS[user.role]} · ${DISTRICT_LABELS[user.district] ?? ""}\n${user.base}\nسطح: ${user.levelEmoji} ${user.levelTitle} · ${faNum(user.points)} امتیاز\nعضو از ${jalali(user.createdAt, true)}\n📰 خبرگزاری بسیج شهر رشت`
    try {
      if (navigator.share) await navigator.share({ title: "کارت خبرنگاری", text })
      else {
        await navigator.clipboard.writeText(text)
        toast({ title: "کپی شد", description: "متن کارت در کلیپ‌بورد قرار گرفت" })
      }
    } catch {
      /* لغو کاربر */
    }
  }

  const setNotif = async (k: string, v: boolean) => {
    setBusy(true)
    const r = await saveSettings({ [k]: v })
    setBusy(false)
    if (r.ok) toast({ title: "ذخیره شد", description: r.message })
  }

  return (
    <div className="stage-enter flex flex-col gap-5 px-5 pb-4 pt-6">
      {/* هدر پروفایل */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="inline-flex rounded-full border-[3px] border-[var(--v3-azure)]/50 p-1 shadow-[0_12px_28px_-12px_rgba(37,99,235,0.55)]">
            <Avatar name={user.fullName} src={user.avatar} size={72} />
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1.5 -left-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v3-azure)] text-white shadow-[0_8px_18px_-6px_rgba(37,99,235,0.7)] ring-2 ring-[var(--v3-page)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
            aria-label="تغییر عکس پروفایل"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          {user.avatar && !uploading && (
            <button
              onClick={removeAvatar}
              className="absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-md ring-2 ring-[var(--v3-page)] dark:bg-red-500/15 dark:text-red-400"
              aria-label="حذف عکس پروفایل"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-black text-[var(--v3-ink)]">{user.fullName}</h1>
          <p className="mt-0.5 text-[11.5px] text-[var(--v3-ink-2)]">
            {ROLE_LABELS[user.role]}
            {user.district && ` · ${DISTRICT_LABELS[user.district]}`}
          </p>
          {user.base && <p className="text-[11px] text-[var(--v3-ink-2)]/80">{user.base}</p>}
        </div>
      </div>

      {/* کارت خبرنگاری */}
      <div>
        <SectionHeader title="کارت خبرنگاری دیجیتال" />
        <div className="v3-card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[var(--v3-azure)]/15 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-black text-[var(--v3-azure)]">
              <BadgeCheck className="h-4 w-4" />
              خبرگزاری بسیج شهر رشت
            </span>
            <span className="rounded-full bg-[var(--v3-azure-soft)] px-2.5 py-1 font-mono text-[9px] font-bold text-[var(--v3-azure-deep)] dark:text-[#93c5fd]" dir="ltr">
              {user.username}
            </span>
          </div>
          <div className="relative mt-4 flex items-center gap-3.5">
            <Avatar name={user.fullName} src={user.avatar} size={54} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black text-[var(--v3-ink)]">{user.fullName}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[var(--v3-ink-2)]">
                {ROLE_LABELS[user.role]}
                {user.district ? ` · ${DISTRICT_LABELS[user.district]}` : ""}
              </p>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-[14px] border border-[var(--v3-line)] bg-[var(--v3-card-2)] p-3">
            <div className="text-center">
              <p className="text-[13px] font-black text-[var(--v3-azure)]">{user.levelEmoji} {user.levelTitle}</p>
              <p className="mt-0.5 text-[9px] text-[var(--v3-ink-2)]">سطح</p>
            </div>
            <div className="border-x border-[var(--v3-line)] text-center">
              <p className="v3-num text-[13px] font-black text-[var(--v3-ink)]">{faNum(user.points)}</p>
              <p className="mt-0.5 text-[9px] text-[var(--v3-ink-2)]">امتیاز</p>
            </div>
            <div className="text-center">
              <p className="v3-num text-[13px] font-black text-[var(--v3-ink)]">{jalali(user.createdAt)}</p>
              <p className="mt-0.5 text-[9px] text-[var(--v3-ink-2)]">عضویت</p>
            </div>
          </div>
          {user.base && <p className="relative mt-3 text-center text-[10px] text-[var(--v3-ink-2)]/80">پایگاه: {user.base}</p>}
          <div className="relative mt-3 flex gap-2">
            <button onClick={shareCard} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-[var(--v3-azure)]/40 bg-[var(--v3-azure-soft)] py-2.5 text-[11.5px] font-bold text-[var(--v3-azure-deep)] transition-opacity hover:opacity-85 dark:text-[#93c5fd]">
              <Share2 className="h-4 w-4" />
              اشتراک‌گذاری
            </button>
            <a
              href={`/api/export?type=presscard&userId=${encodeURIComponent(user.id)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-[var(--v3-line)] bg-[var(--v3-card-2)] py-2.5 text-[11.5px] font-bold text-[var(--v3-ink)] transition-colors hover:bg-[var(--v3-azure-soft)]/60"
            >
              <FileDown className="h-4 w-4" />
              خروجی CSV
            </a>
          </div>
        </div>
      </div>

      {/* کارت سطح */}
      <div className="v3-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[var(--v3-azure)]/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold text-[var(--v3-ink-2)]">سطح فعلی</p>
            <h3 className="mt-1 text-[22px] font-black text-[var(--v3-ink)]">
              {lv.emoji} {lv.title}
            </h3>
            {nx ? (
              <p className="mt-1.5 text-[11.5px] font-semibold text-[var(--v3-azure)]">{faNum(Math.max(0, nx.min - user.points))} امتیاز تا سطح «{nx.title}»</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] font-semibold text-[var(--v3-azure)]">به بالاترین سطح رسیده‌ای!</p>
            )}
          </div>
          <Ring value={progressToNext} max={100} size={92} stroke={9}>
            <span className="v3-num text-[17px] font-black text-[var(--v3-ink)]">{fa(progressToNext)}٪</span>
          </Ring>
        </div>
        {/* نوار پیشرفت تا سطح بعد */}
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[var(--v3-card-2)]">
          <div className="h-full rounded-full bg-gradient-to-l from-[var(--v3-azure-2)] to-[var(--v3-azure-deep)] transition-all duration-700" style={{ width: `${progressToNext}%` }} />
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-[var(--v3-line)] pt-4">
          <MiniKpi icon={<Flame className="h-4 w-4" />} value={faNum(user.points)} label="امتیاز کل" />
          <MiniKpi icon={<Zap className="h-4 w-4" />} value={`${fa(user.currentStreak)} روز`} label="استریک فعلی" />
          <MiniKpi icon={<Trophy className="h-4 w-4" />} value={`${fa(user.bestStreak)} روز`} label="بهترین استریک" />
        </div>
      </div>

      {/* کارنامه */}
      <div>
        <SectionHeader title="کارنامه فردی" />
        <div className="v3-card space-y-3.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-[var(--v3-ink-2)]">رتبه در سازمان</span>
            <span className="v3-num text-[13.5px] font-black text-[var(--v3-azure)]">
              {fa(stats.rank)} از {fa(stats.totalReporters)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--v3-line)]/70 pt-3.5">
            <span className="text-[12.5px] font-semibold text-[var(--v3-ink-2)]">نرخ تایید خبرها</span>
            <span className="v3-num text-[13.5px] font-black text-[var(--v3-ink)]">{fa(stats.approveRate)}٪</span>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--v3-line)]/70 pt-3.5">
            <span className="text-[12.5px] font-semibold text-[var(--v3-ink-2)]">خبر تاییدشده / ردشده</span>
            <span className="v3-num text-[13.5px] font-black text-[var(--v3-ink)]">
              <span className="text-[var(--v3-azure)]">{fa(stats.totalApproved)}</span> / <span className="text-red-600 dark:text-red-400">{fa(stats.totalRejected)}</span>
            </span>
          </div>
          {user.education && (
            <div className="flex items-center justify-between border-t border-[var(--v3-line)]/70 pt-3.5">
              <span className="text-[12.5px] font-semibold text-[var(--v3-ink-2)]">تحصیلات</span>
              <span className="text-[12.5px] font-bold text-[var(--v3-ink)]">{EDUCATION_LABELS[user.education] ?? "—"}</span>
            </div>
          )}
        </div>
      </div>

      {/* نشان‌ها */}
      <div>
        <SectionHeader title={`نشان‌ها (${fa(unlockedBadges)} از ${fa(state.badges.length)})`} />
        <div className="grid grid-cols-3 gap-2.5">
          {state.badges.map((b) => (
            <div
              key={b.key}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[18px] border p-3.5 text-center transition-colors",
                b.unlocked ? "border-[var(--v3-azure)]/30 bg-[var(--v3-azure-soft)]/50" : "border-[var(--v3-line)] bg-[var(--v3-card)] opacity-45",
              )}
            >
              <span className="text-[26px] leading-none">{b.emoji}</span>
              <span className="mt-1 text-[11.5px] font-bold text-[var(--v3-ink)]">{b.title}</span>
              <span className="text-[9px] leading-3.5 text-[var(--v3-ink-2)]">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* حالت نمایش */}
      <div>
        <SectionHeader title="حالت نمایش" />
        <div className="v3-card p-3">
          <ThemeToggle />
          <p className="mt-2 px-1 text-[10px] leading-4 text-[var(--v3-ink-2)]/70">
            حالت انتخابی روی این دستگاه ذخیره می‌شود.
          </p>
        </div>
      </div>

      {/* تنظیمات اعلان */}
      <div>
        <button onClick={() => setShowSettings(!showSettings)} className="flex w-full items-center justify-between">
          <SectionHeader title="تنظیمات اعلان" />
          <ChevronDown className={cn("h-5 w-5 text-[var(--v3-ink-2)] transition-transform", showSettings && "rotate-180")} />
        </button>
        {showSettings && (
          <div className="v3-card stage-enter space-y-1 p-4">
            {[
              { key: "approvals", label: "تایید خبرها", icon: <ShieldCheck className="h-4.5 w-4.5" /> },
              { key: "rejections", label: "رد خبرها (با دلیل)", icon: <Award className="h-4.5 w-4.5" /> },
              { key: "challenges", label: "چالش‌های جدید", icon: <Trophy className="h-4.5 w-4.5" /> },
              { key: "broadcast", label: "اطلاع‌رسانی گروهی", icon: <Users2 className="h-4.5 w-4.5" /> },
            ].map((s) => (
              <div key={s.key} className="flex items-center justify-between border-b border-[var(--v3-line)] py-2.5">
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[var(--v3-ink)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v3-azure-soft)] text-[var(--v3-azure)]">{s.icon}</span>
                  {s.label}
                </span>
                <Switch checked={state.notifSettings[s.key as keyof typeof state.notifSettings] as boolean} onCheckedChange={(v) => setNotif(s.key, v)} disabled={busy} className="data-[state=checked]:bg-[var(--v3-azure)]" />
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between pt-3">
              <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[var(--v3-ink)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v3-amber-soft)] text-[var(--v3-amber)]">
                  <Timer className="h-4.5 w-4.5" />
                </span>
                ساعت سکوت
              </span>
              <span className="rounded-full bg-[var(--v3-card-2)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--v3-ink-2)]" dir="ltr">
                {toFaTime(state.notifSettings.quietStart)} تا {toFaTime(state.notifSettings.quietEnd)}
              </span>
            </div>
            <p className="pt-1 text-[10px] leading-4 text-[var(--v3-ink-2)]/70">
              در بازه ساعت سکوت، اعلان‌های غیرضروری ارسال نمی‌شوند (مطابق سناریوی ۹ ربات).
            </p>
          </div>
        )}
      </div>

      {/* اکشن‌ها */}
      <div className="flex flex-wrap gap-2.5 pb-2">
        {user.role === "admin" && (
          <button
            onClick={onOpenAdmin}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-[var(--v3-azure)]/40 bg-[var(--v3-azure-soft)] py-3.5 text-[13.5px] font-bold text-[var(--v3-azure-deep)] transition-colors hover:bg-[var(--v3-azure)]/25 dark:text-[#93c5fd]"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            پنل مدیریت
          </button>
        )}
        {(user.role === "admin" || user.role === "district_manager") && (
          <button
            onClick={() => router.push("/organization")}
            className="v3-card flex flex-1 items-center justify-center gap-2.5 py-3 text-[13.5px] font-bold text-[var(--v3-ink)] transition-transform hover:scale-[1.01]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--v3-azure-soft)] text-[var(--v3-azure)]">
              <Landmark className="h-4.5 w-4.5" />
            </span>
            حوزه‌ها و پایگاه‌ها
          </button>
        )}
        <button
          onClick={logout}
          className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-red-50 py-3.5 text-[13.5px] font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/12 dark:text-red-400 dark:hover:bg-red-500/20"
        >
          <LogOut className="h-4.5 w-4.5" />
          خروج از حساب
        </button>
      </div>
    </div>
  )
}

function MiniKpi({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="v3-card-flat flex flex-col items-center gap-1 px-1 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v3-azure-soft)] text-[var(--v3-azure)]">{icon}</span>
      <span className="v3-num text-[15px] leading-none text-[var(--v3-ink)]">{value}</span>
      <span className="text-[10px] font-medium text-[var(--v3-ink-2)]">{label}</span>
    </div>
  )
}

function toFaTime(t: string): string {
  return t.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
}

export { BellRing }
