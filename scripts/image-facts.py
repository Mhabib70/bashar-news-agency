#!/usr/bin/env python3
# کدام ایمیج واقعاً اجرا می‌شود؟ سورس سرور v3 است یا سبز؟
import json, paramiko
cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=60):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    print(f"$ {cmd[:90]}\n[rc={rc}] {out.read().decode('utf-8','replace').strip()[-700:]}")
    e = err.read().decode('utf-8','replace').strip()
    if e: print("[stderr]", e[-200:])
    print()

run("docker inspect vodda-bashar-1 --format 'running_image={{.Image}} started={{.State.StartedAt}}'")
run("docker images --no-trunc --format '{{.Repository}}:{{.Tag}} {{.ID}}' vodda-bashar | head -4")
run("grep -c 'v3-navy' /www/wwwroot/vodda/bashar/src/app/globals.css")
run("grep -oE '#1[0-9a-f]{5}|#2[0-9a-f]{5}' /www/wwwroot/vodda/bashar/src/app/globals.css | sort -u | head -8")
run("grep -c 'emerald\\|green-\\|#16a34a\\|#15803d' /www/wwwroot/vodda/bashar/src/app/globals.css")
run("grep -n 'v3-tile-blue\\|v3-navpill' /www/wwwroot/vodda/bashar/src/app/globals.css | head -3")
run("md5sum /www/wwwroot/vodda/bashar/src/app/globals.css /www/wwwroot/vodda/bashar/src/components/app/home.tsx")
run("tail -5 /www/wwwroot/vodda/bashar/src/app/globals.css")
cli.close()
print("IMAGE FACTS DONE")
