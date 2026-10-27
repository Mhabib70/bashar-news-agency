"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Check, X, Clock, RefreshCw, Phone, GraduationCap, CalendarDays, Activity, Flame, Trophy, Newspaper, ChevronLeft, ImageOff, Loader2, FileText, Award } from "lucide-react"
import { useApp, type AdminUserDetail } from "@/lib/store"
import { fa, faNum, relTime, jalali } from "@/lib/format"
import { ROLE_LABELS, DISTRICT_LABELS, BASE_LISTS, USER_REJECT_TITLES, LEVELS, EDUCATION_LABELS, BADGES } from "@/lib/domain"
import { NeonAvatar } from "@/components/app/bits"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type UserInfo = {
  id: string; fullName: string; username: string; role: string; status: string; rejectReason: string
  district: string; base: string; phone: string; age: string; education: string
  points: number; levelKey: string; currentStreak: number; bestStreak: number; avatar: string
  lastActivityAt: string | null; createdAt: string
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "فعال", cls: "bg-neon/12 text-neon border-neon/30" },
  pending: { label: "در انتظار تایید", cls: "bg-warn/12 text-warn border-warn/30" },
  rejected: { label: "رد شده", cls: "bg-danger/10 text-danger-soft border-danger/30" },
}

export function AdminUsersSection() {
  const { fetchUsers, moderateUser, refresh } = useApp()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserInfo[] | null>(null)
  const [q, setQ] = useState("")
  const [district, setDistrict] = useState("all")
  const [role, setRole] = useState("all")
  const [status, setStatus] = useState("all")
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<UserInfo | null>(null)
  const [reason, setReason] = useState("incomplete")
  const [detailId, setDetailId] = useState<string | null>(null)

  const load = async () => setUsers(await fetchUsers())
  useEffect(() => {
    let cancelled = false
    fetchUsers().then((us) => {
      if (!cancelled) setUsers(us)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const act = async (u: UserInfo, action: "approve" | "reject", r?: string) => {
    setBusy(u.id)
    const res = await moderateUser(u.id, action, r)
    setBusy(null)
    setRejecting(null)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      await Promise.all([load(), refresh()])
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  const filtered = useMemo(
    () =>
      (users ?? []).filter((u) => {
        if (q && !(u.fullName.includes(q) || u.phone.includes(q) || u.username.toLowerCase().includes(q.toLowerCase()))) return false
        if (district !== "all" && u.district !== district) return false
        if (role !== "all" && u.role !== role) return false
        if (status !== "all" && u.status !== status) return false
        return true
      }),
    [users, q, district, role, status],
  )

  const pending = filtered.filter((u) => u.status === "pending")
  const rest = filtered.filter((u) => u.status !== "pending")

  return (
    <div className="space-y-5">
      {/* نوار ابزار */}
      <div className="rounded-[24px] border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی نام، شماره یا نام کاربری..."
              className="rounded-2xl border-line bg-surface-2 pr-10 text-ink placeholder:text-ink-muted/60"
            />
          </div>
          <button
            onClick={load}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-line bg-surface-2 text-ink-muted transition-colors hover:text-neon"
            aria-label="بارگذاری مجدد"
          >
            <RefreshCw className={cn("h-4 w-4", users === null && "animate-spin")} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12px] font-bold text-ink">
            <option value="all">همه حوزه‌ها</option>
            {Object.entries(DISTRICT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12px] font-bold text-ink">
            <option value="all">همه نقش‌ها</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12px] font-bold text-ink">
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="pending">در انتظار تایید</option>
            <option value="rejected">رد شده</option>
          </select>
        </div>
      </div>

      {users === null && (
        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری اعضا...
        </div>
      )}

      {/* درخواست‌های عضویت */}
      {pending.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-2 text-[14px] font-black text-warn">
            <Clock className="h-4.5 w-4.5" />
            درخواست‌های عضویت ({fa(pending.length)})
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((u) => (
              <div key={u.id} className="rounded-[24px] border border-warn/35 bg-warn/6 p-4 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]">
                <button onClick={() => setDetailId(u.id)} className="flex w-full items-start gap-3 text-right">
                  <UserPhoto user={u} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-black text-ink">{u.fullName}</span>
                    <span className="mt-0.5 block text-[11px] leading-5 text-ink-muted">
                      {DISTRICT_LABELS[u.district] ?? "—"} · {u.base || "بدون پایگاه"}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-muted/70">درخواست: {relTime(u.createdAt)}</span>
                  </span>
                </button>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => act(u, "approve")}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neon py-2.5 text-[12px] font-bold text-neon-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {busy === u.id ? "..." : "تایید"}
                  </button>
                  <button
                    onClick={() => { setRejecting(u); setReason("incomplete") }}
                    disabled={busy !== null}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/40 py-2.5 text-[12px] font-bold text-danger-soft transition-colors hover:bg-danger/8 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    رد با دلیل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* اعضا — نفر به نفر */}
      <div>
        <p className="mb-3 text-[14px] font-black text-ink">
          اعضا ({fa(rest.length)})
          <span className="mr-2 text-[11px] font-medium text-ink-muted">— برای پرونده کامل روی کارت بزنید</span>
        </p>
        {rest.length === 0 && users !== null && (
          <p className="rounded-[24px] border border-dashed border-line py-10 text-center text-[12.5px] text-ink-muted">
            {users.length === 0 ? "هنوز عضوی ثبت‌نام نکرده است." : "با این فیلترها عضوی یافت نشد."}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((u) => {
            const st = STATUS_META[u.status] ?? STATUS_META.active
            const lv = LEVELS.find((l) => l.key === u.levelKey)
            return (
              <button
                key={u.id}
                onClick={() => setDetailId(u.id)}
                className="group rounded-[24px] border border-line bg-surface p-4 text-right transition-all hover:border-neon/40 hover:shadow-[0_10px_34px_-14px_rgba(0,0,0,0.4)]"
              >
                <div className="flex items-start gap-3">
                  <UserPhoto user={u} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-black text-ink">{u.fullName}</p>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold", st.cls)}>{st.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-neon">{ROLE_LABELS[u.role]}</p>
                    <p className="mt-1 truncate text-[10.5px] leading-4 text-ink-muted">
                      {DISTRICT_LABELS[u.district] ?? "—"}
                      {u.base ? ` · ${u.base}` : ""}
                    </p>
                  </div>
                  <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-ink-muted/40 transition-colors group-hover:text-neon" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                  <div>
                    <p className="text-[13px] font-black text-ink">{faNum(u.points)}</p>
                    <p className="text-[9px] text-ink-muted">امتیاز</p>
                  </div>
                  <div className="border-x border-line">
                    <p className="text-[13px] font-black text-ink">{lv ? `${lv.emoji} ${lv.title}` : "—"}</p>
                    <p className="text-[9px] text-ink-muted">سطح</p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-[13px] font-black text-ink">
                      <Flame className="h-3 w-3 text-warn" />
                      {fa(u.currentStreak)}
                    </p>
                    <p className="text-[9px] text-ink-muted">استریک</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* دیالوگ رد با دلیل */}
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        <DialogContent className="rounded-[28px] border-line bg-popover p-5 sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">رد درخواست عضویت</DialogTitle>
            <DialogDescription className="text-ink-muted">
              {rejecting?.fullName} — دلیل رد برای متقاضی اعلان می‌شود و می‌تواند مجدداً ثبت‌نام کند.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
            {Object.entries(USER_REJECT_TITLES).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setReason(k)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-right text-[13px] font-bold transition-colors",
                  reason === k ? "border-danger/50 bg-danger/8 text-ink" : "border-line bg-surface text-ink-muted",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", reason === k ? "border-danger bg-danger text-white" : "border-line")}>
                  {reason === k && <Check className="h-3 w-3" />}
                </span>
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => rejecting && act(rejecting, "reject", reason)}
            disabled={busy !== null}
            className="mt-4 w-full rounded-full bg-danger py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
          >
            {busy ? "..." : "ثبت رد درخواست"}
          </button>
        </DialogContent>
      </Dialog>

      {/* پرونده کامل کاربر */}
      <UserDetailDialog userId={detailId} onClose={() => setDetailId(null)} onChanged={load} />
    </div>
  )
}

// عکس کاربر: عکس واقعی با حاشیه قرمز نئونی ظریف یا جای‌نگهدار حروف اول
export function UserPhoto({ user, size = 48, tilted = false }: { user: { fullName: string; avatar: string }; size?: number; tilted?: boolean }) {
  if (tilted) return <NeonAvatar name={user.fullName} src={user.avatar || undefined} size={size} />
  if (user.avatar) {
    return (
      <img src={user.avatar} alt={user.fullName} className="avatar-photo" style={{ width: size, height: size }} />
    )
  }
  const parts = user.fullName.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("")
  return (
    <span
      className="avatar-photo flex items-center justify-center bg-neon/12 font-black text-neon"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
      aria-hidden
    >
      {parts}
    </span>
  )
}

// ---------- پرونده کامل کاربر ----------
function UserDetailDialog({ userId, onClose, onChanged }: { userId: string | null; onClose: () => void; onChanged: () => void }) {
  const { fetchUserDetail, moderateUser, refresh } = useApp()
  const { toast } = useToast()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchUserDetail(userId).then((d) => {
      if (!cancelled) {
        setDetail(d)
        setLoadedId(userId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId, fetchUserDetail])

  const loading = userId !== null && loadedId !== userId

  const act = async (action: "approve" | "reject", reason?: string) => {
    if (!detail) return
    setBusy(true)
    const res = await moderateUser(detail.user.id, action, reason)
    setBusy(false)
    if (res.ok) {
      toast({ title: "انجام شد", description: res.message })
      onClose()
      await Promise.all([onChanged(), refresh()])
    } else {
      toast({ title: "خطا", description: res.message, variant: "destructive" })
    }
  }

  const u = detail?.user
  const st = u ? STATUS_META[u.status] ?? STATUS_META.active : null

  return (
    <Dialog open={userId !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5 sm:max-w-2xl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-ink">پرونده کاربر</DialogTitle>
          <DialogDescription className="text-ink-muted">
            {u ? `مشخصات کامل، کارنامه فعالیت و سوابق ${u.fullName}` : "در حال دریافت پرونده..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            در حال بارگذاری پرونده...
          </div>
        ) : !detail || !u ? (
          <p className="py-16 text-center text-[13px] text-ink-muted">پرونده کاربر یافت نشد — دوباره تلاش کنید.</p>
        ) : (
          <>

            {/* هویت */}
            <div className="mt-2 flex flex-col items-center gap-3 rounded-[24px] border border-line bg-surface p-4 sm:flex-row sm:items-start">
              <NeonAvatar name={u.fullName} src={u.avatar || undefined} size={88} />
              <div className="min-w-0 flex-1 text-center sm:text-right">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <p className="text-[17px] font-black text-ink">{u.fullName}</p>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold", st?.cls)}>{st?.label}</span>
                  {u.status === "rejected" && u.rejectReason && (
                    <span className="text-[10px] text-ink-muted">({USER_REJECT_TITLES[u.rejectReason] ?? u.rejectReason})</span>
                  )}
                </div>
                <p className="mt-1 text-[12px] font-bold text-neon">{ROLE_LABELS[u.role]}</p>
                <p className="mt-1 text-[11.5px] text-ink-muted">
                  {DISTRICT_LABELS[u.district] ?? "—"} · {u.base || "بدون پایگاه"}
                </p>
                {!u.avatar && (
                  <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-[10px] font-bold text-warn">
                    <ImageOff className="h-3 w-3" />
                    عکس پروفایل ندارد
                  </p>
                )}
              </div>
            </div>

            {/* اقدامات عضویت */}
            {u.status === "pending" && (
              <div className="flex gap-2 rounded-[24px] border border-warn/35 bg-warn/6 p-3">
                <button onClick={() => act("approve")} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-neon py-3 text-[13px] font-bold text-neon-foreground disabled:opacity-50">
                  <Check className="h-4 w-4" /> تایید عضویت
                </button>
                <button onClick={() => act("reject", "incomplete")} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/40 py-3 text-[13px] font-bold text-danger-soft disabled:opacity-50">
                  <X className="h-4 w-4" /> رد درخواست
                </button>
              </div>
            )}

            {/* مشخصات هویتی */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <InfoCell icon={<Phone className="h-3.5 w-3.5" />} label="تلفن" value={u.phone || "—"} ltr />
              <InfoCell icon={<GraduationCap className="h-3.5 w-3.5" />} label="تحصیلات" value={u.education ? EDUCATION_LABELS[u.education] ?? u.education : "—"} />
              <InfoCell icon={<FileText className="h-3.5 w-3.5" />} label="سن" value={u.age ? `${fa(u.age)} سال` : "—"} />
              <InfoCell icon={<CalendarDays className="h-3.5 w-3.5" />} label="عضویت از" value={jalali(u.createdAt, true)} />
              <InfoCell icon={<Activity className="h-3.5 w-3.5" />} label="آخرین فعالیت" value={u.lastActivityAt ? relTime(u.lastActivityAt) : "—"} />
              <InfoCell icon={<FileText className="h-3.5 w-3.5" />} label="نام کاربری" value={u.username} ltr />
            </div>

            {/* کارنامه */}
            <div>
              <p className="mb-2 text-[13px] font-black text-ink">کارنامه خبری</p>
              <div className="grid grid-cols-3 gap-2 rounded-[24px] border border-line bg-surface p-3.5 sm:grid-cols-6">
                <Kpi value={faNum(u.points)} label="امتیاز" tone="neon" />
                <Kpi value={fa(detail.stats.newsTotal)} label="کل اخبار" />
                <Kpi value={fa(detail.stats.approved)} label="تاییدشده" tone="neon" />
                <Kpi value={fa(detail.stats.rejected)} label="ردشده" tone="danger" />
                <Kpi value={`${fa(detail.stats.approveRate)}٪`} label="نرخ تایید" />
                <Kpi value={detail.stats.rank ? `${fa(detail.stats.rank)}` : "—"} label="رتبه" />
              </div>
            </div>

            {/* نشان‌ها */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-ink">
                <Award className="h-4 w-4 text-neon" />
                نشان‌ها ({fa(detail.badges.length)})
              </p>
              {detail.badges.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line py-4 text-center text-[11.5px] text-ink-muted">هنوز نشانی کسب نکرده است.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.badges.map((b) => (
                    <span key={b.key} className="flex items-center gap-1.5 rounded-full border border-neon/30 bg-neon/8 px-3 py-1.5 text-[11px] font-bold text-ink">
                      <span>{BADGES[b.key]?.emoji ?? "🎖"}</span>
                      {BADGES[b.key]?.title ?? b.key}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* آخرین اخبار */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-ink">
                <Newspaper className="h-4 w-4 text-neon" />
                آخرین اخبار
              </p>
              {detail.news.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line py-4 text-center text-[11.5px] text-ink-muted">هنوز خبری ارسال نکرده است.</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.news.map((n) => (
                    <div key={n.id} className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-ink">{n.title}</p>
                        <p className="text-[9.5px] text-ink-muted" dir="ltr">{n.code} · {jalali(n.createdAt)}</p>
                      </div>
                      <NewsStatusChip status={n.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* چالش‌ها */}
            {detail.participations.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-ink">
                  <Trophy className="h-4 w-4 text-neon" />
                  مشارکت در چالش‌ها
                </p>
                <div className="space-y-1.5">
                  {detail.participations.map((p) => (
                    <div key={p.challengeId} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                      <p className="truncate text-[12px] font-bold text-ink">{p.challengeTitle}</p>
                      <span className="shrink-0 text-[10.5px] font-bold text-neon">{fa(p.count)} خبر</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* دفتر امتیاز */}
            {detail.pointsLog.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-ink">
                  <Flame className="h-4 w-4 text-warn" />
                  دفتر امتیاز (۱۲ مورد اخیر)
                </p>
                <div className="space-y-1 rounded-[20px] border border-line bg-surface p-2">
                  {detail.pointsLog.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 odd:bg-surface-2">
                      <span className="min-w-0 truncate text-[11.5px] text-ink-muted">{l.reason || "امتیاز"}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={cn("text-[12px] font-black", l.amount >= 0 ? "text-neon" : "text-danger-soft")} dir="ltr">
                          {l.amount >= 0 ? `+${faNum(l.amount)}` : faNum(l.amount)}
                        </span>
                        <span className="text-[9px] text-ink-muted/60">{relTime(l.createdAt)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoCell({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-ink-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-[12.5px] font-bold text-ink" dir={ltr ? "ltr" : undefined} style={ltr ? { textAlign: "right" } : undefined}>
        {value}
      </p>
    </div>
  )
}

function Kpi({ value, label, tone }: { value: string; label: string; tone?: "neon" | "danger" }) {
  return (
    <div className="text-center">
      <p className={cn("text-[15px] font-black leading-none", tone === "neon" ? "text-neon" : tone === "danger" ? "text-danger-soft" : "text-ink")}>{value}</p>
      <p className="mt-1 text-[9px] text-ink-muted">{label}</p>
    </div>
  )
}

function NewsStatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "تایید", cls: "bg-neon/12 text-neon" },
    rejected: { label: "رد", cls: "bg-danger/10 text-danger-soft" },
    pending: { label: "در بررسی", cls: "bg-warn/10 text-warn" },
  }
  const it = map[status] ?? map.pending
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold", it.cls)}>{it.label}</span>
}
