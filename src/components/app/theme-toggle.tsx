"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, MoonStar } from "lucide-react"
import { cn } from "@/lib/utils"

// سوییچ تم سه‌حالته — اونیکس (زغالی+سبز، پیش‌فرض) / روشن (Candy) / تیره (قرمز عمیق)
// با next-themes روی <html> کلاس onyx/light/dark می‌گذارد
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { setTheme } = useTheme()

  const cycle = () => {
    const cls = document.documentElement.classList
    const next = cls.contains("onyx") ? "light" : cls.contains("light") ? "dark" : "onyx"
    setTheme(next)
  }

  if (compact) {
    return (
      <button
        onClick={cycle}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface text-on-surface transition-colors hover:bg-surface-container-low"
        aria-label="تغییر تم"
        title="تغییر تم: اونیکس / روشن / تیره"
      >
        {/* اونیکس و تیره: خورشید (پیشنهاد رفتن به روشن) — روشن: ماه */}
        <Sun className="hidden h-4.5 w-4.5 onyx:block dark:block" />
        <Moon className="h-4.5 w-4.5 onyx:hidden dark:hidden" />
      </button>
    )
  }

  return (
    <div className="flex rounded-full border border-outline-variant/40 bg-surface-container-low p-1">
      <button
        onClick={() => setTheme("onyx")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all",
          "bg-neon text-neon-foreground dark:bg-transparent dark:text-on-surface-variant dark:hover:text-on-surface",
        )}
      >
        <MoonStar className="h-4 w-4" />
        اونیکس
      </button>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all",
          "bg-transparent text-on-surface-variant hover:text-on-surface",
        )}
      >
        <Sun className="h-4 w-4" />
        روشن
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all",
          "bg-transparent text-on-surface-variant hover:text-on-surface",
        )}
      >
        <Moon className="h-4 w-4" />
        تیره
      </button>
    </div>
  )
}
