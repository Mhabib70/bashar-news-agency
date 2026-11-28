# -*- coding: utf-8 -*-
"""
Seed دیتابیس پیش‌نمایش سندباکس — ساخت حساب ادمین/خبرنگار آزمایشی + محتوای نمونه
تا کاربر بتواند وارد اپ شود و همهٔ بخش‌ها را بررسی کند.
"""
import sqlite3
import json
from datetime import datetime, timedelta, timezone

DB = "/home/z/my-project/db/custom.db"

# فرمت ISO-8601 با Z — تنها فرمتی که Prisma هنگام خواندن SQLite می‌پذیرد

def iso(d=None):
    d = d or datetime.now(timezone.utc)
    if d.tzinfo:
        d = d.astimezone(timezone.utc)
    return d.strftime("%Y-%m-%dT%H:%M:%S.000Z")

ADMIN_PHONE = "09120000000"      # نرمال‌شده در API: 9120000000
REPORTER_PHONE = "09120000001"
ADMIN_PIN = ""                   # بدون رمز دوم — ورود مستقیم
SUPER_PHONE = "09300500977"      # شمارهٔ ادمین کل سامانه (پیش‌فرض superadmin.ts)

con = sqlite3.connect(DB)
cur = con.cursor()

def upsert_user(username, full_name, role, phone, **extra):
    cur.execute("SELECT id FROM User WHERE username=?", (username,))
    row = cur.fetchone()
    fields = dict(
        fullName=full_name, role=role, phone=phone, status="active",
        active=1, district="b1", base="پایگاه بسیج شهید بهشتی رشت",
        age="۳۰", education="کارشناسی", points=120, forumPoints=35,
        levelKey="expert" if role == "admin" else "pro",
        currentStreak=3, bestStreak=9,
        lastSeenAt=iso(),
    )
    fields.update(extra)
    sets = ", ".join(f"{k}=?" for k in fields)
    vals = list(fields.values())
    if row:
        cur.execute(f"UPDATE User SET {sets} WHERE id=?", vals + [row[0]])
        return row[0]
    cur.execute(
        f"INSERT INTO User (id, username, {', '.join(fields.keys())}, createdAt, updatedAt) "
        f"VALUES (?, ?, {', '.join('?'*len(fields))}, ?, ?)",
        [f"cuid_{username}", username] + vals + [iso(), iso()],
    )
    return f"cuid_{username}"

# پاک‌سازی کامل حساب‌ها و اخبار seed قبلی برای اجرای تکراری (قبل از ساخت مجدد)
old = [r[0] for r in cur.execute("SELECT id FROM User WHERE id LIKE 'cuid_%'").fetchall()]
for uid in old:
    cur.execute("DELETE FROM NewsItem WHERE reporterId=?", (uid,))
    cur.execute("DELETE FROM User WHERE id=?", (uid,))
cur.execute("DELETE FROM NewsItem WHERE id >= 9000")

admin_id = upsert_user("admin", "مدیر کل خبرگزاری", "admin", SUPER_PHONE, canSendEitaa=1, canManageContent=1)
demo_admin = upsert_user("demo-admin", "ادمین آزمایشی", "admin", ADMIN_PHONE, canSendEitaa=1, canManageContent=1)
rep1 = upsert_user("reporter1", "علی محمدی", "reporter", REPORTER_PHONE)
rep2 = upsert_user("reporter2", "زهرا کریمی", "reporter", "09120000002", district="b2")

NEWS = [
    ("b1", "social",  "همایش پیاده‌روی خانوادگی بسیج شهر رشت برگزار شد",
     "همایش پیاده‌روی خانوادگی با حضور بیش از ۵۰۰ نفر از اعضای بسیج شهر رشت در بلوار امام رضا برگزار شد.",
     "approved", "", 320, 45),
    ("b1", "cultural","کارگاه آموزشی مهارت‌های رسانه‌ای برای خبرنگاران بسیجی",
     "کارگاه مهارت‌های رسانه‌ای و تولید محتوای خبری با حضور کارشناسان خبرگزاری بسیج در حوزه مقاومت بسیج شهر رشت آغاز به کار کرد.",
     "approved", "", 210, 30),
    ("b2", "relief",  "بسیج دانش‌آموزی رشت محله‌های کم‌برخوردار را محرومیت‌زدایی می‌کند",
     "طرح محرومیت‌زدایی بسیج دانش‌آموزی با محوریت قرارگاه شهید کاوه در محله‌های حاشیه‌ای شهر رشت اجرا شد.",
     "pending", "district", 95, 25),
    ("b3", "health",  "طرح واکسیناسیون رایگان اردوی جهادی بسیج پزشکی",
     "اردوی جهادی بسیج پزشکی با ارائه خدمات واکسیناسیون و ویزیت رایگان در روستاهای اطراف رشت دایر شد.",
     "pending", "district", 60, 40),
    ("b1", "political","نشست هم‌اندیشی فرماندهان حوزه مقاومت بسیج شهر رشت",
     "نشست هم‌اندیشی فرماندهان حوزه مقاومت بسیج شهر رشت با محوریت برنامه‌های سالانه و اولویت‌های اطلاع‌رسانی برگزار شد.",
     "approved", "", 180, 20),
    ("b4", "sport",   "مسابقات فوتسال جام رمضان بسیج پایگاه‌های شهر رشت",
     "مرحله نهایی مسابقات فوتسال جام رمضان میان پایگاه‌های مقاومت بسیج شهر رشت در مجموعه ورزشی شهید انصاری برگزار شد.",
     "pending", "specialist", 140, 35),
    ("b2", "social",  "گردهمایی اعضای حلقه‌های صالحین حوزه مقاومت بسیج شهر رشت",
     "گردهمایی آموزشی اعضای حلقه‌های صالحین با حضور اساتید حوزه و دانشگاه در مرکز آموزش بسیج شهر رشت برگزار شد.",
     "pending", "district", 88, 28),
    ("b5", "cultural","افتتاحیه کتابخانه digital پایگاه مقاومت بسیج امام حسین",
     "کتابخانه دیجیتال پایگاه مقاومت بسیج امام حسین با بیش از دو هزار عنوان کتاب الکترونیکی به بهره‌برداری رسید.",
     "pending", "district", 45, 15),
]

now = datetime.now(timezone.utc)
for i, (district, cat, title, lead, status, stage, views, dur) in enumerate(NEWS):
    rid = rep1 if i % 2 == 0 else rep2
    cur.execute(
        "INSERT INTO NewsItem (id, code, reporterId, district, category, title, lead, content, "
        "mediaType, status, reviewStage, views, durationMin, preparedAt, createdAt, updatedAt) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            9000 + i, f"N-{9100+i}", rid, district, cat, title, lead,
            lead + " جزئیات تکمیلی این خبر به‌زودی از سوی روابط‌عمومی خبرگزاری بسیج شهر رشت منتشر می‌شود. "
            "خبرنگار محترم می‌تواند تصاویر و مستندات مرتبط را از پنل خود پیوست کند.",
            "none", status, stage, views, dur,
            iso(now - timedelta(days=i % 5, hours=i)),
            iso(now - timedelta(days=i % 5, hours=i + 1)),
            iso(),
        ),
    )

# واحدهای سازمانی پیش‌فرض (حوزه‌ها و پایگاه‌ها)
orgs = [
    {"key": "b1", "label": "حوزه مقاومت بسیج شهید بهشتی", "bases": ["پایگاه شهید بهشتی", "پایگاه امام حسین"]},
    {"key": "b2", "label": "حوزه مقاومت بسیج شهید کاوه", "bases": ["پایگاه شهید کاوه", "پایگاه یازهرا"]},
]
cur.execute("SELECT id FROM OrgUnits WHERE id=1")
if cur.fetchone():
    cur.execute("UPDATE OrgUnits SET json=?, updatedAt=? WHERE id=1", (json.dumps(orgs, ensure_ascii=False), iso()))
else:
    cur.execute("INSERT INTO OrgUnits (id, json, updatedAt) VALUES (1, ?, ?)", (json.dumps(orgs, ensure_ascii=False), iso()))

con.commit()
print("users:", cur.execute("SELECT COUNT(*) FROM User").fetchone()[0])
print("news :", cur.execute("SELECT COUNT(*) FROM NewsItem").fetchone()[0])
print("ADMIN LOGIN → phone:", ADMIN_PHONE, "| role: admin")
con.close()
