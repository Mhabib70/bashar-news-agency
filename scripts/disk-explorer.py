#!/usr/bin/env python3
# کاوش واقعی مصرف دیسک — چه چیزی ۱۶GB را خورده؟
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=180):
    _, o, e = cli.exec_command(cmd, timeout=t)
    rc = o.channel.recv_exit_status()
    print(f"$ {cmd[:100]}\n[rc={rc}]", o.read().decode('utf-8', 'replace').strip()[-1500:])
    err = e.read().decode('utf-8', 'replace').strip()
    if err:
        print('[err]', err[-150:])

run('docker info 2>/dev/null | grep -i "root\\|storage"')
run('du -xsh /var/lib/docker 2>/dev/null; du -xsh /* 2>/dev/null | sort -rh | head -12')
run('du -xsh /var/lib/docker/overlay2 /var/lib/docker/containers /var/lib/docker/volumes 2>/dev/null')
run('du -xsh /root/* /home/* 2>/dev/null | sort -rh | head -8')
run('find / -xdev -type f -size +300M -exec ls -sh {} \; 2>/dev/null | head -10')

cli.close()
