import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrgUnits, saveOrgUnits, nextDistrictKey, type OrgDistrict } from "@/lib/server/orgunits"
import { activeUser } from "@/lib/server/session"

// مدیریت حوزه‌ها و پایگاه‌های سازمان — قابل استفاده برای ادمین کل و مدیر حوزه
// GET  → فهرست حوزه‌ها و پایگاه‌ها (عمومی — فرم ثبت‌نام هم لازم دارد)
// POST → اقدامات: add_district | rename_district | delete_district |
//                   add_base | rename_base | delete_base
export async function GET() {
  const units = await getOrgUnits()
  return NextResponse.json({ units })
}

const clean = (s: unknown, max = 60) => String(s ?? "").trim().slice(0, max)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body ?? {}
    const actor = await activeUser(req)
    if (!actor || !["admin", "district_manager"].includes(actor.role) || actor.status !== "active") {
      return NextResponse.json({ error: "فقط ادمین کل و مدیر حوزه می‌توانند حوزه‌ها و پایگاه‌ها را ویرایش کنند" }, { status: 403 })
    }

    const units = await getOrgUnits()
    const findDistrict = (key: string) => units.find((d) => d.key === key)

    if (action === "add_district") {
      const label = clean(body.label)
      if (label.length < 2) return NextResponse.json({ error: "نام حوزه حداقل ۲ کاراکتر باشد" }, { status: 400 })
      if (units.some((d) => d.label === label)) return NextResponse.json({ error: "حوزه‌ای با این نام وجود دارد" }, { status: 409 })
      units.push({ key: nextDistrictKey(units), label, bases: [] })
      await saveOrgUnits(units)
      return NextResponse.json({ ok: true, units, message: `حوزه «${label}» اضافه شد.` })
    }

    if (action === "rename_district") {
      const d = findDistrict(String(body.key ?? ""))
      const label = clean(body.label)
      if (!d) return NextResponse.json({ error: "حوزه یافت نشد" }, { status: 404 })
      if (label.length < 2) return NextResponse.json({ error: "نام حوزه حداقل ۲ کاراکتر باشد" }, { status: 400 })
      if (units.some((x) => x.label === label && x.key !== d.key)) {
        return NextResponse.json({ error: "حوزه‌ای با این نام وجود دارد" }, { status: 409 })
      }
      d.label = label
      await saveOrgUnits(units)
      return NextResponse.json({ ok: true, units, message: `نام حوزه به «${label}» تغییر کرد.` })
    }

    if (action === "delete_district") {
      const d = findDistrict(String(body.key ?? ""))
      if (!d) return NextResponse.json({ error: "حوزه یافت نشد" }, { status: 404 })
      const [userCount, newsCount] = await Promise.all([
        db.user.count({ where: { district: d.key } }),
        db.newsItem.count({ where: { district: d.key } }),
      ])
      if (userCount > 0 || newsCount > 0) {
        return NextResponse.json(
          { error: `این حوزه قابل حذف نیست: ${userCount} کاربر و ${newsCount} خبر به آن وصل هستند. اول آنها را به حوزه دیگر منتقل کنید.` },
          { status: 409 },
        )
      }
      const next = units.filter((x) => x.key !== d.key)
      await saveOrgUnits(next)
      return NextResponse.json({ ok: true, units: next, message: `حوزه «${d.label}» حذف شد.` })
    }

    if (action === "add_base") {
      const d = findDistrict(String(body.districtKey ?? ""))
      const label = clean(body.label)
      if (!d) return NextResponse.json({ error: "حوزه یافت نشد" }, { status: 404 })
      if (label.length < 3) return NextResponse.json({ error: "نام پایگاه حداقل ۳ کاراکتر باشد" }, { status: 400 })
      if (d.bases.includes(label)) return NextResponse.json({ error: "این پایگاه قبلاً ثبت شده است" }, { status: 409 })
      d.bases.push(label)
      await saveOrgUnits(units)
      return NextResponse.json({ ok: true, units, message: `پایگاه «${label}» اضافه شد.` })
    }

    if (action === "rename_base") {
      const d = findDistrict(String(body.districtKey ?? ""))
      const oldLabel = clean(body.oldLabel)
      const newLabel = clean(body.label)
      if (!d) return NextResponse.json({ error: "حوزه یافت نشد" }, { status: 404 })
      if (!d.bases.includes(oldLabel)) return NextResponse.json({ error: "پایگاه یافت نشد" }, { status: 404 })
      if (newLabel.length < 3) return NextResponse.json({ error: "نام پایگاه حداقل ۳ کاراکتر باشد" }, { status: 400 })
      if (oldLabel !== newLabel && d.bases.includes(newLabel)) {
        return NextResponse.json({ error: "پایگاهی با این نام در همین حوزه وجود دارد" }, { status: 409 })
      }
      d.bases = d.bases.map((b) => (b === oldLabel ? newLabel : b))
      await saveOrgUnits(units)
      // نام پایگاه روی پروفایل کاربران ذخیره شده — هم‌زمان به‌روز شود
      await db.user.updateMany({ where: { district: d.key, base: oldLabel }, data: { base: newLabel } })
      return NextResponse.json({ ok: true, units, message: `نام پایگاه به «${newLabel}» تغییر کرد و پروفایل کاربرانش به‌روز شد.` })
    }

    if (action === "delete_base") {
      const d = findDistrict(String(body.districtKey ?? ""))
      const label = clean(body.label)
      if (!d) return NextResponse.json({ error: "حوزه یافت نشد" }, { status: 404 })
      if (!d.bases.includes(label)) return NextResponse.json({ error: "پایگاه یافت نشد" }, { status: 404 })
      const userCount = await db.user.count({ where: { district: d.key, base: label } })
      if (userCount > 0) {
        return NextResponse.json(
          { error: `این پایگاه قابل حذف نیست: ${userCount} کاربر روی آن هستند. اول آنها را جابه‌جا کنید.` },
          { status: 409 },
        )
      }
      d.bases = d.bases.filter((b) => b !== label)
      await saveOrgUnits(units)
      return NextResponse.json({ ok: true, units, message: `پایگاه «${label}» حذف شد.` })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت حوزه‌ها و پایگاه‌ها" }, { status: 500 })
  }
}
