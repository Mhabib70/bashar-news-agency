#!/usr/bin/env python3
# مقایسه Dockerfile سرور + entrypoint + آخرین خطوط لاگ
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=60, label=None):
    _, o, e = cli.exec_command(cmd, timeout=t)
    print('###', label or cmd)
    print(o.read().decode('utf-8', 'replace').strip()[:2500])
    err = e.read().decode('utf-8', 'replace').strip()
    if err: print('[stderr]', err[:200])
    print()

run("grep -n 'ENTRYPOINT\\|CMD\\|db push\\|entrypoint' /www/wwwroot/vodda/bashar/Dockerfile", label="server Dockerfile entry/cmd")
run("ls /www/wwwroot/vodda/bashar/docker-entrypoint.sh /www/wwwroot/vodda/bashar/scripts/ 2>/dev/null | head -20", label="entrypoint files")
run("docker logs vodda-bashar-1 2>&1 | tail -c 1800", label="raw logs tail")
run("docker inspect vodda-bashar-1 --format '{{json .Config.Entrypoint}} | {{json .Config.Cmd}} | user={{.Config.User}}'", label="container entrypoint/cmd/user")

cli.close()
