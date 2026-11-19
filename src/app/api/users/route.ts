import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyUser } from "@/lib/server/notify"
import { USER_REJECT_TITLES, ROLE_LABELS, DISTRICT_LABELS } from "@/lib/domain"
import { isSuperAdminPhone } from "@/lib/server/superadmin"
import { activeUser } from "@/lib/server/session"
import { logSec } from "@/lib/server/security-log"
import { normalizePhone } from "@/lib/domain"

// مدیریت کاربران — فقط ادمین کل
// GET  بدون targetId: لیست همه اعضا | GET با targetId: پرونده کامل کاربر
// POST: تایید/رد درخواست عضویت + نقش + مجوز ایتا (معادل سناریوی ۱ ربات)
// PATCH: ویرایش مشخصات کاربر (نام/تلفن/حوزه/پایگاه/تحصیلات/سن)
// DELETE: حذف کامل کاربر و همه ردپاهایش (آخرین گزینه — غیرقابل بازگشت)
export async function GET(req: NextRequest) {
  const admin = await activeUser(req)
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
  }

  const targetId = req.nextUrl.searchParams.get("targetId")
  if (targetId) {
    const u = await db.user.findUnique({
      where: { id: targetId },
      include: {
        badges: { orderBy: { awardedAt: "desc" } },
        pointsLogs: { orderBy: { createdAt: "desc" }, take: 12 },
        news: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, code: true, title: true, status: true, category: true, createdAt: true } },
        participations: { include: { challenge: { select: { id: true, title: true, status: true } } }, orderBy: { joinedAt: "desc" } },
      },
    })
    if (!u) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

    const [approved, rejected, pending, rankRow] = await Promise.all([
      db.newsItem.count({ where: { reporterId: u.id, status: "approved" } }),
      db.newsItem.count({ where: { reporterId: u.id, status: "rejected" } }),
      db.newsItem.count({ where: { reporterId: u.id, status: "pending" } }),
      db.user.count({ where: { role: "reporter", points: { gt: u.points } } }),
    ])
    const decided = approved + rejected
    return NextResponse.json({
      user: {
        id: u.id, fullName: u.fullName, username: u.username, role: u.role, status: u.status, active: u.active,
        rejectReason: u.rejectReason, district: u.district, base: u.base, phone: u.phone,
        age: u.age, education: u.education, canSendEitaa: u.canSendEitaa, canManageContent: u.canManageContent, points: u.points, levelKey: u.levelKey,
        currentStreak: u.currentStreak, bestStreak: u.bestStreak, avatar: u.avatar,
        isSuperAdmin: isSuperAdminPhone(u.phone),
        lastActivityAt: u.lastActivityAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      },
      stats: {
        newsTotal: approved + rejected + pending, approved, rejected, pending,
        approveRate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
        rank: u.role === "reporter" ? rankRow + 1 : null,
      },
      badges: u.badges.map((b) => ({ key: b.badgeKey, awardedAt: b.awardedAt.toISOString() })),
      pointsLog: u.pointsLogs.map((l) => ({ amount: l.amount, reason: l.reason, createdAt: l.createdAt.toISOString() })),
      news: u.news.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      participations: u.participations.map((p) => ({
        challengeId: p.challengeId, count: p.count, joinedAt: p.joinedAt.toISOString(),
        challengeTitle: p.challenge.title, challengeStatus: p.challenge.status,
      })),
    })
  }

  const users = await db.user.findMany({
    select: {
      id: true, fullName: true, username: true, role: true, status: true, active: true, rejectReason: true,
      district: true, base: true, phone: true, age: true, education: true, canSendEitaa: true, canManageContent: true,
      points: true, levelKey: true, currentStreak: true, bestStreak: true, avatar: true,
      lastActivityAt: true, createdAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }], // pending اول
  })
  return NextResponse.json({ users: users.map((u) => ({ ...u, isSuperAdmin: isSuperAdminPhone(u.phone) })) })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, targetId, reason } = body ?? {}
    // احراز هویت با کوکی نشست (پارامتر userId قدیمی اعتبار ندارد)
    const admin = await activeUser(req)
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (target.id === admin.id) return NextResponse.json({ error: "تغییر وضعیت حساب خودتان ممکن نیست" }, { status: 400 })
    // حساب ادمین کل سامانه (شماره محافظت‌شده) قابل تغییر نیست — نه نقش، نه وضعیت
    if (isSuperAdminPhone(target.phone)) {
      return NextResponse.json({ error: "حساب ادمین کل سامانه محافظت‌شده است و نقش/وضعیت آن قابل تغییر نیست" }, { status: 403 })
    }

    if (action === "approve") {
      if (target.status !== "pending") {
        return NextResponse.json({ error: "فقط درخواست‌های در انتظار تایید قابل تایید هستند" }, { status: 409 })
      }
      await db.user.update({ where: { id: target.id }, data: { status: "active", rejectReason: "" } })
      await notifyUser(target.id, "user_status", "✅ عضویت شما تایید شد", `${admin.fullName} درخواست عضویت شما را تایید کرد. از این پس می‌توانید خبر ارسال کنید.`, `user:${target.id}`, { force: true })
      return NextResponse.json({ ok: true, message: `عضویت ${target.fullName} تایید شد.` })
    }

    if (action === "reject") {
      if (target.status !== "pending") {
        return NextResponse.json({ error: "فقط درخواست‌های در انتظار قابل رد هستند" }, { status: 409 })
      }
      const reasonKey = reason && USER_REJECT_TITLES[reason] ? reason : "other"
      await db.user.update({ where: { id: target.id }, data: { status: "rejected", rejectReason: reasonKey } })
      await notifyUser(target.id, "user_status", "❌ درخواست عضویت شما رد شد", `دلیل: ${USER_REJECT_TITLES[reasonKey]} — در صورت نیاز می‌توانید مجدداً ثبت‌نام کنید.`, `user:${target.id}`, { force: true })
      return NextResponse.json({ ok: true, message: `درخواست ${target.fullName} رد شد (${USER_REJECT_TITLES[reasonKey]}).` })
    }

    // انتصاب نقش — کلید رفع گلوگاه چرخه: ادمین می‌تواند هر کاربر را به هر نقشی
    // (از جمله ادمین کل) ارتقا دهد یا تنزل دهد
    if (action === "set_role") {
      const newRole = String(body.newRole ?? "")
      if (!["reporter", "district_manager", "specialist", "admin"].includes(newRole)) {
        return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 })
      }
      if (target.status === "pending") {
        return NextResponse.json({ error: "اول عضویت این کاربر را تایید کنید" }, { status: 409 })
      }
      // مدیر حوزه باید حوزه مشخص داشته باشد — اختیاری: تغییر حوزه در همین اکشن
      const newDistrict = typeof body.newDistrict === "string" && body.newDistrict ? body.newDistrict : target.district
      const wasRole = target.role
      await db.user.update({ where: { id: target.id }, data: { role: newRole, district: newDistrict } })
      const roleChanged = wasRole !== newRole
      if (roleChanged) {
        void logSec({
          kind: "user_role",
          title: `تغییر نقش کاربر به «${ROLE_LABELS[newRole]}»`,
          detail: `${target.fullName} — نقش قبلی: ${ROLE_LABELS[wasRole] ?? wasRole}`,
          actorName: admin.fullName,
          severity: "warn",
        })
      }
      await notifyUser(
        target.id,
        "user_status",
        roleChanged ? "🎖️ نقش سازمانی شما تغییر کرد" : "👤 نقش شما به‌روزرسانی شد",
        roleChanged
          ? `${admin.fullName} نقش شما را به «${ROLE_LABELS[newRole]}» تغییر داد.${newRole === "district_manager" ? ` حوزه مسئولیت شما: ${DISTRICT_LABELS[newDistrict] ?? newDistrict}` : ""}`
          : `حوزه شما به «${DISTRICT_LABELS[newDistrict] ?? newDistrict}» به‌روزرسانی شد.`,
        `user:${target.id}`,
        { force: true },
      )
      return NextResponse.json({
        ok: true,
        message: roleChanged
          ? `نقش ${target.fullName} به «${ROLE_LABELS[newRole]}» تغییر کرد.`
          : `حوزه ${target.fullName} به‌روزرسانی شد.`,
      })
    }

    // مجوز مدیریت تالار و آموزش — فقط با ارادهٔ ادمین کل (معمولاً به کارشناس داده می‌شود)
    if (action === "set_content_perm") {
      const allowed = body.allowed === true
      if (target.role !== "specialist") {
        return NextResponse.json({ error: "این مجوز فقط برای نقش «کارشناس خبر» معنا دارد" }, { status: 400 })
      }
      await db.user.update({ where: { id: target.id }, data: { canManageContent: allowed } })
      await notifyUser(
        target.id,
        "user_status",
        allowed ? "🎓 مجوز مدیریت تالار و آموزش فعال شد" : "🎓 مجوز مدیریت تالار و آموزش برداشته شد",
        allowed
          ? `${admin.fullName} به شما اجازه داد در تالار گفتگو موضوع درج کنید و درس آموزشی منتشر کنید.`
          : `ادمین کل مجوز مدیریت تالار و آموزش را از شما گرفت.`,
        `user:${target.id}`,
        { force: true },
      )
      return NextResponse.json({
        ok: true,
        message: allowed ? `مجوز مدیریت تالار/آموزش برای ${target.fullName} فعال شد.` : `مجوز مدیریت تالار/آموزش از ${target.fullName} گرفته شد.`,
      })
    }

    // مجوز مدیریت تالار و آموزش — فقط با ارادهٔ ادمین کل (معمولاً به کارشناس داده می‌شود)
    if (action === "set_content_perm") {
      const allowed = body.allowed === true
      if (target.role !== "specialist") {
        return NextResponse.json({ error: "این مجوز فقط برای نقش «کارشناس خبر» معنا دارد" }, { status: 400 })
      }
      await db.user.update({ where: { id: target.id }, data: { canManageContent: allowed } })
      await notifyUser(
        target.id,
        "user_status",
        allowed ? "🎓 مجوز مدیریت تالار و آموزش فعال شد" : "🎓 مجوز مدیریت تالار و آموزش برداشته شد",
        allowed
          ? `${admin.fullName} به شما اجازه داد در تالار گفتگو موضوع درج کنید و درس آموزشی منتشر کنید.`
          : `ادمین کل مجوز مدیریت تالار و آموزش را از شما گرفت.`,
        `user:${target.id}`,
        { force: true },
      )
      return NextResponse.json({
        ok: true,
        message: allowed ? `مجوز مدیریت تالار/آموزش برای ${target.fullName} فعال شد.` : `مجوز مدیریت تالار/آموزش از ${target.fullName} گرفته شد.`,
      })
    }

    // مجوز ارسال خبر به کانال ایتا — فقط با ارادهٔ ادمین کل به کارشناس داده/گرفته می‌شود
    if (action === "set_eitaa_perm") {
      const allowed = body.allowed === true
      if (target.role !== "specialist") {
        return NextResponse.json({ error: "این مجوز فقط برای نقش «کارشناس خبر» معنا دارد" }, { status: 400 })
      }
      await db.user.update({ where: { id: target.id }, data: { canSendEitaa: allowed } })
      await notifyUser(
        target.id,
        "user_status",
        allowed ? "📨 مجوز ارسال به ایتا فعال شد" : "📨 مجوز ارسال به ایتا برداشته شد",
        allowed
          ? `${admin.fullName} به شما اجازه داد خبرها را به کانال ایتا ارسال کنید.`
          : `ادمین کل مجوز ارسال خبر به کانال ایتا را از شما گرفت.`,
        `user:${target.id}`,
        { force: true },
      )
      return NextResponse.json({
        ok: true,
        message: allowed ? `مجوز ارسال به ایتا برای ${target.fullName} فعال شد.` : `مجوز ارسال به ایتا از ${target.fullName} گرفته شد.`,
      })
    }

    // قطع/وصل دسترسی کاربر — toggle پنل مدیریت (کاربر غیرفعال نمی‌تواند وارد شود)
    if (action === "set_active") {
      const enabled = body.enabled === true
      if (target.status === "pending") {
        return NextResponse.json({ error: "اول عضویت این کاربر را تایید کنید" }, { status: 409 })
      }
      await db.user.update({ where: { id: target.id }, data: { active: enabled } })
      await notifyUser(
        target.id,
        "user_status",
        enabled ? "✅ دسترسی حساب شما فعال شد" : "⛔ دسترسی حساب شما موقتاً غیرفعال شد",
        enabled
          ? `${admin.fullName} دسترسی شما را بازگرداند. از این پس می‌توانید وارد شوید.`
          : `دسترسی شما توسط ${admin.fullName} موقتاً قطع شد. برای پیگیری با دفتر خبرگزاری تماس بگیرید.`,
        `user:${target.id}`,
        { force: true },
      )
      void logSec({
        kind: "user_active",
        title: enabled ? "فعال‌سازی دسترسی کاربر" : "غیرفعال‌سازی دسترسی کاربر",
        detail: `${target.fullName} (${target.phone})`,
        actorName: admin.fullName,
        severity: enabled ? "info" : "warn",
      })
      return NextResponse.json({
        ok: true,
        message: enabled ? `دسترسی ${target.fullName} فعال شد.` : `دسترسی ${target.fullName} موقتاً قطع شد.`,
      })
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در مدیریت کاربران" }, { status: 500 })
  }
}

// ویرایش مشخصات کاربر — ادمین کل
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const admin = await activeUser(req)
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const target = await db.user.findUnique({ where: { id: String(body.id ?? "") } })
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })

    const data: Record<string, string | boolean> = {}
    if (typeof body.fullName === "string" && body.fullName.trim().length >= 2) data.fullName = body.fullName.trim().slice(0, 60)
    if (typeof body.phone === "string") {
      const norm = normalizePhone(body.phone)
      if (norm.length !== 10) return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 })
      const dup = await db.user.findFirst({ where: { phone: body.phone, id: { not: target.id } } })
      if (dup) return NextResponse.json({ error: "این شماره قبلاً برای کاربر دیگری ثبت شده" }, { status: 409 })
      data.phone = body.phone
    }
    if (typeof body.district === "string") data.district = body.district
    if (typeof body.base === "string") data.base = body.base.slice(0, 60)
    if (typeof body.education === "string") data.education = body.education
    if (typeof body.age === "string") data.age = body.age.slice(0, 3)
    await db.user.update({ where: { id: target.id }, data })
    await notifyUser(target.id, "user_status", "📋 مشخصات حساب شما به‌روزرسانی شد", `${admin.fullName} اطلاعات حساب شما را ویرایش کرد.`, `user:${target.id}`, { force: true })
    return NextResponse.json({ ok: true, message: `مشخصات ${target.fullName} به‌روزرسانی شد.` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در ویرایش کاربر" }, { status: 500 })
  }
}

// حذف کامل کاربر — ادمین کل؛ همه ردپاها (خبر، پیام تالار، امتیاز، اعلان…) پاک می‌شود
export async function DELETE(req: NextRequest) {
  try {
    const admin = await activeUser(req)
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 })
    }
    const id = req.nextUrl.searchParams.get("id") ?? ""
    const target = await db.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
    if (target.id === admin.id) return NextResponse.json({ error: "حذف حساب خودتان ممکن نیست" }, { status: 400 })
    if (isSuperAdminPhone(target.phone)) {
      return NextResponse.json({ error: "حساب ادمین کل سامانه محافظت‌شده است و قابل حذف نیست" }, { status: 403 })
    }

    const newsIds = await db.newsItem.findMany({ where: { reporterId: target.id }, select: { id: true } })
    await db.$transaction([
      // اخبار و ردپای چرخهٔ بررسی (events با onDelete: Cascade خودکار پاک می‌شود)
      db.newsItem.deleteMany({ where: { reporterId: target.id } }),
      db.draft.deleteMany({ where: { userId: target.id } }),
      db.notification.deleteMany({ where: { userId: target.id } }),
      db.pointsLog.deleteMany({ where: { userId: target.id } }),
      db.userBadge.deleteMany({ where: { userId: target.id } }),
      db.challengeParticipation.deleteMany({ where: { userId: target.id } }),
      db.trainingProgress.deleteMany({ where: { userId: target.id } }),
      // تالار گفتگو: واکنش‌ها، پیام‌ها، نظرسنجی‌ها و تاپیک‌های خودش
      db.forumReaction.deleteMany({ where: { userId: target.id } }),
      db.forumMessage.deleteMany({ where: { userId: target.id } }),
      db.forumPoll.deleteMany({ where: { createdBy: target.id } }),
      db.forumTopic.deleteMany({ where: { createdBy: target.id } }),
      db.forumWeeklyQuestion.deleteMany({ where: { createdBy: target.id } }),
      db.notifSetting.deleteMany({ where: { userId: target.id } }),
      db.user.delete({ where: { id: target.id } }),
    ])
    return NextResponse.json({
      ok: true,
      message: `${target.fullName} و همهٔ ردپاهای حسابش (از جمله ${newsIds.length} خبر) حذف شد.`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "خطا در حذف کاربر — احتمالاً رکورد وابسته باقی مانده" }, { status: 500 })
  }
}
