#!/usr/bin/env python3
# پاکسازی داده‌های تست چرخه — حفظ ادمین واقعی و اخبار خودش
import sqlite3

c = sqlite3.connect("/home/z/my-project/db/custom.db")
c.row_factory = sqlite3.Row

# کاربران تستی: نامشان شامل «تست » است (همه از اجراهای اسکریپت E2E)
test_users = c.execute("SELECT id, fullName FROM User WHERE fullName LIKE 'تست %'").fetchall()
ids = [u["id"] for u in test_users]
print(f"کاربران تستی: {len(ids)}")
for u in test_users:
    print("  حذف:", u["fullName"][:40])

ph = ",".join("?" * len(ids)) if ids else "''"

# اخبار کاربران تستی
news_ids = [r["id"] for r in c.execute(f"SELECT id FROM NewsItem WHERE reporterId IN ({ph})", ids)] if ids else []
print(f"اخبار تستی: {len(news_ids)} → {news_ids}")

if news_ids:
    nph = ",".join("?" * len(news_ids))
    c.execute(f"DELETE FROM NewsEvent WHERE newsId IN ({nph})", news_ids)
    c.execute(f"DELETE FROM ChallengeParticipation WHERE newsId IN ({nph})", news_ids) if c.execute("SELECT COUNT(*) FROM sqlite_master WHERE name='ChallengeParticipation' AND sql LIKE '%newsId%'").fetchone()[0] else None

if ids:
    c.execute(f"DELETE FROM NewsEvent WHERE newsId IN (SELECT id FROM NewsItem WHERE reporterId IN ({ph}))", ids)
    c.execute(f"DELETE FROM Notification WHERE userId IN ({ph}) OR ref LIKE 'news:%'", ids + [])
    c.execute(f"DELETE FROM PointsLog WHERE userId IN ({ph})", ids)
    c.execute(f"DELETE FROM UserBadge WHERE userId IN ({ph})", ids)
    c.execute(f"DELETE FROM Draft WHERE userId IN ({ph})", ids)
    c.execute(f"DELETE FROM ChallengeParticipation WHERE userId IN ({ph})", ids)
    c.execute(f"DELETE FROM NotifSetting WHERE userId IN ({ph})", ids)
    c.execute(f"DELETE FROM NewsItem WHERE reporterId IN ({ph})", ids)
    c.execute(f"DELETE FROM User WHERE id IN ({ph})", ids)

# اعلان‌های باقی‌مانده مربوط به اخبار حذف‌شده
for nid in news_ids:
    c.execute("DELETE FROM Notification WHERE ref = ?", (f"news:{nid}",))

c.commit()

# گزارش نهایی
print("\n--- وضعیت نهایی ---")
for r in c.execute("SELECT fullName, role, status FROM User"):
    print("  کاربر:", r["fullName"], "|", r["role"], "|", r["status"])
for r in c.execute("SELECT code, status, reviewStage FROM NewsItem ORDER BY id"):
    print("  خبر:", r["code"], "|", r["status"], "|", r["reviewStage"] or "—")
print("  رویدادها:", c.execute("SELECT COUNT(*) FROM NewsEvent").fetchone()[0])
print("  اعلان‌ها:", c.execute("SELECT COUNT(*) FROM Notification").fetchone()[0])
