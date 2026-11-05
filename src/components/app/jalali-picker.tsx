"use client"

import { useState } from "react"
import { CalendarClock, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { toJalaali, jalaliToDate, jalaliMonthLength, jalaliMonthStartWeekday, JALALI_MONTHS, JALALI_WEEKDAYS } from "@/lib/jalali"
import { fa } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const fa2 = (n: number) => fa(String(n).padStart(2, "0"))

// انتخابگر تاریخ شمسی + ساعت (معادل تقویم ربات)
export function JalaliPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: Date | null
  onChange: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const init = value ?? today
  const initJ = toJalaali(init)
  const [vy, setVy] = useState(initJ.jy)
  const [vm, setVm] = useState(initJ.jm)
  const [sel, setSel] = useState<{ jy: number; jm: number; jd: number } | null>(value ? initJ : null)
  const [hh, setHh] = useState(value ? value.getHours() : 12)
  const [mm, setMm] = useState(value ? value.getMinutes() : 0)

  const openDialog = () => {
    // مقداردهی اولیه هنگام باز کردن (به‌جای effect)
    const src = value ?? new Date()
    const j = toJalaali(src)
    setVy(j.jy)
    setVm(j.jm)
    setSel(value ? j : null)
    setHh(value ? value.getHours() : 12)
    setMm(value ? value.getMinutes() : 0)
    setOpen(true)
  }

  const len = jalaliMonthLength(vy, vm)
  const offset = jalaliMonthStartWeekday(vy, vm)
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const confirm = () => {
    const base = sel ? jalaliToDate(sel.jy, sel.jm, sel.jd) : jalaliToDate(vy, vm, 1)
    base.setHours(hh, mm, 0, 0)
    onChange(base)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-right transition-colors hover:bg-surface-2"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon/12 text-neon">
          <CalendarClock className="h-4.5 w-4.5" />
        </span>
        <span className="flex-1">
          <span className="block text-[11px] font-semibold text-ink-muted">{label}</span>
          <span className="block text-[13.5px] font-bold text-ink">
            {value
              ? `${fa(toJalaali(value).jd)} ${JALALI_MONTHS[toJalaali(value).jm - 1]} ${fa(toJalaali(value).jy)} — ${fa2(value.getHours())}:${fa2(value.getMinutes())}`
              : "انتخاب کنید"}
          </span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-h-[86dvh] overflow-y-auto nice-scroll rounded-[28px] border-line bg-popover p-5">
          <DialogHeader className="text-right">
            <DialogTitle className="text-ink">{label}</DialogTitle>
            <DialogDescription className="text-ink-muted">تاریخ شمسی و ساعت را انتخاب کنید</DialogDescription>
          </DialogHeader>

          {/* ناوبری ماه */}
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-surface px-2 py-2">
            <button
              type="button"
              onClick={() => (vm === 12 ? (setVy(vy + 1), setVm(1)) : setVm(vm + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-[14.5px] font-black text-ink">
              {JALALI_MONTHS[vm - 1]} {fa(vy)}
            </span>
            <button
              type="button"
              onClick={() => (vm === 1 ? (setVy(vy - 1), setVm(12)) : setVm(vm - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="ماه قبل"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* شبکه روزها */}
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {JALALI_WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-[10.5px] font-bold text-ink-muted">
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />
              const isToday = toJalaali(today).jy === vy && toJalaali(today).jm === vm && toJalaali(today).jd === d
              const isSel = sel?.jy === vy && sel?.jm === vm && sel?.jd === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSel({ jy: vy, jm: vm, jd: d })}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-xl text-[12.5px] font-bold transition-colors",
                    isSel
                      ? "bg-neon text-neon-foreground"
                      : isToday
                        ? "border border-neon/40 text-neon"
                        : "text-ink hover:bg-surface-2",
                  )}
                >
                  {fa(d)}
                </button>
              )
            })}
          </div>

          {/* ساعت و دقیقه */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="rounded-2xl border border-line bg-surface p-2">
              <span className="block px-1 text-[10.5px] font-semibold text-ink-muted">ساعت</span>
              <select
                value={hh}
                onChange={(e) => setHh(Number(e.target.value))}
                className="w-full bg-transparent px-1 text-[14px] font-bold text-ink outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h} className="bg-popover text-ink">
                    {fa2(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="rounded-2xl border border-line bg-surface p-2">
              <span className="block px-1 text-[10.5px] font-semibold text-ink-muted">دقیقه</span>
              <select
                value={mm}
                onChange={(e) => setMm(Number(e.target.value))}
                className="w-full bg-transparent px-1 text-[14px] font-bold text-ink outline-none"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m} className="bg-popover text-ink">
                    {fa2(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={confirm}
            disabled={!sel}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-neon py-3 text-[14px] font-bold text-neon-foreground disabled:opacity-40"
          >
            <Check className="h-4.5 w-4.5" />
            تایید تاریخ
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
