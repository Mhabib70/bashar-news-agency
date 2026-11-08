#!/usr/bin/env python3
# پاک‌سازی امن دیسک سرور ودا: build cache + لاگ‌ها — بدون دست زدن به volumeها و image بکاپ
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=300):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8', 'replace').strip()
    e = err.read().decode('utf-8', 'replace').strip()
    print(f"$ {cmd}\n[rc={rc}] {o[-800:]}")
    if e: print("[stderr]", e[-300:])
    print()
    return rc, o

run("df -h / /var 2>/dev/null | head -5")
run("docker system df 2>&1 | head -6")
run("journalctl --disk-usage 2>/dev/null")

print("=== پاک‌سازی ===")
run("docker builder prune -af 2>&1 | tail -2", timeout=600)
run("docker image prune -f 2>&1 | tail -2")
run("rm -rf /var/lib/containerd/tmpmounts/* 2>/dev/null; journalctl --vacuum-size=50M 2>&1 | tail -1")
run("find /var/log -type f -name '*.gz' -delete 2>/dev/null; find /var/log -type f -name '*.[0-9]' -delete 2>/dev/null; echo logs-cleaned")
run("df -h / | tail -1")

cli.close()
