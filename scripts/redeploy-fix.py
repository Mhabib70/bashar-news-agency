#!/usr/bin/env python3
# جبران: آپلود upload route + APK، سپس اجرای دوباره build+deploy سمت سرور
import json, paramiko
cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

sftp = cli.open_sftp()
print("upload route.ts ...")
sftp.put('/home/z/my-project/src/app/api/upload/route.ts', '/www/wwwroot/vodda/bashar/src/app/api/upload/route.ts')
print("upload APK (583KB) ...")
sftp.put('/home/z/my-project/public/apk/BasijNews-v2.8.0.apk', '/www/wwwroot/vodda/bashar/public/apk/BasijNews-v2.8.0.apk')
sftp.close()
_, out, _ = cli.exec_command("ls -la /www/wwwroot/vodda/bashar/public/apk/ /www/wwwroot/vodda/bashar/src/app/api/upload/ | grep -E 'apk|route'", timeout=30)
print(out.read().decode())

# اجرای دوباره اسکریپت build/deploy که از قبل روی سرور است
cli.exec_command("rm -f /tmp/merge-deploy.log; nohup /tmp/merge-deploy.sh > /dev/null 2>&1 & echo RELAUNCHED", timeout=15)
import time; time.sleep(3)
_, out, _ = cli.exec_command("ps aux | grep merge-deploy | grep -v grep | head -2", timeout=15)
print(out.read().decode())
cli.close()
print("RELAUNCH DONE — poll /tmp/merge-deploy.log")
