import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

// رمز دوم (PIN) اختیاری حساب — هش امن با scrypt + salt تصادفی
// قالب ذخیره در User.pinHash: "<salt-hex>:<hash-hex>"
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(pin, salt, 32).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  try {
    const calc = scryptSync(pin, salt, 32)
    return timingSafeEqual(calc, Buffer.from(hash, "hex"))
  } catch {
    return false
  }
}

// PIN معتبر: ۴ تا ۶ رقم
export function isValidPin(p: unknown): boolean {
  return /^\d{4,6}$/.test(String(p ?? ""))
}
