#!/usr/bin/env python3
# بررسی نحوه اجرای اپ روی سرور ودا — فقط خواندنی
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)

CMDS = [
    "pm2 list 2>/dev/null | head -12",
    "ls /www/wwwroot/vodda/bashar/public 2>/dev/null | head",
    "ls /www/wwwroot/vodda/bashar/ | head -20",
    "ps aux | grep -E 'next|node|bun' | grep -v grep | head -6",
    "nginx -v 2>&1; ls /www/server/nginx/conf/vhost 2>/dev/null | head -5",
]

for c in CMDS:
    print(f"### $ {c}")
    _, out, err = cli.exec_command(c, timeout=15)
    print(out.read().decode('utf-8', 'replace').strip()[:900])
    e = err.read().decode('utf-8', 'replace').strip()
    if e: print("[stderr]", e[:200])
    print()
cli.close()
