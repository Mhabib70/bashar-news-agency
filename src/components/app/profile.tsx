"use client"

import { useState } from "react"
import { LogOut, SwitchCamera, Zap, Trophy, Flame, BellRing, ShieldCheck, Users2, Timer, Award, ChevronDown, BadgeCheck, Share2, FileDown } from "lucide-react"
import { useApp } from "@/lib/store"
import { Ring, SectionHeader, Avatar } from "@/components/app/bits"
import { fa, faNum, jalali } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS, EDUCATION_LABELS, LEVELS, levelIndex } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export function ProfileScreen({ onSwitchAccount, onOpenAdmin }: { onSwitchAccount: () => void; onOpenAdmin?: () => void }) {
  const { state, saveSettings, logout } = useApp()
  const { toast } = useToast()
  const [showSettings, setShowSettings] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!state) return null
  const { user, stats } = state

  const lvIdx = levelIndex(user.levelKey)
  const lv = LEVELS[lvIdx]
  const nx = LEVELS[lvIdx + 1] ?? null
  const progressToNext = nx ? Math.min(100, Math.round(((user.points - lv.min) / (nx.min - lv.min)) * 100)) : 100

  const unlockedBadges = state.badges.filter((b) => b.unlocked).length

  const shareCard = async () => {
    const text = `🎖 کارت خبرنگاری دیجیتال\n${user.fullName}\n${ROLE_LABELS[user.role]} · ${DISTRICT_LABELS[user.district] ?? ""}\n${user.base}\nسطح: ${user.levelEmoji} ${user.levelTitle} · ${faNum(user.points)} امتیاز\nعضو از ${jalali(user.createdAt, true)}\n📰 خبرگزاری بشر`
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
        <Avatar name={user.fullName} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-black text-ink">{user.fullName}</h1>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            {ROLE_LABELS[user.role]}
            {user.district && ` · ${DISTRICT_LABELS[user.district]}`}
          </p>
          {user.base && <p className="text-[11px] text-ink-muted/80">{user.base}</p>}
        </div>
      </div>

      {/* کارت خبرنگاری */}
      <div>
        <SectionHeader title="کارت خبرنگاری دیجیتال" />
        <div className="relative overflow-hidden rounded-[28px] border border-neon/30 bg-gradient-to-l from-neon/15 via-surface to-surface p-5">
          <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-neon/10 blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] font-black text-neon">
              <BadgeCheck className="h-4 w-4" />
              خبرگزاری بشر
            </span>
            <span className="rounded-full bg-black/25 px-2.5 py-1 font-mono text-[9px] font-bold text-neon" dir="ltr">
              {user.username}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3.5">
            <Avatar name={user.fullName} size={54} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black text-ink">{user.fullName}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink-muted">
                {ROLE_LABELS[user.role]}
                {user.district ? ` · ${DISTRICT_LABELS[user.district]}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-background/40 p-3">
            <div className="text-center">
              <p className="text-[13px] font-black text-neon">{user.levelEmoji} {user.levelTitle}</p>
              <p className="mt-0.5 text-[9px] text-ink-muted">سطح</p>
            </div>
            <div className="border-x border-line text-center">
              <p className="text-[13px] font-black text-ink">{faNum(user.points)}</p>
              <p className="mt-0.5 text-[9px] text-ink-muted">امتیاز</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-black text-ink">{jalali(user.createdAt)}</p>
              <p className="mt-0.5 text-[9px] text-ink-muted">عضویت</p>
            </div>
          </div>
          {user.base && <p className="mt-3 text-center text-[10px] text-ink-muted/80">پایگاه: {user.base}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={shareCard} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-neon/40 bg-neon/10 py-2.5 text-[11.5px] font-bold text-neon">
              <Share2 className="h-4 w-4" />
              اشتراک‌گذاری
            </button>
            <a
              href={`/api/export?type=presscard&userId=${encodeURIComponent(user.id)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-2.5 text-[11.5px] font-bold text-ink"
            >
              <FileDown className="h-4 w-4" />
              خروجی CSV
            </a>
          </div>
        </div>
      </div>

      {/* کارت سطح */}
      <div className="relative overflow-hidden rounded-[28px] border border-neon/25 bg-gradient-to-bl from-neon/12 via-surface to-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11.5px] font-bold text-ink-muted">سطح فعلی</p>
            <h3 className="mt-1 text-[22px] font-black text-ink">
              {lv.emoji} {lv.title}
            </h3>
            {nx ? (
              <p className="mt-1.5 text-[11.5px] font-semibold text-neon">{faNum(Math.max(0, nx.min - user.points))} امتیاز تا سطح «{nx.title}»</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] font-semibold text-neon">به بالاترین سطح رسیده‌ای!</p>
            )}
          </div>
          <Ring value={progressToNext} max={100} size={92} stroke={9}>
            <span className="text-[17px] font-black text-neon">{fa(progressToNext)}٪</span>
          </Ring>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
          <MiniKpi icon={<Flame className="h-4 w-4" />} value={faNum(user.points)} label="امتیاز کل" />
          <MiniKpi icon={<Zap className="h-4 w-4" />} value={`${fa(user.currentStreak)} روز`} label="استریک فعلی" />
          <MiniKpi icon={<Trophy className="h-4 w-4" />} value={`${fa(user.bestStreak)} روز`} label="بهترین استریک" />
        </div>
      </div>

      {/* کارنامه */}
      <div>
        <SectionHeader title="کارنامه فردی" />
        <div className="rounded-[26px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink-muted">رتبه در سازمان</span>
            <span className="text-[13.5px] font-black text-neon">
              {fa(stats.rank)} از {fa(stats.totalReporters)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink-muted">نرخ تایید خبرها</span>
            <span className="text-[13.5px] font-black text-ink">{fa(stats.approveRate)}٪</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink-muted">خبر تاییدشده / ردشده</span>
            <span className="text-[13.5px] font-black text-ink">
              <span className="text-neon">{fa(stats.totalApproved)}</span> / <span className="text-[#ff8484]">{fa(stats.totalRejected)}</span>
            </span>
          </div>
          {user.education && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ink-muted">تحصیلات</span>
              <span className="text-[12.5px] font-bold text-ink">{EDUCATION_LABELS[user.education] ?? "—"}</span>
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
                "flex flex-col items-center gap-1 rounded-3xl border p-3.5 text-center transition-colors",
                b.unlocked ? "border-neon/30 bg-neon/6" : "border-line bg-surface opacity-45",
              )}
            >
              <span className="text-[26px] leading-none">{b.emoji}</span>
              <span className="mt-1 text-[11.5px] font-bold text-ink">{b.title}</span>
              <span className="text-[9px] leading-3.5 text-ink-muted">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* تنظیمات اعلان */}
      <div>
        <button onClick={() => setShowSettings(!showSettings)} className="flex w-full items-center justify-between">
          <SectionHeader title="تنظیمات اعلان" />
          <ChevronDown className={cn("h-5 w-5 text-ink-muted transition-transform", showSettings && "rotate-180")} />
        </button>
        {showSettings && (
          <div className="space-y-1 rounded-[26px] border border-line bg-surface p-4 stage-enter">
            {[
              { key: "approvals", label: "تایید خبرها", icon: <ShieldCheck className="h-4.5 w-4.5" /> },
              { key: "rejections", label: "رد خبرها (با دلیل)", icon: <Award className="h-4.5 w-4.5" /> },
              { key: "challenges", label: "چالش‌های جدید", icon: <Trophy className="h-4.5 w-4.5" /> },
              { key: "broadcast", label: "اطلاع‌رسانی گروهی", icon: <Users2 className="h-4.5 w-4.5" /> },
            ].map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon/10 text-neon">{s.icon}</span>
                  {s.label}
                </span>
                <Switch checked={state.notifSettings[s.key as keyof typeof state.notifSettings] as boolean} onCheckedChange={(v) => setNotif(s.key, v)} disabled={busy} />
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
              <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon/10 text-neon">
                  <Timer className="h-4.5 w-4.5" />
                </span>
                ساعت سکوت
              </span>
              <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-muted" dir="ltr">
                {toFaTime(state.notifSettings.quietStart)} تا {toFaTime(state.notifSettings.quietEnd)}
              </span>
            </div>
            <p className="pt-1 text-[10px] leading-4 text-ink-muted/70">
              در بازه ساعت سکوت، اعلان‌های غیرضروری ارسال نمی‌شوند (مطابق سناریوی ۹ ربات).
            </p>
          </div>
        )}
      </div>

      {/* اکشن‌ها */}
      <div className="flex gap-2.5 pb-2">
        {user.role === "admin" && (
          <button
            onClick={onOpenAdmin}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-neon/40 bg-neon/10 py-3.5 text-[13.5px] font-bold text-neon transition-colors hover:bg-neon/15"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            پنل مدیریت
          </button>
        )}
        <button
          onClick={onSwitchAccount}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-[13.5px] font-bold text-ink transition-colors hover:bg-surface-2"
        >
          <SwitchCamera className="h-4.5 w-4.5" />
          تغییر حساب
        </button>
        <button
          onClick={logout}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#ff5c5c]/30 py-3.5 text-[13.5px] font-bold text-[#ff8484] transition-colors hover:bg-[#ff5c5c]/8"
        >
          <LogOut className="h-4.5 w-4.5" />
          خروج
        </button>
      </div>
    </div>
  )
}

function MiniKpi({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon/12 text-neon">{icon}</span>
      <span className="text-[15px] font-black text-ink">{value}</span>
      <span className="text-[10px] text-ink-muted">{label}</span>
    </div>
  )
}

function toFaTime(t: string): string {
  return t.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
}

export { BellRing }
