#!/usr/bin/env python3
# پاکسازی عمیق دیسک سرور — هدف: حداقل ۵GB آزاد برای بیلد
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    rc = o.channel.recv_exit_status()
    print(f"$ {cmd[:90]}\n[rc={rc}]", o.read().decode('utf-8', 'replace').strip()[-600:])
    err = e.read().decode('utf-8', 'replace').strip()
    if err:
        print('[err]', err[-150:])

print('=== docker space usage ===')
run('docker system df')

print('=== all containers (find stopped) ===')
run("docker ps -a --format '{{.Names}}  {{.Status}}  {{.Image}}'")

print('=== remove stopped old containers ===')
run("docker ps -a --filter 'status=exited' --filter 'status=created' --format '{{.ID}} {{.Names}}' | awk '{print $1}' | xargs -r docker rm")

print('=== drop backup-pre-packages + migrator (both rebuilt by pipeline) ===')
run('docker rmi vodda-bashar:backup-pre-packages 2>&1 | tail -1')
run('docker rmi vodda-bashar:migrator 2>&1 | tail -1')

print('=== other project images ===')
run("docker images --format '{{.Repository}}:{{.Tag}}  {{.Size}}' | head -20")

print('=== big dirs on disk ===')
run('du -sh /www/wwwroot/* /var/lib/docker /tmp /var/log 2>/dev/null | sort -rh | head -10')

print('=== bashar source dir size (old tars? node_modules?) ===')
run('du -sh /www/wwwroot/vodda/bashar/* 2>/dev/null | sort -rh | head -10')

print('=== disk now ===')
run('df -h / | tail -1')

cli.close()
