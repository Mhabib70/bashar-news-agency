#!/usr/bin/env python3
# بررسی وضعیت بسته‌ها روی ودا: آیا سورس و ایمیج حاوی pin.ts و بسته‌ها هستند؟
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
    print(f"$ {cmd}\n[rc={rc}] {o[-600:]}")
    if e: print("[stderr]", e[-200:])
    return rc, o

# ۱) سورس سرور: فایل‌های نشانگر بسته‌ها
run("ls /www/wwwroot/vodda/bashar/src/lib/server/pin.ts /www/wwwroot/vodda/bashar/src/app/api/login/pin/route.ts /www/wwwroot/vodda/bashar/src/app/api/news/praise/route.ts 2>&1")
# ۲) ایمیج prod چه زمانی ساخته شده؟
run("docker images vodda-bashar --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}'")
# ۳) کانتینر از چه ایمیجی اجرا شده و چه زمانی؟
run("docker inspect vodda-bashar-1 --format '{{.Image}} created={{.Created}}' 2>/dev/null | head -c 120")
run("docker ps --filter name=bashar --format '{{.Status}}'")
# ۴) QA زنده: آیا login پین‌وار می‌دهد؟ (کاربر بدون pin → ok بدون pinRequired)
run("curl -s -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' --max-time 8 | head -c 150")
print()
run("curl -s 'http://127.0.0.1:3424/api/app-version?current=12' --max-time 8 | head -c 100")
cli.close()
