#!/usr/bin/env python3
# بخش bashar در compose + nginx server block اصلی
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)

CMDS = [
    "grep -n -A 28 '^  bashar:' /www/wwwroot/vodda/docker-compose.deploy.yml",
    "for f in /etc/nginx/nginx.conf /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*; do [ -f \"$f\" ] && grep -Hn '3424\\|server_name\\|listen ' \"$f\" 2>/dev/null | head -10; done",
]

for c in CMDS:
    print(f"### $ {c}")
    _, out, err = cli.exec_command(c, timeout=25)
    print(out.read().decode('utf-8', 'replace').strip()[:2200])
    e = err.read().decode('utf-8', 'replace').strip()
    if e: print("[stderr]", e[:300])
    print()
cli.close()
