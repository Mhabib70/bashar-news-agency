#!/usr/bin/env python3
# پیدا کردن compose پروژه کانتینر bashar + روش ریستارت قبلی
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)

CMDS = [
    "docker inspect vodda-bashar-1 --format '{{index .Config.Labels \"com.docker.compose.project.working_dir\"}} | {{index .Config.Labels \"com.docker.compose.project.config_files\"}}'",
    "docker inspect vodda-bashar-1 --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}' | head -8",
]

for c in CMDS:
    print(f"### $ {c}")
    _, out, err = cli.exec_command(c, timeout=25)
    print(out.read().decode('utf-8', 'replace').strip()[:800])
    e = err.read().decode('utf-8', 'replace').strip()
    if e: print("[stderr]", e[:300])
    print()
cli.close()
