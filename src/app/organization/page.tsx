"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Landmark, Loader2, ShieldCheck } from "lucide-react"
import { useApp } from "@/lib/store"
import { NeonAvatar } from "@/components/app/bits"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { AdminOrgUnitsSection } from "@/components/admin/org-units"

// مدیریت حوزه‌ها و پایگاه‌ها — در دسترس ادمین کل و مدیر حوزه
export default function OrganizationPage() {
  const router = useRouter()
  const { userId, state, booted, login } = useApp()

  useEffect(() => {
    const uid = localStorage.getItem("newsapp_uid")
    if (uid) login(uid).catch(() => router.replace("/"))
    else router.replace("/")
  }, [login, router])

  const role = state?.user.role
  const allowed = role === "admin" || role === "district_manager"

  if (!booted || !state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--page)]">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--page)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface">
            <ShieldCheck className="h-7 w-7 text-danger" />
          </span>
          <p className="text-[14px] font-black text-ink">دسترسی محدود</p>
          <p className="max-w-[260px] text-[12px] leading-5 text-ink-muted">مدیریت حوزه‌ها و پایگاه‌ها فقط برای ادمین کل و مدیر حوزه فعال است.</p>
          <button onClick={() => router.replace("/")} className="rounded-full bg-neon px-6 py-3 text-[13px] font-bold text-neon-foreground">
            بازگشت به اپ
          </button>
        </div>
      </main>
    )
  }

  const user = state.user

  return (
    <main className="min-h-dvh bg-[var(--page)]">
      <header className="sticky top-0 z-40 border-b border-line bg-[var(--nav-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <button
            onClick={() => router.push(state.user.role === "admin" ? "/admin" : "/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink"
            aria-label="بازگشت"
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[13.5px] font-black text-ink">
              <Landmark className="h-4 w-4 text-neon" />
              حوزه‌ها و پایگاه‌ها
            </p>
            <p className="text-[10px] font-semibold text-neon">ساختار سازمان خبرگزاری</p>
          </div>
          <NeonAvatar name={user.fullName} src={user.avatar} size={38} />
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[720px] px-4 py-5">
        <AdminOrgUnitsSection />
      </div>
    </main>
  )
}
