// دامنه اپلیکیشن — معادل catalog.py و scoring.py ربات بله
export const LEVELS: { key: string; title: string; min: number; emoji: string }[] = [
  { key: "rookie", title: "تازه‌کار", min: 0, emoji: "🌱" },
  { key: "follower", title: "پیگیر", min: 60, emoji: "📋" },
  { key: "active", title: "فعال", min: 150, emoji: "⭐" },
  { key: "pro", title: "حرفه‌ای", min: 300, emoji: "🏆" },
  { key: "expert", title: "خبره", min: 500, emoji: "💎" },
]

export function levelFor(points: number) {
  let chosen = LEVELS[0]
  for (const lv of LEVELS) if (points >= lv.min) chosen = lv
  return chosen
}

export function levelIndex(key: string) {
  const i = LEVELS.findIndex((l) => l.key === key)
  return i < 0 ? 0 : i
}

export function nextLevel(key: string) {
  const i = levelIndex(key)
  return i + 1 < LEVELS.length ? LEVELS[i + 1] : null
}

export const BADGES: Record<string, { emoji: string; title: string; desc: string }> = {
  first_news: { emoji: "🌟", title: "اولین خبر", desc: "اولین خبر تاییدشده" },
  prolific: { emoji: "📰", title: "پرکار", desc: "۵۰ خبر تاییدشده" },
  quality: { emoji: "✅", title: "با کیفیت", desc: "نرخ تایید ۸۵٪ با حداقل ۱۰ خبر" },
  streak7: { emoji: "⚡", title: "شکست‌ناپذیر", desc: "۷ روز متوالی فعالیت" },
  professional: { emoji: "🏆", title: "حرفه‌ای", desc: "رسیدن به سطح حرفه‌ای" },
  champion: { emoji: "🥇", title: "قهرمان چالش", desc: "قهرمانی در یک چالش" },
}

// ── نشان‌های تالار گفتگو (محاسباتی — از روی فعالیت واقعی) ──
export const FORUM_BADGES: Record<string, { emoji: string; title: string; desc: string }> = {
  star_week: { emoji: "🌟", title: "ستاره هفته", desc: "صدرنشین تخته افتخار این هفته" },
  hot_chat: { emoji: "🔥", title: "گفتگوی داغ", desc: "۱۰ واکنش دریافتی روی پیام‌ها" },
  talkative: { emoji: "💬", title: "پرگفتگو", desc: "۲۰ پیام در تالار" },
  helper: { emoji: "🤝", title: "پاسخگوی نمونه", desc: "۱۰ پاسخ به هم‌تیمی‌ها" },
  starter: { emoji: "🚀", title: "راه‌انداز", desc: "۳ تاپیک جدید" },
}

// امتیازهای تالار گفتگو — هم به امتیاز کل و هم به امتیاز تالار اضافه می‌شود
export const FORUM_POINTS = {
  MESSAGE: 2, // هر پیام
  TOPIC: 5, // هر تاپیک جدید
  REACTION_RECEIVED: 1, // هر واکنشی که پیام شما می‌گیرد
}

export const EDUCATION_LEVEL_LABELS: { key: string; label: string }[] = [
  { key: "under_diploma", label: "زیر دیپلم" },
  { key: "diploma", label: "دیپلم" },
  { key: "associate", label: "کاردانی" },
  { key: "bachelor", label: "کارشناسی" },
  { key: "master", label: "کارشناسی ارشد" },
  { key: "phd", label: "دکتری" },
]

export const EDUCATION_LABELS: Record<string, string> = Object.fromEntries(
  EDUCATION_LEVEL_LABELS.map((e) => [e.key, e.label]),
)

export const NEWS_CATEGORIES: { code: string; label: string }[] = [
  { code: "politics", label: "سیاسی" },
  { code: "economy", label: "اقتصاد" },
  { code: "social", label: "اجتماعی" },
  { code: "culture", label: "فرهنگ" },
  { code: "sport", label: "ورزش" },
  { code: "science", label: "علم و فناوری" },
  { code: "local", label: "محلی" },
  { code: "breaking", label: "خبر فوری" },
]

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  NEWS_CATEGORIES.map((c) => [c.code, c.label]),
)
CATEGORY_LABELS["none"] = "بدون دسته‌بندی"

export const CATEGORY_IMAGES: Record<string, string> = {
  politics: "/img/cat-politics.png",
  economy: "/img/cat-economy.png",
  social: "/img/cat-social.png",
  culture: "/img/cat-culture.png",
  sport: "/img/cat-sport.png",
  science: "/img/cat-science.png",
  local: "/img/cat-local.png",
  breaking: "/img/cat-breaking.png",
}

export const DISTRICT_LABELS: Record<string, string> = {
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`b${i + 1}`, `حوزه برادران ${toFa(i + 1)}`])),
  ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`s${i + 1}`, `حوزه خواهران ${toFa(i + 1)}`])),
}

export const BASE_LISTS: Record<string, string[]> = Object.fromEntries(
  [...Array.from({ length: 6 }, (_, i) => `b${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `s${i + 1}`)].map((d) => [
    d,
    d.startsWith("b")
      ? ["پایگاه امام علی (ع)", "پایگاه حضرت زهرا (س)", "پایگاه شهید بهشتی", "پایگاه شهید چمران", "پایگاه امام حسین (ع)", "پایگاه شهید رجایی", "پایگاه ولی‌عصر (عج)", "پایگاه شهدای گمنام"]
      : ["پایگاه کوثر", "پایگاه حضرت معصومه (س)", "پایگاه شهیده بنت‌الهدی", "پایگاه فاطمیه", "پایگاه الزهرا (س)", "پایگاه شهدای زن", "پایگاه رقیه (س)", "پایگاه حضرت خدیجه (س)"],
  ]),
)

export const REVIEW_STAGES: { key: string; label: string }[] = [
  { key: "district", label: "مدیر حوزه" },
  { key: "specialist", label: "کارشناس" },
  { key: "admin", label: "ادمین کل" },
]

export function reviewStageLabel(key: string) {
  return REVIEW_STAGES.find((s) => s.key === key)?.label ?? key
}

export function nextReviewStage(key: string): string {
  const order = REVIEW_STAGES.map((s) => s.key)
  const i = order.indexOf(key)
  if (i < 0 || i + 1 >= order.length) return ""
  return order[i + 1]
}

// برچسب و آیکون رویدادهای چرخه خبر (جدول NewsEvent) — پیش‌نمایش آنلاین مراحل
export const NEWS_EVENT_META: Record<string, { label: string; emoji: string }> = {
  submitted: { label: "خبر وارد چرخه شد", emoji: "📰" },
  advanced: { label: "تایید و ارجاع به مرحله بعد", emoji: "✅" },
  final_approved: { label: "تایید نهایی و انتشار", emoji: "🎉" },
  rejected: { label: "رد شد", emoji: "❌" },
  resubmitted: { label: "ویرایش و ارسال مجدد", emoji: "🔄" },
  edited: { label: "ویرایش متن توسط ارزیاب", emoji: "✏️" },
  sent_eitaa: { label: "ارسال به ایتا", emoji: "📨" },
  praised: { label: "تقدیر خبرنگار در کانال ایتا", emoji: "🏅" },
}

// نقش‌های ارزیاب به‌ترتیب چرخه برای نمایش مراحل
export const STAGE_ROLE_ICON: Record<string, string> = {
  district: "🏛️",
  specialist: "🔍",
  admin: "👑",
}

// نقش کاربر در کدام مرحله بررسی نقش دارد
export const ROLE_STAGE: Record<string, string> = {
  district_manager: "district",
  specialist: "specialist",
  admin: "admin",
}

export const ROLE_LABELS: Record<string, string> = {
  reporter: "خبرنگار",
  district_manager: "مدیر حوزه",
  specialist: "کارشناس خبر",
  admin: "ادمین کل",
}

// ── ادمین کل سامانه ──
// منطق «شمارهٔ محافظت‌شده» عمداً از این ماژول حذف شد تا شماره در باندل
// کلاینت لو نرود؛ به src/lib/server/superadmin.ts منتقل شد (فقط سمت سرور).
// نرمال‌سازی شماره (ارقام فارسی→انگلیسی، حذف غیررقم‌ها، ۱۰ رقم آخر)
export function normalizePhone(raw: unknown): string {
  const fa = String(raw ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  const digits = fa.replace(/\D/g, "")
  return digits.length > 10 ? digits.slice(-10) : digits
}

// اعمال حوزه‌ها/پایگاه‌های سازمان (از دیتابیس) روی نقشه‌های این ماژول.
// چون همهٔ کامپوننت‌ها همان DISTRICT_LABELS/BASE_LISTS را می‌خوانند،
// با بازنویسی runtime مقادیر، کل اپ بدون تغییر کامپوننت به‌روز می‌شود.
export function applyOrgUnits(units: { key: string; label: string; bases: string[] }[]) {
  for (const k of Object.keys(DISTRICT_LABELS)) {
    if (k !== "none") delete DISTRICT_LABELS[k]
  }
  for (const k of Object.keys(BASE_LISTS)) delete BASE_LISTS[k]
  for (const d of units) {
    if (!d?.key || !d?.label) continue
    DISTRICT_LABELS[d.key] = d.label
    BASE_LISTS[d.key] = Array.isArray(d.bases) ? d.bases.filter((b) => typeof b === "string" && b.trim()) : []
  }
}

export const REJECT_REASONS: { key: string; label: string; hint: string }[] = [
  { key: "insufficient", label: "اطلاعات ناکافی", hint: "لطفاً جزئیات بیشتری اضافه کنید." },
  { key: "style", label: "عدم رعایت اصول خبرنویسی", hint: "لطفاً خبر را مطابق اصول خبرنویسی بازنویسی کنید." },
  { key: "duplicate", label: "تداخل خبری با خبر دیگر", hint: "این خبر قبلاً منتشر شده است." },
  { key: "irrelevant", label: "موضوع نامرتبط", hint: "خبر باید مرتبط با حوزهٔ فعالیت شما باشد." },
]

export const USER_REJECT_TITLES: Record<string, string> = {
  incomplete: "اطلاعات ناقص",
  wrong_base: "حوزه/پایگاه نامعتبر",
  duplicate: "درخواست تکراری",
  other: "دلیل دلخواه",
  expired: "انقضای درخواست",
}

// امتیازها (config.py)
export const POINTS = {
  SUBMIT: 10,
  APPROVE: 15,
  FIRST_NEWS: 20,
  STREAK7: 30,
  QUALITY: 25,
  PROLIFIC: 50,
  PROFESSIONAL: 40,
  CHALLENGE_WIN: 60,
  // جایزهٔ مقام‌های اول تا سوم چالش (مطابق متن راهنمای فرم چالش: «مثلاً ۳۰ امتیاز»)
  CHALLENGE_PRIZES: [30, 20, 10],
}

// ── مهلت‌ها و آستانه‌های نگهداری دوره‌ای (تنظیمات ربات) ──
// انقضای درخواست‌های عضویت بی‌پاسخ
export const PENDING_EXPIRE_HOURS = 72
// یادآوری به ادمین دربارهٔ درخواست‌های معطل
export const PENDING_NUDGE_HOURS = 24
// یادآوری مهلت چالش (چند ساعت مانده به پایان)
export const REMINDER_WINDOW_HOURS = 3
// سقوط سطح پس از چند روز بی‌فعالیت
export const DEMOTE_INACTIVITY_DAYS = 7

export function toFa(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
}

export function faNum(n: number): string {
  return toFa(n.toLocaleString("en-US"))
}

export function statusLabel(s: string): string {
  return s === "approved" ? "تایید شده" : s === "rejected" ? "رد شده" : "در انتظار بررسی"
}
