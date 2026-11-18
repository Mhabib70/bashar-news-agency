#!/usr/bin/env python3
# دانلود دیتابیس زندهٔ تولید از کانتینر ودا — برای QA محلی با دادهٔ واقعی
import json, paramiko
cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)
_, out, _ = cli.exec_command("docker cp vodda-bashar-1:/app/db/custom.db /tmp/prod-copy.db && ls -la /tmp/prod-copy.db", timeout=60)
print(out.read().decode().strip())
sftp = cli.open_sftp()
sftp.get('/tmp/prod-copy.db', '/home/z/my-project/download/prod-db-live.db')
sftp.close()
cli.close()
print("downloaded to download/prod-db-live.db")
