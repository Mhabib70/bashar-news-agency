#!/usr/bin/env python3
# QA زندهٔ تم Candy روی سرور وودا — پالت، API های جدید، ورود، فیلد lead
import json, paramiko, base64

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=90):
    b64 = base64.b64encode(cmd.encode()).decode()
    _, o, e = cli.exec_command(f'echo {b64} | base64 -d | bash', timeout=t)
    rc = o.channel.recv_exit_status()
    out = o.read().decode('utf-8', 'replace').strip()
    print(f'[rc={rc}]', out[-700:])
    return out

print('=== 1) پالت Candy در CSS تولیدی ===')
run('''CSS=$(docker exec vodda-bashar-1 sh -c 'find /app/.next -name "*.css" -path "*static*" | head -1')
echo "css: $CSS"
echo "fff8f6: $(grep -c fff8f6 $CSS)"
echo "9d423a: $(grep -c 9d423a 9d423a 2>/dev/null; grep -c 9d423a $CSS)"
echo "b41a22 (قدیمی): $(grep -c b41a22 $CSS || true)"''')

print('=== 2) ورود ادمین و فیلدهای state ===')
run('''curl -s -c /tmp/qa-cookie.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{"phone":"09300500977"}' | head -c 200; echo
curl -s -b /tmp/qa-cookie.txt http://127.0.0.1:3424/api/state | python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d.get('user', {})
print('user:', u.get('fullName'), '| role:', u.get('role'))
print('notifSettings keys:', sorted(d.get('notifSettings', {}).keys()))
print('news[0] lead field:', 'lead' in (d.get('news') or [{}])[0] if d.get('news') else 'no news')
"''')

print('=== 3) KPI ادمین ===')
run("curl -s -b /tmp/qa-cookie.txt http://127.0.0.1:3424/api/admin/stats | head -c 300; echo")

print('=== 4) لاگ امنیتی (باید ورود قبلی ثبت شده باشد) ===')
run("curl -s -b /tmp/qa-cookie.txt 'http://127.0.0.1:3424/api/security-log?take=3' | head -c 400; echo")

print('=== 5) splash و فاوآیکن ===')
run('''curl -s http://127.0.0.1:3424/ | grep -o "logo-mark.png" | head -1
curl -s -o /dev/null -w "logo-mark: %{http_code}\\n" http://127.0.0.1:3424/img/logo-mark.png
curl -s -o /dev/null -w "home: %{http_code}\\n" http://127.0.0.1:3424/''')

print('=== 6) اسکیمای دیتابیس (ستون‌های جدید) ===')
run('''docker exec vodda-bashar-1 sh -c 'command -v sqlite3 >/dev/null && sqlite3 /app/db/custom.db "PRAGMA table_info(User);" | grep -c active' 2>/dev/null || docker run --rm -v bashar_bashar-db:/db alpine sh -c "which sqlite3 >/dev/null 2>&1 || echo no-sqlite" ''')

cli.close()
print('QA DONE')
