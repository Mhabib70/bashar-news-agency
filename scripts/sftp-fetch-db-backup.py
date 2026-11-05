#!/usr/bin/env python3
# دانلود بکاپ دیتابیس از سرور ودا با SFTP و اعتبارسنجی محلی
import json, paramiko, os

CFG = '/home/z/my-project/upload/deploy.json'
cfg = json.load(open(CFG))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=20, allow_agent=False, look_for_keys=False)
sftp = cli.open_sftp()
remote = '/www/wwwroot/vodda/bashar-db-backup-20261105.tar.gz'
local = '/home/z/my-project/download/bashar-db-backup-20261105.tar.gz'
sftp.get(remote, local)
sftp.close()
cli.close()
print('downloaded:', os.path.getsize(local), 'bytes')
