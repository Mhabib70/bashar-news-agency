import { db } from "@/lib/db"
import { DISTRICT_LABELS, BASE_LISTS } from "@/lib/domain"

// حوزه‌ها و پایگاه‌های سازمان — قابل ویرایش از پنل (ادمین کل و مدیر حوزه)
// تک‌ردیفی در جدول OrgUnits ذخیره می‌شود؛ اگر خالی بود پیش‌فرض‌های domain برمی‌گردند.

export type OrgDistrict = { key: string; label: string; bases: string[] }

function defaults(): OrgDistrict[] {
  return Object.entries(DISTRICT_LABELS)
    .filter(([k]) => k !== "none")
    .map(([key, label]) => ({ key, label, bases: BASE_LISTS[key] ?? [] }))
}

export async function getOrgUnits(): Promise<OrgDistrict[]> {
  const row = await db.orgUnits.findUnique({ where: { id: 1 } }).catch(() => null)
  if (row) {
    try {
      const parsed = JSON.parse(row.json) as OrgDistrict[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // json خراب → برگرد به پیش‌فرض
    }
  }
  return defaults()
}

export async function saveOrgUnits(units: OrgDistrict[]): Promise<void> {
  const json = JSON.stringify(units)
  await db.orgUnits.upsert({ where: { id: 1 }, update: { json }, create: { id: 1, json } })
}

// کلید یکتای جدید برای حوزه: d1، d2، ...
export function nextDistrictKey(units: OrgDistrict[]): string {
  let n = units.length + 1
  const used = new Set(units.map((d) => d.key))
  while (used.has(`d${n}`)) n++
  return `d${n}`
}
