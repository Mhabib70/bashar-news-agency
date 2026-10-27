"use client"

import { FileDown, Users2, Newspaper, Map, IdCard, ShieldCheck } from "lucide-react"
import { useApp } from "@/lib/store"

// خروجی‌های CSV سازمانی (UTF-8 سازگار با اکسل فارسی)
export function AdminExportsSection() {
  const { userId } = useApp()
  const items = [
    { type: "users", label: "کاربران و نقش‌ها", desc: "همه اعضا با امتیاز، سطح، حوزه، پایگاه و وضعیت", icon: <Users2 className="h-5 w-5" /> },
    { type: "news", label: "کل اخبار", desc: "با کد پیگیری، خبرنگار، وضعیت و مرحله بررسی", icon: <Newspaper className="h-5 w-5" /> },
    { type: "districts", label: "گزارش حوزه‌ها", desc: "آمار اخبار و اعضای هر ۱۲ حوزه", icon: <Map className="h-5 w-5" /> },
    { type: "presscard", label: "کارت خبرنگاری ادمین", desc: "شناسنامه فعالیت حساب شما", icon: <IdCard className="h-5 w-5" /> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-[24px] border border-neon/25 bg-neon/6 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-neon" />
        <p className="text-[12px] leading-6 text-ink-muted">
          فایل‌ها با کدگذاری UTF-8 و BOM تولید می‌شوند و مستقیماً در اکسل فارسی قابل بازکردن هستند.
          داده‌های لحظه دریافت شامل همه اعضا و اخبار سازمان است.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((it) => (
          <a
            key={it.type}
            href={`/api/export?type=${it.type}&userId=${encodeURIComponent(userId ?? "")}`}
            className="group flex items-center justify-between rounded-[24px] border border-line bg-surface px-5 py-4 transition-all hover:border-neon/40 hover:shadow-[0_10px_30px_-14px_rgba(0,0,0,0.4)]"
          >
            <span className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon/12 text-neon transition-transform group-hover:scale-105">
                {it.icon}
              </span>
              <span>
                <span className="block text-[14px] font-bold text-ink">{it.label}</span>
                <span className="block text-[11px] text-ink-muted">{it.desc}</span>
              </span>
            </span>
            <FileDown className="h-5 w-5 text-ink-muted/40 transition-colors group-hover:text-neon" />
          </a>
        ))}
      </div>
    </div>
  )
}
