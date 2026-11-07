"use client"

import { useEffect, useState } from "react"

type VersionInfo = {
  versionCode: number
  versionName: string
  mandatory: boolean
  apkUrl: string
  notes: string
  update: boolean
}

/**
 * بنر به‌روزرسانی اپ — فقط در WebView اندرویدی نمایش داده می‌شود.
 * نسخه فعلی از مارکر BasijNews/... داخل User-Agent خوانده می‌شود؛
 * اگر اپ قدیمی‌تر از آخرین نسخه سرور باشد، بنر «دانلود و نصب» می‌آید.
 * در اپ ۲.۸.۰+ دانلود با DownloadListener بومی گرفته شده و مستقیم به نصب می‌رسد؛
 * در نسخه‌های قدیمی‌تر، دکمه «کپی لینک» کمکی فراهم است.
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<VersionInfo | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const ua = navigator.userAgent || ""
      if (!/Android/i.test(ua) || !/;\s*wv\)/.test(ua)) return // فقط WebView اندروید
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("upd-banner-closed") === "1") return
      const m = ua.match(/BasijNews\/([\d.]+)\s*\((\d+)\)/)
      const current = m ? Number(m[2]) : 0
      fetch(`/api/app-version?current=${current}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: VersionInfo) => {
          if (d && d.update) setInfo(d)
        })
        .catch(() => {})
    } catch {
      // محیط غیرمرورگر — نادیده گرفته می‌شود
    }
  }, [])

  if (!info) return null

  const dismiss = () => {
    try {
      sessionStorage.setItem("upd-banner-closed", "1")
    } catch {}
    setInfo(null)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(info.apkUrl)
    } catch {
      try {
        const ta = document.createElement("textarea")
        ta.value = info.apkUrl
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      } catch {}
    }
    setCopied(true)
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-x-3 bottom-3 z-[100] animate-[fadeUp_.45s_ease-out]"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#7bb661]/50 bg-gradient-to-l from-[#0d2b14] via-[#123c1b] to-[#0d2b14] p-3.5 shadow-[0_14px_38px_-12px_rgba(47,107,51,0.75)] backdrop-blur">
        {/* هاله نئونی پس‌زمینه */}
        <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-[#7bb661]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-6 h-24 w-24 rounded-full bg-[#38bdf8]/15 blur-2xl" />

        <button
          onClick={dismiss}
          aria-label="بستن"
          className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/5 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7bb661] to-[#2f6b33] text-xl shadow-[0_6px_16px_-6px_rgba(47,107,51,0.8)]">
            🎉
          </div>
          <div className="min-w-0 flex-1 pl-6">
            <p className="text-[13.5px] font-black text-white">
              نسخه جدید {info.versionName} منتشر شد!
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-white/70">
              {info.notes}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <a
                href={info.apkUrl}
                className="flex-1 rounded-xl bg-gradient-to-l from-[#7bb661] to-[#2f6b33] px-4 py-2 text-center text-[12.5px] font-black text-white shadow-[0_6px_18px_-6px_rgba(123,182,97,0.9)] transition active:scale-[0.97]"
              >
                ⬇️ دانلود و نصب به‌روزرسانی
              </a>
              <button
                onClick={copyLink}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[11.5px] font-bold text-white/80 transition hover:bg-white/10 active:scale-[0.97]"
              >
                {copied ? "✓ کپی شد" : "کپی لینک"}
              </button>
            </div>
            {copied && (
              <p className="mt-1.5 text-[10px] text-[#7dd3fc]">
                لینک کپی شد — آن را در مرورگر (کروم) باز کنید تا نصب شروع شود.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
