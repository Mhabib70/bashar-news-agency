#!/usr/bin/env python3
# QA زندهٔ کامل بسته‌های تعامل/اثر/ابزار روی ودا — از طریق nginx یا مستقیم
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=60, label=""):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8', 'replace').strip()
    print(f"### {label or cmd[:60]}\n[rc={rc}] {o[-500:]}")
    return rc, o

run("rm -f /tmp/qa_pkg.txt; curl -s -c /tmp/qa_pkg.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' --max-time 8 | head -c 80", label="LOGIN")

# ۱) state: unread badge + weekFeatured + streak
run("curl -s -b /tmp/qa_pkg.txt http://127.0.0.1:3424/api/state --max-time 10 | python3 -c \"import json,sys; d=json.load(sys.stdin); print('notif_count:', len(d.get('notifications',[])), '| unread:', d.get('unreadNotifications'), '| weekFeatured:', bool(d.get('weekFeatured')), '| streak:', d.get('user',{}).get('currentStreak'), '| notifSettings:', 'quietStart' in str(d.get('notifSettings',{})))\"", label="STATE (notifications/featured/streak)")

# ۲) feed: کلیدهای views/eitaaReactions/isWeekFeatured
run("curl -s -b /tmp/qa_pkg.txt 'http://127.0.0.1:3424/api/news/feed?take=3' --max-time 10 | python3 -c \"import json,sys; d=json.load(sys.stdin); n=d['news'][0] if d.get('news') else {}; print('feed keys ok:', all(k in n for k in ('views','eitaaReactions')), '| first:', n.get('code'), 'views=', n.get('views'))\"", label="FEED (views/eitaa keys)")

# ۳) شمارش بازدید
run("curl -s -b /tmp/qa_pkg.txt -X POST http://127.0.0.1:3424/api/news/view -H 'Content-Type: application/json' -d '{\"newsId\":1}' --max-time 8", label="VIEW COUNT")

# ۴) تقویم جلالی
run("curl -s -b /tmp/qa_pkg.txt 'http://127.0.0.1:3424/api/news/calendar' --max-time 10 | python3 -c \"import json,sys; d=json.load(sys.stdin); print('calendar jy/jm:', d.get('jy'), d.get('jm'), '| items:', len(d.get('items',[])), '| monthLength:', d.get('monthLength'))\"", label="JALALI CALENDAR")

# ۵) آرشیو جستجوپذیر (q)
run("curl -s -b /tmp/qa_pkg.txt 'http://127.0.0.1:3424/api/news/all?q=%D8%B1%D8%B4%D8%AA' --max-time 10 | python3 -c \"import json,sys; d=json.load(sys.stdin); ns=d.get('news',d.get('items',[])); print('search رشت →', len(ns), 'results')\"", label="ARCHIVE SEARCH")

# ۶) پیش‌نویس: ذخیره → استفاده → حذف
run("curl -s -b /tmp/qa_pkg.txt -X POST http://127.0.0.1:3424/api/drafts -H 'Content-Type: application/json' -d '{\"category\":\"society\",\"title\":\"QA پیش‌نویس\",\"content\":\"تست\",\"mediaType\":\"none\",\"durationMin\":5}'", label="DRAFT CREATE")
run("curl -s -b /tmp/qa_pkg.txt -X DELETE 'http://127.0.0.1:3424/api/drafts?latest=1' --max-time 8 | head -c 60; echo", label="DRAFT DELETE probe")

# ۷) اعلان‌ها: خواندن
run("curl -s -b /tmp/qa_pkg.txt -X POST http://127.0.0.1:3424/api/notifications/read --max-time 8", label="NOTIFS MARK READ")

# ۸) login/pin روی حساب بی‌پین باید pinRequired=false بدهد
run("curl -s -b /tmp/qa_pkg.txt -X POST http://127.0.0.1:3424/api/user/pin -H 'Content-Type: application/json' -d '{}' --max-time 8 | head -c 100; echo", label="PIN endpoint probe (expect error msg)")

run("rm -f /tmp/qa_pkg.txt", label="cleanup")
cli.close()
print("QA DONE")
