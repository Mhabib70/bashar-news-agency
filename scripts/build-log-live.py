#!/usr/bin/env python3
"""بررسی زندهٔ لاگ بیلد سرور — آخرین خطوط /tmp/bn-build.log + پروسهٔ فعال"""
import json, os, sys, paramiko

CFG = '/home/z/my-project/upload/deploy.json'
cfg = json.load(open(CFG))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)
_, out, err = cli.exec_command(
    "tail -n ${1:-25} /tmp/bn-build.log 2>/dev/null; echo ---PROCS---; "
    "ps aux | grep -E 'docker build|nohup' | grep -v grep | head -4; echo ---DONE---",
    timeout=30,
)
print(out.read().decode(errors="replace"))
cli.close()
