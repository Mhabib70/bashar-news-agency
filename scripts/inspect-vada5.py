#!/usr/bin/env python3
# دیدن docker-compose.deploy.yml بخش bashar + nginx conf
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)

CMDS = [
    "cat /www/wwwroot/vodda/docker-compose.deploy.yml | head -60",
    "grep -rn '3424\\|bashar' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /www/server/nginx/conf/ 2>/dev/null | grep -v '#' | head -8",
]

for c in CMDS:
    print(f"### $ {c}")
    _, out, err = cli.exec_command(c, timeout=25)
    print(out.read().decode('utf-8', 'replace').strip()[:2500])
    e = err.read().decode('utf-8', 'replace').strip()
    if e: print("[stderr]", e[:300])
    print()
cli.close()
