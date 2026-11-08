import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { User } from "@prisma/client"

// نشست مبتنی بر کوکی HttpOnly — منبع حقیقتِ هویت کاربر.
//
// چرا: قبلاً هر اندپوینت، userId را از بدنه/کوئری کلاینت می‌گرفت.
// یعنی هر کسی می‌توانست با تغییر یک شناسه، خودش را ادمین کل جا بزند.
// حالا مرورگر/وب‌ویو به‌صورت خودکار کوکی را می‌فرستد و سرور هویت را
// از امضای معتبر توکن می‌خواند؛ کلاینت دیگر هیچ نقشی در تعیین هویت ندارد.

export const SESSION_COOKIE = "bn_session"
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // ۳۰ روز

// کلید امضای نشست. اگر SESSION_SECRET تنظیم نشده باشد یک کلید تصادفی
// در حافظه ساخته می‌شود: نشست‌ها با ری‌استارت سرور باطل می‌شوند، اما
// کسی نمی‌تواند نشست جعلی بسازد (به‌جای یک کلید ثابتِ قابل حدس).
let ephemeralSecret: string | null = null

function secret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim()
  if (fromEnv && fromEnv.length >= 16) return fromEnv
  if (!ephemeralSecret) {
    ephemeralSecret = randomBytes(32).toString("hex")
    console.warn(
      "[session] SESSION_SECRET تنظیم نشده — کلید موقت ساخته شد. " +
        "با هر ری‌استارت سرور همهٔ نشست‌ها باطل می‌شوند. " +
        "برای استقرار دائمی، SESSION_SECRET را در متغیرهای محیطی بگذارید.",
    )
  }
  return ephemeralSecret
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

/** ساخت توکن نشست برای یک کاربر */
export function createSessionToken(userId: string, ttlSeconds: number = SESSION_TTL_SECONDS): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url")
  return `v1.${payload}.${sign(payload)}`
}

/** بررسی صحت توکن — در صورت نامعتبر/منقضی، null برمی‌گرداند */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== "v1") return null
  const [, payload, sig] = parts
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string
      exp?: number
    }
    if (!data?.uid || typeof data.uid !== "string") return null
    if (!data.exp || data.exp * 1000 < Date.now()) return null
    return data.uid
  } catch {
    return null
  }
}

/** گزینه‌های استاندارد کوکی نشست */
export function sessionCookieOptions(req?: NextRequest) {
  // کوکی باید فقط روی HTTPS ارسال شود — ولی سرور فعلی روی HTTP (پورت ۸۱)
  // اجرا می‌شود، پس تصمیم از روی پروتکل واقعی درخواست گرفته می‌شود.
  const proto = req?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? req?.nextUrl.protocol.replace(":", "")
  const isHttps = proto === "https"
  const override = process.env.SESSION_COOKIE_SECURE?.toLowerCase()
  const secure = override === "true" ? true : override === "false" ? false : isHttps
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  }
}

/** ست کردن کوکی نشست روی پاسخ */
export function attachSession(res: NextResponse, userId: string, req?: NextRequest): NextResponse {
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions(req))
  return res
}

/** حذف کوکی نشست (خروج) */
export function clearSession(res: NextResponse, req?: NextRequest): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(req), maxAge: 0 })
  return res
}

/** شناسهٔ کاربر از روی کوکی نشست (بدون بررسی وضعیت حساب) */
export function sessionUserId(req: NextRequest): string | null {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
}

/**
 * کاربر جاری از روی نشست.
 * - نشست نامعتبر → null
 * - حساب غیرفعال/ردشده → null (نشست هست ولی حساب اجازهٔ فعالیت ندارد)
 */
export async function currentUser(req: NextRequest): Promise<User | null> {
  const uid = sessionUserId(req)
  if (!uid) return null
  const user = await db.user.findUnique({ where: { id: uid } })
  if (!user) return null
  return user
}

/** کاربر فعال جاری — یا null اگر نشست معتبر نیست */
export async function activeUser(req: NextRequest): Promise<User | null> {
  const user = await currentUser(req)
  if (!user || user.status !== "active") return null
  return user
}
