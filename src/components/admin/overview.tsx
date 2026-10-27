"use client"

import { useEffect, useState } from "react"
import { Users2, UserPlus, ClipboardList, Trophy, Newspaper, Megaphone, Flame, ArrowLeft, Loader2, CalendarClock, Gauge, History } from "lucide-react"
import { useApp, type AdminOverview } from "@/lib/store"
import { fa, faNum, relTime } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS, REVIEW_STAGES, reviewStageLabel } from "@/lib/domain"
import { UserPhoto } from "@/components/admin/users"
import { cn } from "@/lib/utils"

export function AdminOverviewSection({ onGoto }: { onGoto: (s: "users" | "review" | "challenges" | "broadcast") => void }) {
  const { fetchAdminOverview } = useApp()
  const [data, setData] = useState<AdminOverview | null>(null)

  useEffect(() => {
    fetchAdminOverview().then(setData)
  }, [fetchAdminOverview])

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        در حال دریافت آمار سازمان...
      </div>
    )
  }

  const kpis = [
    { label: "اعضای فعال", value: data.users.active, sub: `${fa(data.users.reporters)} خبرنگار`, icon: <Users2 className="h-5 w-5" />, tone: "neon" as const, goto: "users" as const },
    { label: "در انتظار تایید", value: data.users.pending, sub: "درخواست عضویت", icon: <UserPlus className="h-5 w-5" />, tone: data.users.pending > 0 ? ("warn" as const) : ("plain" as const), goto: "users" as const },
    { label: "صف بررسی", value: data.news.pendingTotal, sub: "خبر در جریان", icon: <ClipboardList className="h-5 w-5" />, tone: data.news.pendingTotal > 0 ? ("warn" as const) : ("plain" as const), goto: "review" as const },
    { label: "چالش فعال", value: data.challenges.active, sub: "در جریان", icon: <Trophy className="h-5 w-5" />, tone: "neon" as const, goto: "challenges" as const },
  ]

  const stages = [
    { ...REVIEW_STAGES[0], count: data.news.stageDistrict },
    { ...REVIEW_STAGES[1], count: data.news.stageSpecialist },
    { ...REVIEW_STAGES[2], count: data.news.stageAdmin },
  ]

  return (
    <div className="space-y-5">
      {/* KPIها */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => onGoto(k.goto)}
            className={cn(
              "group rounded-[24px] border p-4 text-right transition-all hover:shadow-[0_10px_30px_-14px_rgba(0,0,0,0.4)]",
              k.tone === "neon" ? "border-neon/30 bg-neon/6" : k.tone === "warn" ? "border-warn/35 bg-warn/8" : "border-line bg-surface",
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl",
                  k.tone === "neon" ? "bg-neon/14 text-neon" : k.tone === "warn" ? "bg-warn/14 text-warn" : "bg-surface-2 text-ink-muted",
                )}
              >
                {k.icon}
              </span>
              <ArrowLeft className="h-4 w-4 text-ink-muted/30 transition-colors group-hover:text-neon" />
            </div>
            <p className="mt-3 text-[26px] font-black leading-none text-ink">{faNum(k.value)}</p>
            <p className="mt-1.5 text-[12px] font-bold text-ink">{k.label}</p>
            <p className="text-[10px] text-ink-muted">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* خط لوله بررسی + امروز */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-[24px] border border-line bg-surface p-4 xl:col-span-2">
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-black text-ink">
            <Gauge className="h-4.5 w-4.5 text-neon" />
            خط لوله بررسی سه‌مرحله‌ای
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {stages.map((s, i) => (
              <div key={s.key} className={cn("rounded-2xl border p-3 text-center", s.count > 0 ? "border-warn/35 bg-warn/8" : "border-line bg-surface-2")}>
                <p className={cn("text-[22px] font-black leading-none", s.count > 0 ? "text-warn" : "text-ink-muted")}>{fa(s.count)}</p>
                <p className="mt-1.5 text-[10.5px] font-bold text-ink">{s.label}</p>
                {i < 2 && <p className="mt-0.5 text-[8.5px] text-ink-muted/60">مرحله {fa(i + 1)}</p>}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <div>
              <p className="text-[14px] font-black text-neon">{faNum(data.news.approved)}</p>
              <p className="text-[9.5px] text-ink-muted">کل تاییدشده</p>
            </div>
            <div className="border-x border-line">
              <p className="text-[14px] font-black text-danger-soft">{faNum(data.news.rejected)}</p>
              <p className="text-[9.5px] text-ink-muted">کل ردشده</p>
            </div>
            <div>
              <p className="text-[14px] font-black text-ink">{faNum(data.news.today)}</p>
              <p className="text-[9.5px] text-ink-muted">خبر امروز</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-neon/25 bg-gradient-to-bl from-neon/10 to-surface p-4">
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-black text-ink">
            <Flame className="h-4.5 w-4.5 text-neon" />
            امروز به وقت تهران
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-muted">خبر ثبت‌شده</span>
              <span className="text-[15px] font-black text-ink">{faNum(data.news.today)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-muted">امتیاز صادرشده</span>
              <span className="text-[15px] font-black text-neon">{faNum(data.news.pointsToday)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-muted">خبر هفته اخیر</span>
              <span className="text-[15px] font-black text-ink">{faNum(data.news.week)}</span>
            </div>
          </div>
          <button
            onClick={() => onGoto("broadcast")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3 text-[12.5px] font-bold text-neon-foreground transition-transform hover:scale-[1.02]"
          >
            <Megaphone className="h-4 w-4" />
            ارسال پیام همگانی
          </button>
        </div>
      </div>

      {/* آخرین ثبت‌نام‌ها + آخرین اخبار */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-[24px] border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13.5px] font-black text-ink">
              <UserPlus className="h-4.5 w-4.5 text-neon" />
              آخرین ثبت‌نام‌ها
            </p>
            <button onClick={() => onGoto("users")} className="text-[11px] font-bold text-neon">مدیریت کاربران</button>
          </div>
          {data.recentUsers.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-ink-muted">هنوز عضوی ثبت‌نام نکرده است.</p>
          ) : (
            <div className="space-y-2">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 py-2.5">
                  <UserPhoto user={{ fullName: u.fullName, avatar: u.avatar }} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-ink">{u.fullName}</p>
                    <p className="truncate text-[10px] text-ink-muted">
                      {ROLE_LABELS[u.role]} · {DISTRICT_LABELS[u.district] ?? "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                      u.status === "active" ? "bg-neon/12 text-neon" : u.status === "pending" ? "bg-warn/12 text-warn" : "bg-danger/10 text-danger-soft",
                    )}
                  >
                    {u.status === "active" ? "فعال" : u.status === "pending" ? "انتظار" : "رد شده"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13.5px] font-black text-ink">
              <Newspaper className="h-4.5 w-4.5 text-neon" />
              آخرین اخبار سازمان
            </p>
            <button onClick={() => onGoto("review")} className="text-[11px] font-bold text-neon">صف بررسی</button>
          </div>
          {data.recentNews.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-ink-muted">هنوز خبری ثبت نشده است.</p>
          ) : (
            <div className="space-y-2">
              {data.recentNews.map((n) => (
                <div key={n.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-ink">{n.title}</p>
                    <p className="text-[10px] text-ink-muted">
                      <span dir="ltr">{n.code}</span> · {n.reporter.fullName}
                      {n.status === "pending" ? ` · در مرحله ${reviewStageLabel(n.reviewStage)}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                      n.status === "approved" ? "bg-neon/12 text-neon" : n.status === "rejected" ? "bg-danger/10 text-danger-soft" : "bg-warn/12 text-warn",
                    )}
                  >
                    {n.status === "approved" ? "تایید" : n.status === "rejected" ? "رد" : "بررسی"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* تاریخچه پیام‌های همگانی */}
      {data.recentBroadcasts.length > 0 && (
        <div className="rounded-[24px] border border-line bg-surface p-4">
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-black text-ink">
            <History className="h-4.5 w-4.5 text-neon" />
            پیام‌های همگانی اخیر
          </p>
          <div className="space-y-2">
            {data.recentBroadcasts.map((b, i) => (
              <div key={i} className="rounded-2xl border border-line bg-surface-2 px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-ink">{b.title}</p>
                  <span className="flex shrink-0 items-center gap-1 text-[9.5px] text-ink-muted/70">
                    <CalendarClock className="h-3 w-3" />
                    {relTime(b.at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-ink-muted">{b.body}</p>
                <p className="mt-1 text-[9.5px] font-bold text-neon">ارسال به {fa(b.recipients)} عضو</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
