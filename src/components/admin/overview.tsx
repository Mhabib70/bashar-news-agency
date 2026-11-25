"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users2, UserPlus, ClipboardList, Trophy, Newspaper, Megaphone, Flame, ArrowLeft, Loader2,
  CalendarClock, Gauge, History, ShieldCheck, Radio, FileDown, Ban, Activity, Timer,
  ShieldAlert, ShieldQuestion, RefreshCw, Cloud, UsersRound, ImageUp,
} from "lucide-react"
import { useApp, type AdminOverview } from "@/lib/store"
import { fa, faNum, relTime } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS, REVIEW_STAGES, reviewStageLabel } from "@/lib/domain"
import { UserPhoto } from "@/components/admin/users"
import { cn } from "@/lib/utils"

type Kpi = {
  newsPerHour: number
  newsToday: number
  pendingTotal: number
  approvedTotal: number
  rejectedTotal: number
  onlineUsers: number
  totalUsers: number
  pendingRegs: number
  avgWaitMin: number
  throughputPct: number
}

type SecLog = {
  id: number
  kind: string
  title: string
  detail: string
  actorName: string
  severity: string
  at: string
}

type MemberRow = {
  id: string
  fullName: string
  role: string
  district: string
  status: string
  active: boolean
  avatar: string
  phone: string
}

const LOG_ICONS: Record<string, React.ReactNode> = {
  login: <ShieldCheck className="h-4 w-4" />,
  login_failed: <ShieldAlert className="h-4 w-4" />,
  user_active: <Ban className="h-4 w-4" />,
  user_role: <UsersRound className="h-4 w-4" />,
  broadcast: <Megaphone className="h-4 w-4" />,
  settings: <ShieldQuestion className="h-4 w-4" />,
  review: <ClipboardList className="h-4 w-4" />,
}

export function AdminOverviewSection({ onGoto }: { onGoto: (s: "users" | "review" | "challenges" | "broadcast") => void }) {
  const { fetchAdminOverview } = useApp()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [logs, setLogs] = useState<SecLog[] | null>(null)
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [toggling, setToggling] = useState<string>("")

  const loadLive = useCallback(() => {
    fetch("/api/admin/stats").then((r) => r.ok ? r.json() : null).then((d) => setKpi(d?.kpis ?? null)).catch(() => {})
    fetch("/api/security-log?take=12").then((r) => r.ok ? r.json() : null).then((d) => setLogs(d?.logs ?? [])).catch(() => {})
    fetch("/api/users").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.users) {
        // فقط اعضای تاییدشده — ۶ نفر اول برای toggle سریع
        setMembers(d.users.filter((u: MemberRow) => u.status === "active").slice(0, 6))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchAdminOverview().then(setData)
    loadLive()
    const t = setInterval(loadLive, 60000)
    return () => clearInterval(t)
  }, [fetchAdminOverview, loadLive])

  const toggleActive = async (u: MemberRow) => {
    setToggling(u.id)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_active", targetId: u.id, enabled: !u.active }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.ok) {
        setMembers((prev) => prev?.map((m) => (m.id === u.id ? { ...m, active: !u.active } : m)) ?? null)
      }
    } catch { /* شبکه */ }
    setToggling("")
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-on-surface-variant">
        <Loader2 className="h-5 w-5 animate-spin" />
        در حال دریافت آمار سازمان...
      </div>
    )
  }

  // ---- ۴ KPI طراحی (_17) ----
  const liveCards = kpi ? [
    { label: "اخبار دریافتی بر ساعت", value: `${fa(kpi.newsPerHour)}`, sub: "پایش لحظه‌ای ورودی رخداد", icon: <ImageUp className="h-5 w-5" />, tone: "primary" as const },
    { label: "خبرنگاران برخط", value: `${fa(kpi.onlineUsers)} نفر`, sub: `از ${fa(kpi.totalUsers)} عضو فعال`, icon: <UsersRound className="h-5 w-5" />, tone: "plain" as const },
    { label: "پایداری شبکه", value: `${faNum(kpi.throughputPct)}٪`, sub: "سلامت رسوب اخبار ۲۴ ساعت", icon: <Cloud className="h-5 w-5" />, tone: "tertiary" as const },
    { label: "میانگین انتظار", value: `${faNum(kpi.avgWaitMin)} دقیقه`, sub: "از ارسال تا تایید نهایی", icon: <Timer className="h-5 w-5" />, tone: "warn" as const },
  ] : [
    { label: "بارگذاری...", value: "—", sub: "در حال دریافت از سرور", icon: <Activity className="h-5 w-5 animate-pulse" />, tone: "plain" as const },
    { label: "بارگذاری...", value: "—", sub: "در حال دریافت از سرور", icon: <Activity className="h-5 w-5 animate-pulse" />, tone: "plain" as const },
    { label: "بارگذاری...", value: "—", sub: "در حال دریافت از سرور", icon: <Activity className="h-5 w-5 animate-pulse" />, tone: "plain" as const },
    { label: "بارگذاری...", value: "—", sub: "در حال دریافت از سرور", icon: <Activity className="h-5 w-5 animate-pulse" />, tone: "plain" as const },
  ]

  const stages = [
    { ...REVIEW_STAGES[0], count: data.news.stageDistrict },
    { ...REVIEW_STAGES[1], count: data.news.stageSpecialist },
    { ...REVIEW_STAGES[2], count: data.news.stageAdmin },
  ]

  return (
    <div className="space-y-5">
      {/* ===== نیم‌نگاه سامانه و آنی خبر (طراحی _17) ===== */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[15px] font-black text-on-surface">
          <Gauge className="h-4.5 w-4.5 text-primary" />
          نیم‌نگاه سامانه و آنی خبر
        </p>
        <button onClick={loadLive} className="flex items-center gap-1 rounded-full bg-primary-fixed/40 px-2.5 py-1 text-[10.5px] font-bold text-on-primary-fixed">
          <RefreshCw className="h-3 w-3" />
          بروزرسانی زنده
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {liveCards.map((k) => (
          <div
            key={k.label}
            className={cn(
              "rounded-[24px] border p-4 text-right shadow-[0_6px_20px_-4px_rgba(83,37,23,0.05)]",
              k.tone === "primary" ? "border-primary/25 bg-primary-fixed/30" : k.tone === "tertiary" ? "border-tertiary/25 bg-tertiary-fixed/20" : k.tone === "warn" ? "border-warn/30 bg-warn/10" : "border-outline-variant/40 bg-surface",
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl",
                  k.tone === "primary" ? "bg-primary text-on-primary" : k.tone === "tertiary" ? "bg-tertiary text-on-tertiary" : k.tone === "warn" ? "bg-warn/20 text-warn" : "bg-surface-container-low text-on-surface-variant",
                )}
              >
                {k.icon}
              </span>
            </div>
            <p className="mt-3 text-[24px] font-black leading-none text-on-surface">{k.value}</p>
            <p className="mt-1.5 text-[12px] font-bold text-on-surface">{k.label}</p>
            <p className="text-[10px] text-on-surface-variant">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ===== اقدامات اضطراری و راهبردی ===== */}
      <p className="flex items-center gap-2 text-[15px] font-black text-on-surface">
        <Flame className="h-4.5 w-4.5 text-primary" />
        اقدامات اضطراری و راهبردی
      </p>
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          title="پیام همگانی"
          desc="ابلاغ ۵ دقیقه‌ای برای همهٔ خبرنگاران"
          icon={<Megaphone className="h-5 w-5" />}
          primary
          onClick={() => onGoto("broadcast")}
        />
        <QuickAction
          title="رسانه‌های بیرونی"
          desc="دفترچهٔ مخاطبان و ارسال ایتا"
          icon={<Radio className="h-5 w-5" />}
          onClick={() => onGoto("broadcast")}
        />
        <QuickAction
          title="گزارش تحلیلی جامع"
          desc="خروجی PDF و اکسل روز"
          icon={<FileDown className="h-5 w-5" />}
          onClick={() => onGoto("users")}
        />
        <QuickAction
          title="مسدودسازی دسترسی"
          desc="تعلیق فوری حساب‌های مشکوک"
          icon={<Ban className="h-5 w-5" />}
          onClick={() => onGoto("users")}
        />
      </div>

      {/* ===== مدیران و نظارت تحریریه — toggle دسترسی ===== */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[15px] font-black text-on-surface">
          <Users2 className="h-4.5 w-4.5 text-primary" />
          مدیران و نظارت تحریریه
        </p>
        <button onClick={() => onGoto("users")} className="rounded-full bg-primary px-3 py-1.5 text-[10.5px] font-bold text-on-primary">
          + مدیریت کاربران
        </button>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-outline-variant/40 bg-surface">
        {!members ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> در حال دریافت اعضا...
          </div>
        ) : members.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-on-surface-variant">عضوی یافت نشد.</p>
        ) : (
          members.map((u, i) => (
            <div key={u.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-outline-variant/40")}>
              <span className="relative">
                <UserPhoto user={{ fullName: u.fullName, avatar: u.avatar }} size={42} />
                {u.active && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-on-surface">{u.fullName}</p>
                <p className="truncate text-[10px] text-on-surface-variant">
                  {ROLE_LABELS[u.role]} {u.district ? `· ${DISTRICT_LABELS[u.district] ?? u.district}` : ""}
                </p>
              </div>
              {/* toggle فعال/غیرفعال */}
              <button
                onClick={() => toggleActive(u)}
                disabled={toggling === u.id}
                aria-label={u.active ? "غیرفعال‌سازی دسترسی" : "فعال‌سازی دسترسی"}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
                  u.active ? "bg-primary" : "bg-surface-container-highest",
                  toggling === u.id && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200",
                    u.active ? "right-0.5" : "right-[22px]",
                  )}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ===== لاگ زندهٔ رویدادهای امنیتی ===== */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[15px] font-black text-on-surface">
          <ShieldAlert className="h-4.5 w-4.5 text-primary" />
          لاگ زندهٔ رویدادهای امنیتی
        </p>
        <span className="text-[10px] font-bold text-on-surface-variant">{logs?.length ? `${fa(logs.length)} رخداد اخیر` : ""}</span>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-outline-variant/40 bg-surface">
        {!logs ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> در حال دریافت لاگ...
          </div>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-on-surface-variant">رخدادی ثبت نشده است — با فعالیت اعضا لاگ پر می‌شود.</p>
        ) : (
          logs.map((l, i) => (
            <div key={l.id} className={cn("flex items-start gap-3 px-4 py-3", i > 0 && "border-t border-outline-variant/40")}>
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  l.severity === "danger" ? "bg-danger/12 text-danger" : l.severity === "warn" ? "bg-warn/15 text-warn" : "bg-tertiary-fixed/40 text-tertiary",
                )}
              >
                {LOG_ICONS[l.kind] ?? <ShieldCheck className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[12.5px] font-bold", l.severity === "danger" ? "text-danger" : l.severity === "warn" ? "text-warn" : "text-on-surface")}>
                  {l.title}
                </p>
                {l.detail && <p className="mt-0.5 truncate text-[10.5px] text-on-surface-variant">{l.detail}</p>}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[9.5px] text-on-surface-variant/70">
                <CalendarClock className="h-3 w-3" />
                {relTime(l.at)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ===== خط لوله بررسی + امروز (حفظ) ===== */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-[24px] border border-outline-variant/40 bg-surface p-4 xl:col-span-2">
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-black text-on-surface">
            <Gauge className="h-4.5 w-4.5 text-primary" />
            خط لوله بررسی سه‌مرحله‌ای
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {stages.map((s, i) => (
              <div key={s.key} className={cn("rounded-2xl border p-3 text-center", s.count > 0 ? "border-warn/35 bg-warn/8" : "border-outline-variant/40 bg-surface-container-low")}>
                <p className={cn("text-[22px] font-black leading-none", s.count > 0 ? "text-warn" : "text-on-surface-variant")}>{fa(s.count)}</p>
                <p className="mt-1.5 text-[10.5px] font-bold text-on-surface">{s.label}</p>
                {i < 2 && <p className="mt-0.5 text-[8.5px] text-on-surface-variant/60">مرحله {fa(i + 1)}</p>}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-outline-variant/40 pt-3 text-center">
            <div>
              <p className="text-[14px] font-black text-primary">{faNum(data.news.approved)}</p>
              <p className="text-[9.5px] text-on-surface-variant">کل تاییدشده</p>
            </div>
            <div className="border-x border-outline-variant/40">
              <p className="text-[14px] font-black text-danger-soft">{faNum(data.news.rejected)}</p>
              <p className="text-[9.5px] text-on-surface-variant">کل ردشده</p>
            </div>
            <div>
              <p className="text-[14px] font-black text-on-surface">{faNum(data.news.today)}</p>
              <p className="text-[9.5px] text-on-surface-variant">خبر امروز</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-primary/25 bg-gradient-to-bl from-primary-fixed/40 to-surface p-4">
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-black text-on-surface">
            <Flame className="h-4.5 w-4.5 text-primary" />
            امروز به وقت تهران
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">خبر ثبت‌شده</span>
              <span className="text-[15px] font-black text-on-surface">{faNum(data.news.today)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">امتیاز صادرشده</span>
              <span className="text-[15px] font-black text-primary">{faNum(data.news.pointsToday)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">خبر هفته اخیر</span>
              <span className="text-[15px] font-black text-on-surface">{faNum(data.news.week)}</span>
            </div>
          </div>
          <button
            onClick={() => onGoto("broadcast")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-[12.5px] font-bold text-on-primary transition-transform hover:scale-[1.02]"
          >
            <Megaphone className="h-4 w-4" />
            ارسال پیام همگانی
          </button>
        </div>
      </div>

      {/* ===== آخرین ثبت‌نام‌ها + آخرین اخبار ===== */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-[24px] border border-outline-variant/40 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13.5px] font-black text-on-surface">
              <UserPlus className="h-4.5 w-4.5 text-primary" />
              آخرین ثبت‌نام‌ها
            </p>
            <button onClick={() => onGoto("users")} className="text-[11px] font-bold text-primary">مدیریت کاربران</button>
          </div>
          {data.recentUsers.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-on-surface-variant">هنوز عضوی ثبت‌نام نکرده است.</p>
          ) : (
            <div className="space-y-2">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5">
                  <UserPhoto user={{ fullName: u.fullName, avatar: u.avatar }} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-on-surface">{u.fullName}</p>
                    <p className="truncate text-[10px] text-on-surface-variant">
                      {ROLE_LABELS[u.role]} · {DISTRICT_LABELS[u.district] ?? "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                      u.status === "active" ? "bg-primary-fixed/60 text-on-primary-fixed" : u.status === "pending" ? "bg-warn/12 text-warn" : "bg-danger/10 text-danger-soft",
                    )}
                  >
                    {u.status === "active" ? "فعال" : u.status === "pending" ? "انتظار" : "رد شده"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-outline-variant/40 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13.5px] font-black text-on-surface">
              <Newspaper className="h-4.5 w-4.5 text-primary" />
              آخرین اخبار سازمان
            </p>
            <button onClick={() => onGoto("review")} className="text-[11px] font-bold text-primary">صف بررسی</button>
          </div>
          {data.recentNews.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-on-surface-variant">هنوز خبری ثبت نشده است.</p>
          ) : (
            <div className="space-y-2">
              {data.recentNews.map((n) => (
                <div key={n.id} className="flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-on-surface">{n.title}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      <span dir="ltr">{n.code}</span> · {n.reporter.fullName}
                      {n.status === "pending" ? ` · در مرحله ${reviewStageLabel(n.reviewStage)}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                      n.status === "approved" ? "bg-tertiary-fixed/50 text-on-tertiary-fixed" : n.status === "rejected" ? "bg-danger/10 text-danger-soft" : "bg-warn/12 text-warn",
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

      {/* ===== تاریخچه پیام‌های همگانی ===== */}
      {data.recentBroadcasts.length > 0 && (
        <div className="rounded-[24px] border border-outline-variant/40 bg-surface p-4">
          <p className="mb-3 flex items-center gap-2 text-[13.5px] font-black text-on-surface">
            <History className="h-4.5 w-4.5 text-primary" />
            پیام‌های همگانی اخیر
          </p>
          <div className="space-y-2">
            {data.recentBroadcasts.map((b, i) => (
              <div key={i} className="rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-on-surface">{b.title}</p>
                  <span className="flex shrink-0 items-center gap-1 text-[9.5px] text-on-surface-variant/70">
                    <CalendarClock className="h-3 w-3" />
                    {relTime(b.at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-on-surface-variant">{b.body}</p>
                <p className="mt-1 text-[9.5px] font-bold text-primary">ارسال به {fa(b.recipients)} عضو</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- کارت اقدام راهبردی ---------- */
function QuickAction({
  title, desc, icon, onClick, primary,
}: {
  title: string
  desc: string
  icon: React.ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start justify-between rounded-[24px] p-4 text-right transition-transform active:scale-[0.98]",
        primary
          ? "bg-gradient-to-bl from-primary to-primary-container text-on-primary shadow-[0_12px_28px_-8px_rgba(157,66,58,0.45)]"
          : "border border-outline-variant/40 bg-surface hover:border-primary/30",
      )}
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", primary ? "bg-white/20" : "bg-primary-fixed/50 text-primary")}>
        {icon}
      </span>
      <span className="mt-3 block w-full">
        <b className={cn("block text-[14px] font-black", primary ? "text-on-primary" : "text-on-surface")}>{title}</b>
        <span className={cn("mt-0.5 block text-[10.5px]", primary ? "text-on-primary/85" : "text-on-surface-variant")}>{desc}</span>
      </span>
    </button>
  )
}
