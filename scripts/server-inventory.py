#!/usr/bin/env python3
# بررسی وضعیت سرور ودا قبل از استقرار نسخه ادغام‌شده
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=60):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8', 'replace').strip()
    e = err.read().decode('utf-8', 'replace').strip()
    print(f"$ {cmd}\n[rc={rc}] {o[-1500:]}")
    if e: print("[stderr]", e[-200:])
    print()
    return o

run("df -h / | tail -1")
run("docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | head -5")
run("cat /www/wwwroot/vodda/docker-compose.deploy.yml")
run("grep -c SESSION_SECRET /www/wwwroot/vodda/bashar/.env 2>/dev/null || echo 'NO_ENV_FILE'; ls -la /www/wwwroot/vodda/bashar/.env 2>/dev/null")
run("docker exec vodda-bashar-1 env 2>/dev/null | grep -E 'SESSION|DATABASE' | sed 's/=.*SECRET.*/=***/' | head -4")
run("ls /www/wwwroot/vodda/bashar/src/lib/server/ 2>/dev/null")
run("ls /www/wwwroot/vodda/bashar/src/components/app/ 2>/dev/null | head -20")
run("curl -s http://127.0.0.1:3424/api/login -X POST -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' --max-time 8 -i | head -12")
run("du -sh /www/wwwroot/vodda/bashar/public/uploads /www/wwwroot/vodda/bashar/db 2>/dev/null")
run("ls /www/wwwroot/vodda/bashar/prisma/ 2>/dev/null")
cli.close()
print("INVENTORY DONE")
