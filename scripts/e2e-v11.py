#!/usr/bin/env python3
# تست E2E کامل قابلیت‌های v1.1 — خبرگزاری بشر
import json
import urllib.request
import urllib.error
import io
import sys
import uuid
import time

BASE = "http://localhost:3000"
results = []


def call(method, path, body=None, raw=False, headers=None):
    url = BASE + path
    data = None
    hdrs = headers or {}
    if body is not None and not raw:
        data = json.dumps(body).encode()
        hdrs["Content-Type"] = "application/json"
    elif body is not None and raw:
        data = body
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            content = r.read()
            if raw:
                return r.status, content, dict(r.headers)
            return r.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            parsed = json.loads(content) if content else {}
        except Exception:
            parsed = {}
        return (e.code, parsed, {}) if raw else (e.code, parsed)


def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(("PASS" if cond else "FAIL") + f" | {name}" + (f" | {extra}" if extra and not cond else ""))


# ---------- ۱) bootstrap اولیه: اولین ثبت‌نام = ادمین فعال ----------
st, r = call("POST", "/api/register", {"fullName": "مدیر تست واحد", "phone": "09121110001", "age": "35", "education": "master", "district": "b1", "base": "پایگاه امام علی (ع)"})
check("register#1 admin active", st == 200 and r.get("status") == "active" and r.get("role") == "admin", str(r))
admin = r["userId"]

st, r = call("GET", "/api/bootstrap")
check("bootstrap lists only active", st == 200 and len(r.get("users", [])) == 1, str(len(r.get('users', []))))

# ---------- ۲) ثبت‌نام دوم = در انتظار تایید + اعلان به ادمین ----------
st, r = call("POST", "/api/register", {"fullName": "رضا تستی", "phone": "09121110002", "age": "27", "education": "bachelor", "district": "b1", "base": "پایگاه شهید بهشتی"})
check("register#2 pending", st == 200 and r.get("status") == "pending", str(r))
pending_user = r["userId"]

st, r = call("GET", f"/api/state?userId={admin}")
check("admin sees pendingCount=1", r.get("pendingUsersCount") == 1, str(r.get("pendingUsersCount")))
notif_kinds = [n["kind"] for n in r.get("notifications", [])]
check("admin got pending_user notification", "pending_user" in notif_kinds, str(notif_kinds))

# ثبت‌نام تکراری در وضعیت pending → 409
st, r = call("POST", "/api/register", {"fullName": "رضا تستی", "phone": "09121110002", "age": "27", "education": "bachelor", "district": "b1", "base": "پایگاه شهید بهشتی"})
check("duplicate pending register 409", st == 409, str(st))

# ---------- ۳) تایید و رد عضویت ----------
st, r = call("POST", "/api/users/decide", {"userId": admin, "targetId": pending_user, "action": "approve"})
check("approve membership", st == 200 and r.get("ok"), str(r))
st, r = call("GET", f"/api/state?userId={pending_user}")
check("approved user active", r.get("user", {}).get("status") == "active", str(r.get("user", {}).get("status")))
reza = pending_user

st, r = call("POST", "/api/register", {"fullName": "مریم تستی", "phone": "09121110003", "age": "24", "education": "diploma", "district": "s1", "base": "پایگاه کوثر"})
maryam = r["userId"]
st, r = call("POST", "/api/users/decide", {"userId": admin, "targetId": maryam, "action": "reject", "reason": "incomplete"})
check("reject membership with preset", st == 200 and r.get("ok"), str(r))
st, r = call("GET", f"/api/state?userId={maryam}")
check("rejected user sees reason", r.get("user", {}).get("status") == "rejected" and r.get("user", {}).get("rejectReason") == "اطلاعات ناقص", str(r.get("user", {})))

# دوباره‌ثبت‌نام کاربر ردشده → pending مجدد
st, r = call("POST", "/api/register", {"fullName": "مریم تستی", "phone": "09121110003", "age": "24", "education": "diploma", "district": "s1", "base": "پایگاه کوثر"})
check("rejected can re-register", st == 200 and r.get("status") == "pending", str(r))
st, r = call("POST", "/api/users/decide", {"userId": admin, "targetId": maryam, "action": "approve"})
check("approve after re-register", st == 200, str(r))

# ---------- ۴) ایجاد چالش (ادمین) ----------
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone.utc)
st, r = call("POST", "/api/challenges", {"userId": admin, "title": "چالش خبر فوری", "description": "بیشترین خبر تاییدشده فوری", "deadlineAt": (now + timedelta(days=2)).isoformat(), "endAt": (now + timedelta(days=3)).isoformat(), "reward": "۶۰ امتیاز + نشان قهرمان 🏆"})
check("create challenge", st == 200 and r.get("ok"), str(r))
ch_id = r["challenge"]["id"]
check("challenge code generated", r["challenge"]["code"].startswith("CH-"), str(r["challenge"]))

st, r = call("GET", f"/api/state?userId={reza}")
kinds = [n["kind"] for n in r.get("notifications", [])]
check("reporter got challenge_new notification", "challenge_new" in kinds, str(kinds))

# دسترسی: خبرنگار نمی‌تواند چالش بسازد
st, r = call("POST", "/api/challenges", {"userId": reza, "title": "چالش غیرمجاز", "deadlineAt": (now + timedelta(days=1)).isoformat(), "endAt": (now + timedelta(days=2)).isoformat()})
check("reporter cannot create challenge", st == 403, str(st))

# ---------- ۵) عضویت و ارسال خبر برای چالش + آپلود رسانه ----------
st, r = call("POST", "/api/challenges/join", {"userId": reza, "challengeId": ch_id})
check("join challenge", st == 200 and r.get("ok"), str(r))

# آپلود عکس واقعی (از فایل‌های موجود پروژه)
with open("/home/z/my-project/public/img/cat-local.png", "rb") as f:
    png = f.read()
boundary = uuid.uuid4().hex
part = io.BytesIO()
part.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"userId\"\r\n\r\n{reza}\r\n".encode())
part.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.png\"\r\nContent-Type: image/png\r\n\r\n".encode())
part.write(png + b"\r\n")
part.write(f"--{boundary}--\r\n".encode())
st, rbody, _ = call("POST", "/api/upload", part.getvalue(), raw=True, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
r = json.loads(rbody)
check("upload photo", st == 200 and r.get("url", "").startswith("/uploads/"), str(r))
media_url = r.get("url", "")

st, r = call("POST", "/api/news", {"userId": reza, "category": "breaking", "title": "آتش‌سوزی مهار شد در میدان مرکزی", "content": "وستا رسانه: آتش‌سوزی در انبار متعلق به شهرداری ظهر امروز توسط آتش‌نشانان مهار شد و خسارت جانی گزارش نشد. تیم‌های امدادی در محل حاضرند.", "mediaType": "photo", "mediaUrl": media_url, "durationMin": 25, "challengeId": ch_id})
check("submit news with media + challenge", st == 200 and r.get("ok"), str(r))
news_id = r["news"]["id"]
st, r = call("GET", f"/api/state?userId={reza}")
n = next((x for x in r["news"] if x["id"] == news_id), {})
check("news has mediaUrl", n.get("mediaUrl") == media_url, str(n.get("mediaUrl")))

# ---------- ۶) چرخه سه‌مرحله‌ای (دسترسی‌ها) ----------
# مدیر حوزه نداریم؛ ادمین از هر مرحله‌ای تایید نهایی می‌کند (قاعده v1.0)
st, r = call("POST", "/api/news/review", {"userId": admin, "newsId": news_id, "action": "approve"})
check("admin final approve", st == 200 and "منتشر" in r.get("message", ""), str(r))

# ---------- ۷) اعلام نتایج چالش ----------
st, r = call("GET", f"/api/state?userId={admin}")
ch = next((c for c in r["challenges"] if c["id"] == ch_id), {})
check("challenge active before finish", ch.get("status") == "active", str(ch.get("status")))

st, r = call("POST", "/api/challenges/finish", {"userId": admin, "challengeId": ch_id})
check("finish challenge", st == 200 and r.get("ok"), str(r))
check("podium has winner", len(r.get("podium", [])) == 1 and r["podium"][0]["userId"] == reza, str(r.get("podium")))

st, r = call("GET", f"/api/state?userId={reza}")
ch = next((c for c in r["challenges"] if c["id"] == ch_id), {})
check("challenge finished with results", ch.get("status") == "finished" and len(ch.get("results", [])) == 1, str(ch.get("results")))
check("winner got champion badge", any(b["key"] == "champion" and b["unlocked"] for b in r.get("badges", [])), "")
kinds = [n["kind"] for n in r.get("notifications", [])]
check("winner got rank_update notification", "rank_update" in kinds, str(kinds))
pts = r["user"]["points"]
check("winner points = submit10+approve15+firstNews20+prize60", pts == 105, str(pts))

# ---------- ۸) اطلاع‌رسانی همگانی ----------
st, r = call("POST", "/api/broadcast", {"userId": admin, "text": "جلسه هم‌اندیشی خبرنگاران فردا ساعت ۱۰ در ستاد برگزار می‌شود."})
check("broadcast sent", st == 200 and r.get("ok"), str(r))
st, r = call("GET", f"/api/state?userId={reza}")
kinds = [n["kind"] for n in r.get("notifications", [])]
check("reporter got broadcast", "broadcast" in kinds, str(kinds))
st, r = call("POST", "/api/broadcast", {"userId": reza, "text": "تلاش غیرمجاز خبرنگار"})
check("reporter cannot broadcast", st == 403, str(st))

# ---------- ۹) لیست کاربران ----------
st, r = call("GET", f"/api/users?userId={admin}")
rows = r.get("users", [])
check("users list for admin", st == 200 and len(rows) == 3, str(len(rows)))
reza_row = next((u for u in rows if u["id"] == reza), {})
check("user row has counts", reza_row.get("newsCounts", {}).get("approved") == 1, str(reza_row.get("newsCounts")))
st, r = call("GET", f"/api/users?userId={reza}")
check("reporter cannot list users", st == 403, str(st))

# ---------- ۱۰) خروجی CSV ----------
st, body, hdrs = call("GET", f"/api/export?userId={reza}&type=report", raw=True)
check("CSV report", st == 200 and body.startswith(b"\xef\xbb\xbf") and "کد".encode() in body, str(st))
check("CSV content-disposition", "attachment" in str(hdrs).lower(), str(hdrs))
st, body, _ = call("GET", f"/api/export?userId={admin}&type=users", raw=True)
check("CSV users (admin)", st == 200 and "مدیر تست واحد".encode() in body, str(st))
st, body, _ = call("GET", f"/api/export?userId={admin}&type=news", raw=True)
check("CSV news (admin)", st == 200 and "آتش‌سوزی".encode() in body, str(st))
st, _, _ = call("GET", f"/api/export?userId={reza}&type=users", raw=True)
check("CSV users blocked for reporter", st == 403, str(st))

# ---------- ۱۱) یادآوری مهلت چالش (۲ ساعت مانده) ----------
st, r = call("POST", "/api/challenges", {"userId": admin, "title": "چالش نزدیک", "deadlineAt": (now + timedelta(hours=2)).isoformat(), "endAt": (now + timedelta(hours=5)).isoformat()})
ch2 = r["challenge"]["id"]
time.sleep(22)  # عبور از محافظ ۲۰ ثانیه‌ای upkeep
st, r = call("GET", f"/api/state?userId={reza}")  # upkeep اجرا می‌شود
kinds = [n["kind"] for n in r.get("notifications", [])]
check("deadline reminder created", "reminder" in kinds, str(kinds))
st, r = call("GET", f"/api/state?userId={reza}")  # دوباره — تکراری نباشد
reminders = [n for n in r.get("notifications", []) if n["kind"] == "reminder" and "چالش نزدیک" in n["title"]]
check("reminder not duplicated", len(reminders) == 1, str(len(reminders)))

# ---------- ۱۲) افت سطح غیبت ----------
import subprocess
backdate = (now - timedelta(days=8)).isoformat()
sql = f"UPDATE User SET lastActivityAt = '{backdate}', levelKey = 'active' WHERE id = '{reza}'"
import os
env = dict(os.environ)
turso_url = env.get("TURSO_DATABASE_URL", "")
if not turso_url:
    for line in open("/home/z/my-project/.env"):
        if line.startswith("TURSO_DATABASE_URL="):
            turso_url = line.strip().split("=", 1)[1]
token = ""
for line in open("/home/z/my-project/.env"):
    if line.startswith("TURSO_AUTH_TOKEN="):
        token = line.strip().split("=", 1)[1]
req = urllib.request.Request(
    turso_url.replace("libsql://", "https://") + "/v2/pipeline",
    data=json.dumps({"requests": [{"type": "execute", "stmt": {"sql": sql}}, {"type": "close"}]}).encode(),
    method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
)
urllib.request.urlopen(req, timeout=20).read()
time.sleep(22)  # عبور از محافظ upkeep
st, r = call("GET", f"/api/state?userId={reza}")  # upkeep → demote
check("demoted after 8 days inactivity (active→follower)", r.get("user", {}).get("levelKey") == "follower", str(r.get("user", {}).get("levelKey")))
kinds = [n["kind"] for n in r.get("notifications", [])]
check("demotion notification", any(n["kind"] == "system" for n in r.get("notifications", [])), str(kinds))

# ---------- ۱۳) انقضای ثبت‌نام معطل (۷۲ ساعت) ----------
st, r = call("POST", "/api/register", {"fullName": "معطل مانده", "phone": "09121110044", "district": "b2", "base": "پایگاه حضرت زهرا (س)"})
stale_id = r["userId"]
backdate = (now - timedelta(hours=73)).isoformat()
sql = f"UPDATE User SET createdAt = '{backdate}' WHERE id = '{stale_id}'"
req = urllib.request.Request(
    turso_url.replace("libsql://", "https://") + "/v2/pipeline",
    data=json.dumps({"requests": [{"type": "execute", "stmt": {"sql": sql}}, {"type": "close"}]}).encode(),
    method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
)
urllib.request.urlopen(req, timeout=20).read()
time.sleep(22)  # عبور از محافظ upkeep
st, r = call("GET", f"/api/state?userId={admin}")  # upkeep → expire
# کاربر منقضی حالا rejected است
req2 = urllib.request.Request(
    turso_url.replace("libsql://", "https://") + "/v2/pipeline",
    data=json.dumps({"requests": [{"type": "execute", "stmt": {"sql": f"SELECT status, rejectReason FROM User WHERE id = '{stale_id}'"}}, {"type": "close"}]}).encode(),
    method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
)
resp = json.loads(urllib.request.urlopen(req2, timeout=20).read())
row = resp["results"][0]["response"]["result"]["rows"][0]
check("stale pending expired", row[0]["value"] == "rejected" and row[1]["value"] == "expired", str(row))

print()
passed = sum(1 for _, ok, _ in results if ok)
print(f"===== RESULT: {passed}/{len(results)} PASS =====")
sys.exit(0 if passed == len(results) else 1)
