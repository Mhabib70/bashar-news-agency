#!/usr/bin/env python3
# بررسی docker و نحوه اجرای اپ + کانفیگ nginx
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)

CMDS = [
    "whoami; id",
    "docker ps 2>&1 | head -8",
    "cat /www/wwwroot/vodda/docker-compose.yml 2>/dev/null | head -30; cat /www/wwwroot/vodda/bashar/docker-compose.yml 2>/dev/null | head -30",
    "ls /www/server/panel/vhost/nginx/ 2>/dev/null | head; grep -l '80.91.208.240\\|vodda\\|bashar' /www/server/panel/vhost/nginx/*.conf 2>/dev/null | head -3",
]

for c in CMDS:
    print(f"### $ {c}")
    _, out, err = cli.exec_command(c, timeout=25)
    print(out.read().decode('utf-8', 'replace').strip()[:1500])
    e = err.read().decode('utf-8', 'replace').strip()
    if e: print("[stderr]", e[:300])
    print()
cli.close()
