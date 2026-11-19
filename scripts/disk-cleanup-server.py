#!/usr/bin/env python3
# آزادسازی فضای دیسک سرور وودا (۹۶٪ پر) + آماده‌سازی رول‌بک برای استقرار تم
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=120):
    _, o, e = cli.exec_command(cmd, timeout=t)
    rc = o.channel.recv_exit_status()
    print(f"$ {cmd[:90]}\n[rc={rc}]", o.read().decode('utf-8', 'replace').strip()[-700:])
    err = e.read().decode('utf-8', 'replace').strip()
    if err:
        print('[err]', err[-200:])

print('=== disk before ===')
run('df -h / | tail -1')

print('=== tag current prod as rollback (12-items, pre-theme) ===')
run('docker tag vodda-bashar:prod vodda-bashar:rollback-12items 2>&1')

print('=== drop old pre-packages backup (superseded by rollback-12items) ===')
run('docker rmi vodda-bashar:backup-pre-packages 2>&1 | tail -2')

print('=== docker cleanup: dangling images + build cache ===')
run('docker image prune -f 2>&1 | tail -1')
run('docker builder prune -f 2>&1 | tail -1', t=300)

print('=== /tmp and journal cleanup ===')
run('rm -f /tmp/bn-src.tgz /tmp/live.css; journalctl --vacuum-size=50M 2>&1 | tail -1')

print('=== disk after ===')
run('df -h / | tail -1')
run("docker images vodda-bashar --format '{{.Repository}}:{{.Tag}}  {{.Size}}'")

cli.close()
