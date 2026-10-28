"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

// سوییچ دارک/لایت — با next-themes روی <html> کلاس light/dark می‌گذارد
// بدون state مربوط به mount: از واریانت‌های CSS بر اساس کلاس html استفاده می‌کنیم
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { setTheme } = useTheme()

  if (compact) {
    return (
      <button
        onClick={() => setTheme(document.documentElement.classList.contains("light") ? "dark" : "light")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2"
        aria-label="تغییر حالت روشن/تیره"
        title="تغییر حالت روشن/تیره"
      >
        <Sun className="hidden h-4.5 w-4.5 dark:block" />
        <Moon className="h-4.5 w-4.5 dark:hidden" />
      </button>
    )
  }

  return (
    <div className="flex rounded-full border border-line bg-surface-2 p-1">
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all",
          "bg-neon text-neon-foreground dark:bg-transparent dark:text-ink-muted dark:hover:text-ink",
        )}
      >
        <Moon className="h-4 w-4" />
        تیره
      </button>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all",
          "bg-transparent text-ink-muted hover:text-ink dark:bg-neon dark:text-neon-foreground",
        )}
      >
        <Sun className="h-4 w-4" />
        روشن
      </button>
    </div>
  )
}
