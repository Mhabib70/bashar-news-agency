#!/usr/bin/env python3
# بررسی عمق: cwd پروسه‌ها، پورت‌ها، کانفیگ nginx برای مسیر apk
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)

CMDS = [
    "for p in 844845 1507998 3513126; do echo \"pid $p -> $(readlink /proc/$p/cwd 2>/dev/null)\"; done",
    "ss -tlnp 2>/dev/null | grep -E ':(3000|3001|3002|80)\\b' | head -8",
    "grep -rE 'proxy_pass|root|location' /www/server/nginx/conf/vhost/ 2>/dev/null | head -12 || grep -rE 'proxy_pass|location' /etc/nginx/sites-enabled/ 2>/dev/null | head -12",
    "ls /www/wwwroot/vodda/bashar/apk/ 2>/dev/null | tail -5",
    "curl -s -o /dev/null -w '%{http_code} %{content_type}\\n' http://127.0.0.1:3000/ --max-time 5",
]

for c in CMDS:
    print(f"### $ {c}")
    _, out, err = cli.exec_command(c, timeout=20)
    print(out.read().decode('utf-8', 'replace').strip()[:1200])
    e = err.read().decode('utf-8', 'replace').strip()
    if e: print("[stderr]", e[:300])
    print()
cli.close()
