"use client"

import { useEffect, useRef, useState } from "react"

type VersionInfo = {
  versionCode: number
  versionName: string
  mandatory: boolean
  apkUrl: string
  notes: string
  update: boolean
}

const UA = () => (typeof navigator !== "undefined" ? navigator.userAgent || "" : "")

/** کد نسخه اپ از مارکر BasijNews/2.8.0 (12) داخل User-Agent */
function appVersionCode(ua: string): number {
  const m = ua.match(/BasijNews\/[\d.]+\s*\((\d+)\)/)
  return m ? Number(m[1]) : 0
}

/** اپ‌های ۲.۸.۰ به بعد لیسنر دانلود بومی دارند — لینک مستقیم همان‌جا دانلود و نصب می‌شود */
function hasNativeDownloader(ua: string): boolean {
  return appVersionCode(ua) >= 12
}

/** لینک را به Intent اندروید تبدیل می‌کند تا در مرورگر خارجی (کروم) باز شود — راه دانلود در اپ‌های قدیمی */
function toExternalIntent(apkUrl: string): string {
  const scheme = apkUrl.startsWith("https") ? "https" : "http"
  const rest = apkUrl.replace(/^https?:\/\//, "")
  return `intent://${rest}#Intent;scheme=${scheme};action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(apkUrl)};end`
}

/** کلید ذخیره‌سازی — بر اساس نسخه هدف؛ با آمدن نسخه جدید کلید عوض می‌شود و بنر دوباره می‌آید */
const storageKey = (code: number) => `upd-banner-done-${code}`

function markDone(code: number) {
  try {
    localStorage.setItem(storageKey(code), "1")
    sessionStorage.removeItem("upd-banner-closed") // پاکسازی کلید قدیمی
  } catch {}
}
function isDone(code: number) {
  try {
    return localStorage.getItem(storageKey(code)) === "1"
  } catch {
    return false
  }
}

function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text))
      return
    }
  } catch {}
  legacyCopy(text)
}
function legacyCopy(text: string) {
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
  } catch {}
}

/**
 * بنر به‌روزرسانی اپ — فقط در WebView اندرویدی و فقط وقتی نسخه اپ از نسخه سرور عقب است.
 * - زدن «دانلود و نصب»: در ۲.۸+ دانلود بومی همان‌جا شروع می‌شود؛ در اپ‌های قدیمی
 *   مرورگر خارجی باز می‌شود (intent) و لینک هم خودکار کپی می‌شود.
 * - بعد از زدن دانلود یا بستن، تا نسخه بعدی دیگر نمایش داده نمی‌شود (localStorage).
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<VersionInfo | null>(null)
  const [guide, setGuide] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const ua = UA()
      if (!/Android/i.test(ua) || !/;\s*wv\)/.test(ua)) return // فقط WebView اندروید
      const current = appVersionCode(ua)
      fetch(`/api/app-version?current=${current}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: VersionInfo) => {
          if (d && d.update && !isDone(d.versionCode)) setInfo(d)
        })
        .catch(() => {})
    } catch {
      // محیط غیرمرورگر — نادیده گرفته می‌شود
    }
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (!info && !guide) return null

  const hideAfter = (ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setGuide(null)
      setInfo(null)
    }, ms)
  }

  const startDownload = () => {
    markDone(info.versionCode) // از همین لحظه تا نسخه بعدی دیگر نمایش نده
    if (hasNativeDownloader(UA())) {
      // دانلود بومی: DownloadListener اپ می‌گیرد، DownloadManager دانلود و صفحه نصب باز می‌شود
      setInfo(null)
      setGuide("⬇️ در حال دریافت نسخه جدید… صفحه نصب به‌زودی باز می‌شود.")
      hideAfter(6000)
      window.location.href = info.apkUrl
      return
    }
    // اپ قدیمی: لینک را کپی کن + مرورگر خارجی را باز کن
    copyToClipboard(info.apkUrl)
    setInfo(null)
    setGuide(
      "📱 در حال باز کردن مرورگر برای دانلود… اگر مرورگر باز نشد، لینک کپی شده است — آن را در مرورگر (کروم) بچسبانید و باز کنید تا نصب شروع شود."
    )
    hideAfter(12000)
    try {
      window.location.href = toExternalIntent(info.apkUrl)
    } catch {}
  }

  const dismiss = () => {
    markDone(info ? info.versionCode : 0)
    setInfo(null)
    setGuide(null)
  }

  // حالت راهنما بعد از زدن دانلود
  if (!info && guide) {
    return (
      <div dir="rtl" className="fixed inset-x-3 bottom-3 z-[100] animate-[fadeUp_.35s_ease-out]">
        <div className="rounded-2xl border border-[#7bb661]/50 bg-gradient-to-l from-[#0d2b14] via-[#123c1b] to-[#0d2b14] p-3.5 text-[11.5px] leading-6 text-white/90 shadow-[0_14px_38px_-12px_rgba(47,107,51,0.75)] backdrop-blur">
          {guide}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="fixed inset-x-3 bottom-3 z-[100] animate-[fadeUp_.45s_ease-out]">
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
              <button
                onClick={startDownload}
                className="flex-1 rounded-xl bg-gradient-to-l from-[#7bb661] to-[#2f6b33] px-4 py-2 text-center text-[12.5px] font-black text-white shadow-[0_6px_18px_-6px_rgba(123,182,97,0.9)] transition active:scale-[0.97]"
              >
                ⬇️ دانلود و نصب به‌روزرسانی
              </button>
              <button
                onClick={() => {
                  copyToClipboard(info.apkUrl)
                  setGuide("✓ لینک کپی شد — آن را در مرورگر (کروم) باز کنید تا نصب شروع شود.")
                  markDone(info.versionCode)
                  hideAfter(8000)
                  setInfo(null)
                }}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[11.5px] font-bold text-white/80 transition hover:bg-white/10 active:scale-[0.97]"
              >
                کپی لینک
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
