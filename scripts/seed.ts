// سید دیتابیس — داده نمونه معادل سید ربات بله (admin, specialist, district_manager, خبرنگارها)
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const ago = (days: number, hours = 0) => new Date(now - days * DAY - hours * 3600000)
const ahead = (days: number) => new Date(now + days * DAY)

async function main() {
  await db.pointsLog.deleteMany()
  await db.userBadge.deleteMany()
  await db.challengeParticipation.deleteMany()
  await db.challenge.deleteMany()
  await db.draft.deleteMany()
  await db.notifSetting.deleteMany()
  await db.newsItem.deleteMany()
  await db.user.deleteMany()

  // ---------- کاربران ----------
  const users = [
    { id: "u_emon", username: "emon", fullName: "امون رضایی", role: "reporter", district: "b1", base: "پایگاه امام علی (ع)", phone: "0912-555-0101", age: "26", education: "bachelor", points: 3240, levelKey: "expert", currentStreak: 5, bestStreak: 12 },
    { id: "u_reza", username: "reza", fullName: "رضا توکلی", role: "reporter", district: "b1", base: "پایگاه شهید بهشتی", phone: "0912-555-0102", age: "31", education: "master", points: 3410, levelKey: "expert", currentStreak: 8, bestStreak: 15 },
    { id: "u_sara", username: "sara", fullName: "سارا احمدی", role: "reporter", district: "s2", base: "پایگاه کوثر", phone: "0912-555-0103", age: "24", education: "bachelor", points: 2410, levelKey: "pro", currentStreak: 3, bestStreak: 9 },
    { id: "u_mina", username: "mina", fullName: "مینا کریمی", role: "reporter", district: "b3", base: "پایگاه شهید چمران", phone: "0912-555-0104", age: "29", education: "bachelor", points: 1980, levelKey: "active", currentStreak: 2, bestStreak: 7 },
    { id: "u_hassan", username: "hassan", fullName: "حسن نوری", role: "reporter", district: "b2", base: "پایگاه امام حسین (ع)", phone: "0912-555-0105", age: "35", education: "diploma", points: 1560, levelKey: "active", currentStreak: 1, bestStreak: 6 },
    { id: "u_zahra", username: "zahra", fullName: "زهرا موسوی", role: "reporter", district: "s1", base: "پایگاه حضرت معصومه (س)", phone: "0912-555-0106", age: "27", education: "associate", points: 1240, levelKey: "active", currentStreak: 4, bestStreak: 8 },
    { id: "u_ali", username: "ali", fullName: "علی رجبی", role: "reporter", district: "b4", base: "پایگاه شهید رجایی", phone: "0912-555-0107", age: "22", education: "diploma", points: 890, levelKey: "follower", currentStreak: 0, bestStreak: 4 },
    { id: "u_fateme", username: "fateme", fullName: "فاطمه حسینی", role: "reporter", district: "s3", base: "پایگاه فاطمیه", phone: "0912-555-0108", age: "33", education: "phd", points: 640, levelKey: "follower", currentStreak: 2, bestStreak: 5 },
    { id: "u_dm", username: "dm_mehdi", fullName: "مهدی محمدی", role: "district_manager", district: "b1", base: "پایگاه امام علی (ع)", phone: "0912-555-0201", points: 0, levelKey: "rookie", currentStreak: 0, bestStreak: 0 },
    { id: "u_spec", username: "spec_negar", fullName: "نگار سلطانی", role: "specialist", district: "b1", base: "", phone: "0912-555-0202", points: 0, levelKey: "rookie", currentStreak: 0, bestStreak: 0 },
    { id: "u_admin", username: "admin_hamid", fullName: "حمید عباسی", role: "admin", district: "b1", base: "", phone: "0912-555-0203", points: 0, levelKey: "rookie", currentStreak: 0, bestStreak: 0 },
  ]
  for (const u of users) {
    await db.user.create({
      data: { ...u, lastActivityAt: ago(0, 2), createdAt: ago(60), notifSetting: { create: {} } },
    })
  }

  // ---------- اخبار (امون: ۱۲ خبر این هفته مثل نمونه UI) ----------
  type N = {
    reporterId: string; district: string; category: string; title: string; content: string
    status: string; reviewStage: string; durationMin: number; createdAt: Date
    rejectReason?: string; rejectNote?: string; code: string
  }
  const news: N[] = [
    { code: "N-1041", reporterId: "u_emon", district: "b1", category: "breaking", title: "قطعی آب در بخشی از محله‌ها؛ اقدامات اضطراری آغاز شد", content: "پیامد اختلال در خط اصلی انتقال آب، ساعاتی از بامداد امروز ساکنان بخشی از محله‌های شمالی با قطعی آب مواجه شدند. مدیرعامل شرکت آب و فاضلاب با اعلام آغاز اقدامات اضطراری گفت: تیم‌های تعمیراتی وارد شده‌اند و پیش از ساعت ۱۸ امروز خط ترمیم و آب‌رسانی از سر گرفته می‌شود. تانکرهای سیار نیز در سه نقطه محله مستقر شده‌اند.", status: "approved", reviewStage: "", durationMin: 35, createdAt: ago(0, 0.7) },
    { code: "N-1040", reporterId: "u_emon", district: "b1", category: "sport", title: "دیدار تیم‌های جوانان؛ صعود جوانان پایگاه به فینال استانی", content: "در نیمه‌نهایی مسابقات فوتسال جوانان، تیم پایگاه امام علی (ع) با نتیجه ۳ بر ۱ حریف خود را شکست داد و به فینال استانی رسید. سرمربی تیم عملکرد دفاعی بازیکنان را کلید صعود دانست و از هواداران خواست در فینال روز جمعه حضور پیدا کنند.", status: "approved", reviewStage: "", durationMin: 40, createdAt: ago(0, 1.3) },
    { code: "N-1039", reporterId: "u_emon", district: "b1", category: "science", title: "راه‌اندازی آزمایشگاه هوش مصنوعی در دانشگاه صنعتی منطقه", content: "آزمایشگاه پژوهشی هوش مصنوعی با حضور معاون پژوهشی دانشگاه افتتاح شد. این آزمایشگاه با هدف توسعه مدل‌های زبانی فارسی و پردازش تصویر راه‌اندازی شده و ظرفیت پذیرش ۳۰ پژوهشگر جوان را دارد. طبق برنامه، نخستین کارگاه آموزشی آن هفته آینده برگزار می‌شود.", status: "pending", reviewStage: "district", durationMin: 50, createdAt: ago(0, 0.4) },
    { code: "N-1038", reporterId: "u_emon", district: "b1", category: "politics", title: "نشست خبری فرماندار با اصحاب رسانه برگزار شد", content: "فرماندار شهرستان در نشستی با اصحاب رسانه از تصویب سه طرح عمرانی جدید در حوزه حمل‌ونقل خبر داد. وی تاکید کرد روند اجرای طرح‌ها به‌صورت ماهانه به خبرنگاران اعلام خواهد شد و دسترسی به آمار رسمی برای رسانه‌ها تسهیل می‌شود.", status: "approved", reviewStage: "", durationMin: 45, createdAt: ago(1, 3) },
    { code: "N-1037", reporterId: "u_emon", district: "b1", category: "social", title: "اجرای طرح ترافیکی تعطیلات در محدوده مرکزی شهر", content: "از امروز طرح ویژه مدیریت ترافیک تعطیلات در محدوده مرکزی اجرا می‌شود. بر اساس ابلاغیه پلیس راهور، ورود خودروهای غیربومی به محدوده از ساعت ۱۰ تا ۲۲ ممنوع است و پارک‌ینگ‌های حاشیه‌ای با سرویس رایگان رفت‌وبرگشت فعال شده‌اند.", status: "pending", reviewStage: "specialist", durationMin: 35, createdAt: ago(1, 5) },
    { code: "N-1036", reporterId: "u_emon", district: "b1", category: "local", title: "گزارش میدانی از بازار روز هفتگی محله", content: "بازار روز هفتگی این هفته با حضور ۱۲۰ غرفه‌دار برپا شد. خریداران از کاهش ۱۰ درصدی قیمت میوه نسبت به هفته گذشته خبر دادند. بازرسان بهداشت نیز از سه غرفه تذکر گرفته‌اند. این بازار هر پنجشنبه از ساعت ۷ صبح برپا می‌شود.", status: "pending", reviewStage: "admin", durationMin: 60, createdAt: ago(2, 2) },
    { code: "N-1035", reporterId: "u_emon", district: "b1", category: "economy", title: "رشد ۱۲ درصدی ثبت کسب‌وکارهای محلی در نیمه نخست سال", content: "بر اساس آمار ثبت شرکت‌ها، تعداد کسب‌وکارهای تازه‌تاسیس محله در نیمه نخست امسال ۱۲ درصد نسبت به مدت مشابه سال قبل رشد کرده است. بخش عمده این رشد در حوزه خدمات فناوری و غذای خانگی بوده است. کارشناسان از ادامه روند با حمایت تسهیلات خرد خبر می‌دهند.", status: "approved", reviewStage: "", durationMin: 50, createdAt: ago(3, 4) },
    { code: "N-1034", reporterId: "u_emon", district: "b1", category: "culture", title: "برنامه‌های هفته کتاب در فرهنگسرای منطقه اعلام شد", content: "دبیر هفته کتاب از برگزاری ۱۴ نشست نقد کتاب، دو کارگاه داستان‌نویسی نوجوان و نمایشگاه انتشارات با تخفیف ۴۰ درصدی خبر داد. برنامه‌ها از روز شنبه در فرهنگسرای منطقه آغاز می‌شود و ورود برای عموم آزاد است.", status: "rejected", reviewStage: "", durationMin: 30, createdAt: ago(3, 8), rejectReason: "style", rejectNote: "متن خبری فاقد لید استاندارد است؛ پاراگراف نخست باید مهم‌ترین بخش خبر باشد." },
    { code: "N-1033", reporterId: "u_emon", district: "b1", category: "sport", title: "مسابقات فوتسال جام محله با قهرمان تیم شهید چمران پایان یافت", content: "در فینال مسابقات فوتسال جام محله، تیم شهید چمران در ضربات پنالتی به قهرمانی رسید. دیدار پایانی با استقبال پرشمار اهالی همراه بود و در پایان، تیم‌های برگزیده همراه با بهترین گلزن تورنمنت معرفی شدند.", status: "approved", reviewStage: "", durationMin: 45, createdAt: ago(4, 5) },
    { code: "N-1032", reporterId: "u_emon", district: "b1", category: "culture", title: "کارگاه آموزش خبرنویسی با حضور ۴۰ خبرنگار جوان برگزار شد", content: "کارگاه دوهفته‌ای خبرنویسی با محوریت اصول لیدنویسی و مصاحبه حرفه‌ای به کار خود پایان داد. مدرسان کارگاه بر تمرین میدانی و رعایت اصل بی‌طرفی تاکید کردند و به شرکت‌کنندگان گواهی پایان دوره اعطا شد.", status: "approved", reviewStage: "", durationMin: 55, createdAt: ago(5, 3) },
    { code: "N-1031", reporterId: "u_emon", district: "b1", category: "local", title: "افتتاح فاز دوم بوستان محله پس از دو سال انتظار", content: "فاز دوم بوستان محله با فضای بازی کودکان و مسیر دویدن، پس از دو سال افتتاح شد. شهرداری اجرای فاز سوم را با اعتبار مصوب شورا برای سال آینده برنامه‌ریزی کرده است. اهالی خواستار تسریع در نصب روشنایی مسیر پیاده‌روی هستند.", status: "approved", reviewStage: "", durationMin: 40, createdAt: ago(6, 2) },
    { code: "N-1030", reporterId: "u_emon", district: "b1", category: "breaking", title: "آتش‌سوزی در انبار ضایعات مهار شد", content: "آتش‌سوزی عصر دیروز در انبار ضایعات حاشیه محله، پیش از رسیدن به مخازن سوخت مجاور مهار شد. هیچ گزارشی از مصدوم اعلام نشده است. به گفته آتش‌نشانی، امداد در کمتر از ۲۰ دقیقه به محل رسید و علت اولیه اتصالی برق اعلام شده است.", status: "approved", reviewStage: "", durationMin: 35, createdAt: ago(6, 20) },
    // اخبار قدیمی‌تر امون
    { code: "N-0995", reporterId: "u_emon", district: "b1", category: "social", title: "افتتاح کلاس‌های تقویتی مددجویان کمیته امداد", content: "کلاس‌های تقویتی دروس دانش‌آموزان مددجو با حضور ۶۰ دانش‌آموز آغاز به کار کرد.", status: "approved", reviewStage: "", durationMin: 30, createdAt: ago(12) },
    { code: "N-0990", reporterId: "u_emon", district: "b1", category: "politics", title: "دیدار اعضای شورای محله با خبرنگاران حوزه", content: "اعضای شورای محله در نشستی صمیمی روند پیگیری مصوبات را برای خبرنگاران تشریح کردند.", status: "approved", reviewStage: "", durationMin: 25, createdAt: ago(15) },
    { code: "N-0985", reporterId: "u_emon", district: "b1", category: "economy", title: "بازگشایی واحدهای تعطیل بازارچه قدیمی", content: "پس از بازسازی، شش واحد تعطیل بازارچه قدیمی دوباره بازگشایی شد.", status: "approved", reviewStage: "", durationMin: 28, createdAt: ago(18) },
    // اخبار دیگران برای صف بررسی
    { code: "N-1042", reporterId: "u_reza", district: "b1", category: "politics", title: "کلنگ‌زنی پروژه کتابخانه عمومی جدید در حوزه برادران یک", content: "پروژه کتابخانه عمومی با زیربنای ۱۲۰۰ مترمربع و سالن مطالعه ۲۰۰ نفره امروز کلنگ‌زنی شد. اعتبار پیش‌بینی‌شده ۴۸ میلیارد ریال است و عملیات اجرایی طی ۱۸ ماه به پایان می‌رسد. مسئولان وعده داده‌اند فضای ویژه کودک و بخش شنیداری نیز در نظر گرفته شود.", status: "pending", reviewStage: "district", durationMin: 42, createdAt: ago(0, 4) },
    { code: "N-1043", reporterId: "u_sara", district: "s2", category: "social", title: "راه‌اندازی مرکز مشاوره خانواده در حوزه خواهران دو", content: "مرکز مشاوره خانواده با حضور هفت مشاور رسمی روزهای زوج پذیرش می‌کند. خدمات شامل مشاوره قبل از ازدواج، خانواده‌درمانی و کارگاه فرزندپروری است و ۳۰ درصد ظرفیت به صورت رایگان اختصاص یافته است.", status: "pending", reviewStage: "district", durationMin: 38, createdAt: ago(0, 5) },
    { code: "N-1044", reporterId: "u_mina", district: "b3", category: "local", title: "نوسازی معابر محله شهید چمران به پایان رسید", content: "عملیات آسفالت و جدول‌گذاری دو خیابان اصلی محله پس از چهار ماه به پایان رسید. اهالی از حل مشکل آبگرفتگی باران خبر می‌دهند و شهرداری از آغاز فاز دوم در هفته آینده می‌گوید.", status: "pending", reviewStage: "district", durationMin: 33, createdAt: ago(0, 6) },
    { code: "N-1045", reporterId: "u_reza", district: "b1", category: "economy", title: "گردهمایی کسب‌وکارهای خرد حوزه برادران برگزار شد", content: "در گردهمایی کسب‌وکارهای خرد، سامانه اعتبارسنجی جدید معرفی شد که تسهیلات تا ۲۰۰ میلیون ریال بدون ضامن ارائه می‌کند. ثبت‌نام از طریق دفاتر پیشخوان محله انجام می‌شود.", status: "pending", reviewStage: "specialist", durationMin: 44, createdAt: ago(1, 2) },
    { code: "N-1046", reporterId: "u_zahra", district: "s1", category: "culture", title: "جشنواره سرود مدارس خواهران به میزبانی پایگاه کوثر", content: "چهاردهمین جشنواره سرود مدارس با حضور ۱۸ گروه از ۹ مدرسه برگزار شد. داوران بر محتوای انقلابی و کیفیت اجرای گروهی تاکید کردند و سه گروه برتر به مرحله استانی اعزام می‌شوند.", status: "pending", reviewStage: "specialist", durationMin: 47, createdAt: ago(1, 4) },
    { code: "N-1047", reporterId: "u_hassan", district: "b2", category: "sport", title: "افتتاح زمین ورزشی خاک‌پوش جدید در حوزه برادران دو", content: "زمین ورزشی سرپوشیده با کف‌پوش جدید و روشنایی LED آماده بهره‌برداری شد. نوبت‌بندی تمرین از طریق کانال پایگاه اعلام می‌شود و اولویت با تیم‌های محله است.", status: "pending", reviewStage: "admin", durationMin: 36, createdAt: ago(2, 3) },
    { code: "N-1048", reporterId: "u_fateme", district: "s3", category: "science", title: "دبیرستان دخترانه فاطمیه رتبه سوم المپیاد زیست را کسب کرد", content: "دانش‌آموز دبیرستان فاطمیه در المپیاد زیست‌شناسی کشوری رتبه سوم را کسب کرد. این موفقیت با پشتیبانی کلاس‌های المپیاد پایگاه محقق شده است.", status: "pending", reviewStage: "admin", durationMin: 29, createdAt: ago(2, 5) },
  ]
  for (const n of news) {
    await db.newsItem.create({ data: { ...n, mediaType: n.category === "sport" || n.category === "breaking" ? "photo" : "none", updatedAt: n.createdAt } })
  }

  // ---------- چالش‌ها ----------
  const c1 = await db.challenge.create({
    data: {
      code: "CH-07", title: "پوشش مراسم اربعین حسینی", description: "تهیه و ارسال حداقل ۳ خبر از برنامه‌های اربعین در محدوده فعالیت خود (موزه، دسته‌ها، خدمات‌رسانی).", deadlineAt: ahead(3), endAt: ahead(4), reward: "+۶۰ امتیاز و نشان قهرمان چالش", status: "active", createdBy: "u_admin", createdAt: ago(4),
    },
  })
  const c2 = await db.challenge.create({
    data: {
      code: "CH-08", title: "چالش خبر فوری محلی", description: "اولین خبرنگاری که دو خبر فوری تاییدشده از حوادث محلی ارسال کند، برنده این چالش است.", deadlineAt: ahead(5), endAt: ahead(6), reward: "+۶۰ امتیاز", status: "active", createdBy: "u_admin", createdAt: ago(2),
    },
  })
  const c3 = await db.challenge.create({
    data: {
      code: "CH-06", title: "چالش اخبار ورزشی هفته", description: "بیشترین خبر تاییدشده در دسته ورزش طی یک هفته.", deadlineAt: ago(1), endAt: ago(0, 12), reward: "+۶۰ امتیاز", status: "finished", createdBy: "u_admin", createdAt: ago(8), finishedAt: ago(0, 12),
    },
  })
  await db.challengeParticipation.createMany({
    data: [
      { challengeId: c1.id, userId: "u_emon", count: 2, joinedAt: ago(4) },
      { challengeId: c1.id, userId: "u_reza", count: 1, joinedAt: ago(3) },
      { challengeId: c1.id, userId: "u_sara", count: 1, joinedAt: ago(2) },
      { challengeId: c2.id, userId: "u_emon", count: 1, joinedAt: ago(2) },
      { challengeId: c2.id, userId: "u_hassan", count: 0, joinedAt: ago(1) },
      { challengeId: c3.id, userId: "u_emon", count: 4, joinedAt: ago(8) },
      { challengeId: c3.id, userId: "u_reza", count: 2, joinedAt: ago(8) },
      { challengeId: c3.id, userId: "u_mina", count: 1, joinedAt: ago(7) },
    ],
  })

  // ---------- نشان‌ها ----------
  const badgeSeed: [string, string, number][] = [
    ["u_emon", "first_news", 58], ["u_emon", "quality", 40], ["u_emon", "streak7", 30], ["u_emon", "professional", 25], ["u_emon", "champion", 1],
    ["u_reza", "first_news", 55], ["u_reza", "streak7", 20], ["u_reza", "prolific", 10],
    ["u_sara", "first_news", 50], ["u_sara", "quality", 22],
    ["u_mina", "first_news", 45],
    ["u_hassan", "first_news", 44],
    ["u_zahra", "first_news", 43],
  ]
  for (const [uid, key, days] of badgeSeed) {
    await db.userBadge.create({ data: { userId: uid, badgeKey: key, awardedAt: ago(days) } })
  }

  // ---------- لاگ امتیاز (پخش در ۳۰ روز برای نمودار روز/هفته/ماه) ----------
  type P = { userId: string; amount: number; reason: string; ref: string; createdAt: Date }
  const logs: P[] = []
  const reasons = [
    ["submit", "ارسال خبر", 10], ["approve", "تایید خبر", 15], ["badge:first_news", "نشان اولین خبر", 20],
    ["badge:streak7", "نشان شکست‌ناپذیر", 30], ["badge:quality", "نشان باکیفیت", 25], ["challenge:CH-06", "قهرمانی چالش ورزشی", 60],
  ] as const
  // امون: امروز ۴۵ امتیاز، این هفته ~۳۲۰
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(0, 1.3) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(0, 0.7) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(0, 0.7) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(0, 0.4) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(1, 3) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(1, 5) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(2, 3) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(2, 1) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(3, 4) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(3, 4) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(4, 5) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(5, 3) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(5, 3) })
  logs.push({ userId: "u_emon", amount: 10, reason: "ارسال خبر", ref: "submit", createdAt: ago(6, 20) })
  logs.push({ userId: "u_emon", amount: 15, reason: "تایید خبر", ref: "approve", createdAt: ago(6, 2) })
  logs.push({ userId: "u_emon", amount: 60, reason: "قهرمانی چالش ورزشی", ref: "challenge:CH-06", createdAt: ago(1, 10) })
  logs.push({ userId: "u_emon", amount: 30, reason: "نشان شکست‌ناپذیر", ref: "badge:streak7", createdAt: ago(22) })
  logs.push({ userId: "u_emon", amount: 25, reason: "نشان باکیفیت", ref: "badge:quality", createdAt: ago(40) })
  // بقیه کاربران چند رکورد
  for (const uid of ["u_reza", "u_sara", "u_mina", "u_hassan", "u_zahra", "u_ali", "u_fateme"]) {
    for (let d = 0; d < 8; d++) {
      const r = reasons[Math.floor(Math.random() * 2)]
      logs.push({ userId: uid, amount: r[2], reason: r[1], ref: r[0], createdAt: ago(d, Math.floor(Math.random() * 12)) })
    }
  }
  await db.pointsLog.createMany({ data: logs })

  // ---------- پیش‌نویس ----------
  await db.draft.create({
    data: { userId: "u_emon", category: "local", title: "گزارش از طرح کشت دوم کشاورزان حاشیه شهر", content: "کشاورزان حاشیه شهر امسال برای نخستین بار کشت دوم کلزا را آغاز کرده‌اند...", savedAt: ago(0, 3) },
  })

  const count = await db.user.count()
  console.log(`Seeded: ${count} users, ${news.length} news, 3 challenges, ${logs.length} point logs`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => db.$disconnect())
