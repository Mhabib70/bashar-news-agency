#!/usr/bin/env python3
# آپلود امن فایل‌های تغییر یافته اپ bashar به سرور ودا با SFTP — اعتبارنامه از upload/deploy.json
import json, os, sys, paramiko

CFG = '/home/z/my-project/upload/deploy.json'
REMOTE_ROOT = '/www/wwwroot/vodda/bashar'

# فایل‌های نسخه v4 تالار — بازطراحی گرافیکی کامل
FILES = [
    'prisma/schema.prisma',
    'src/app/api/forum/route.ts',
    'src/app/forum/page.tsx',
    'src/app/globals.css',
    'src/lib/domain.ts',
    'src/lib/server/state.ts',
    'src/lib/store.ts',
]

def main():
    cfg = json.load(open(CFG))
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
                timeout=20, allow_agent=False, look_for_keys=False)
    sftp = cli.open_sftp()
    for rel in FILES:
        local = os.path.join('/home/z/my-project', rel)
        remote = f'{REMOTE_ROOT}/{rel}'
        # اطمینان از وجود پوشه مقصد
        parts = remote.rsplit('/', 1)[0].split('/')
        for i in range(2, len(parts) + 1):
            d = '/'.join(parts[:i])
            try:
                sftp.stat(d)
            except FileNotFoundError:
                sftp.mkdir(d)
        sftp.put(local, remote)
        st = sftp.stat(remote)
        print(f'up {rel} -> {st.st_size} bytes')
    sftp.close()
    cli.close()
    print('UPLOAD OK')

if __name__ == '__main__':
    main()
