"use client"

import { useEffect, useState } from "react"
import { Landmark, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react"
import { useApp } from "@/lib/store"
import { applyOrgUnits } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type OrgDistrict = { key: string; label: string; bases: string[] }

// مدیریت حوزه‌ها و پایگاه‌ها — ادمین کل و مدیر حوزه
// افزودن/ویرایش/حذف نام حوزه‌ها و پایگاه‌ها؛ تغییرات بلافاصله برای همه‌ کاربران (فرم ثبت‌نام، فیلترها و...) اعمال می‌شود.
export function AdminOrgUnitsSection() {
  const { userId, refresh } = useApp()
  const { toast } = useToast()
  const [units, setUnits] = useState<OrgDistrict[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingDistrict, setEditingDistrict] = useState<string | null>(null)
  const [districtDraft, setDistrictDraft] = useState("")
  const [newDistrict, setNewDistrict] = useState("")
  const [baseDraft, setBaseDraft] = useState<Record<string, string>>({})
  const [editingBase, setEditingBase] = useState<{ d: string; label: string } | null>(null)
  const [editBaseDraft, setEditBaseDraft] = useState("")

  const load = () => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then((d) => setUnits(d.units ?? []))
      .catch(() => setUnits([]))
  }
  useEffect(load, [])

  const act = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!userId || busy) return
    setBusy(true)
    try {
      const res = await fetch("/api/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...payload }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.ok) {
        toast({ title: "انجام شد", description: d.message })
        setUnits(d.units ?? [])
        applyOrgUnits(d.units ?? [])
        setEditingDistrict(null)
        setEditingBase(null)
        setNewDistrict("")
        setBaseDraft({})
        refresh()
      } else {
        toast({ title: "خطا", description: d.error ?? "عملیات ناموفق بود", variant: "destructive" })
      }
    } catch {
      toast({ title: "خطا", description: "خطای شبکه", variant: "destructive" })
    }
    setBusy(false)
  }

  if (units === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        در حال بارگذاری حوزه‌ها...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-neon" />
          <p className="text-[14px] font-black text-ink">حوزه‌ها و پایگاه‌های سازمان</p>
          <span className="rounded-full bg-neon/12 px-2.5 py-0.5 text-[10px] font-bold text-neon">{units.length} حوزه</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-5 text-ink-muted">
          اسامی حوزه‌ها و پایگاه‌ها را هر زمان لازم شد ویرایش، ثبت یا حذف کنید. تغییرات فوراً در فرم ثبت‌نام، فیلترها و پروفایل همه اعمال می‌شود. حوزه/پایگاهی که کاربر یا خبری به آن وصل باشد قابل حذف نیست.
        </p>
      </div>

      <div className="space-y-3">
        {units.map((d) => (
          <div key={d.key} className="rounded-[24px] border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              {editingDistrict === d.key ? (
                <>
                  <input
                    value={districtDraft}
                    onChange={(e) => setDistrictDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-neon/50"
                    autoFocus
                  />
                  <button
                    onClick={() => districtDraft.trim().length >= 2 && act("rename_district", { key: d.key, label: districtDraft.trim() })}
                    disabled={busy}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-neon text-neon-foreground disabled:opacity-50"
                    aria-label="ذخیره"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingDistrict(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted"
                    aria-label="انصراف"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-[14px] font-black text-ink">{d.label}</p>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9.5px] font-bold text-ink-muted">{d.bases.length} پایگاه</span>
                  <button
                    onClick={() => {
                      setEditingDistrict(d.key)
                      setDistrictDraft(d.label)
                    }}
                    disabled={busy}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-neon/40 hover:text-neon disabled:opacity-50"
                    aria-label="ویرایش نام حوزه"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => act("delete_district", { key: d.key })}
                    disabled={busy}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-danger/30 text-danger-soft transition-colors hover:bg-danger/8 disabled:opacity-50"
                    aria-label="حذف حوزه"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {d.bases.map((b) => {
                const editing = editingBase?.d === d.key && editingBase?.label === b
                return editing ? (
                  <span key={b} className="flex items-center gap-1 rounded-full border border-neon/45 bg-neon/8 px-2 py-1">
                    <input
                      value={editBaseDraft}
                      onChange={(e) => setEditBaseDraft(e.target.value)}
                      className="w-36 bg-transparent text-[11.5px] font-bold text-ink outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => editBaseDraft.trim().length >= 3 && act("rename_base", { districtKey: d.key, oldLabel: b, label: editBaseDraft.trim() })}
                      disabled={busy}
                      className="text-neon"
                      aria-label="ذخیره"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingBase(null)} className="text-ink-muted" aria-label="انصراف">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <span key={b} className="group flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-ink">
                    {b}
                    <button
                      onClick={() => {
                        setEditingBase({ d: d.key, label: b })
                        setEditBaseDraft(b)
                      }}
                      disabled={busy}
                      className="text-ink-muted/60 transition-colors hover:text-neon"
                      aria-label={`ویرایش ${b}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => act("delete_base", { districtKey: d.key, label: b })}
                      disabled={busy}
                      className="text-ink-muted/60 transition-colors hover:text-danger-soft"
                      aria-label={`حذف ${b}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
              {d.bases.length === 0 && <span className="text-[11px] text-ink-muted">پایگاهی ثبت نشده — از پایین اضافه کنید.</span>}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={baseDraft[d.key] ?? ""}
                onChange={(e) => setBaseDraft((p) => ({ ...p, [d.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (baseDraft[d.key] ?? "").trim().length >= 3) act("add_base", { districtKey: d.key, label: baseDraft[d.key].trim() })
                }}
                placeholder="نام پایگاه جدید..."
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12px] text-ink outline-none focus:border-neon/50"
              />
              <button
                onClick={() => (baseDraft[d.key] ?? "").trim().length >= 3 && act("add_base", { districtKey: d.key, label: baseDraft[d.key].trim() })}
                disabled={busy}
                className="flex items-center gap-1 rounded-full bg-neon px-4 py-2 text-[11.5px] font-bold text-neon-foreground disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                پایگاه
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 rounded-[24px] border border-dashed border-neon/40 bg-neon/5 p-4">
        <input
          value={newDistrict}
          onChange={(e) => setNewDistrict(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newDistrict.trim().length >= 2) act("add_district", { label: newDistrict.trim() })
          }}
          placeholder="نام حوزه جدید (مثلاً: حوزه برادران ۷)..."
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-[12.5px] text-ink outline-none focus:border-neon/50"
        />
        <button
          onClick={() => newDistrict.trim().length >= 2 && act("add_district", { label: newDistrict.trim() })}
          disabled={busy}
          className={cn("flex items-center gap-1.5 rounded-full bg-neon px-5 py-2.5 text-[12.5px] font-bold text-neon-foreground disabled:opacity-50")}
        >
          <Plus className="h-4 w-4" />
          حوزه جدید
        </button>
      </div>
    </div>
  )
}
