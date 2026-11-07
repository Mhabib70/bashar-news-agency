#!/usr/bin/env python3
# Deploy سیستم به‌روزرسانی درون‌اپی به سرور ودا:
#   1) بکاپ image فعلی
#   2) آپلود ۴ فایل وب + APK در public/apk
#   3) docker build + recreate کانتینر bashar
#   4) وریفای زنده API و فایل APK
import json, os, time, paramiko

CFG_PATH = '/home/z/my-project/upload/deploy.json'
LOCAL_ROOT = '/home/z/my-project'
REMOTE_ROOT = '/www/wwwroot/vodda/bashar'

FILES = [
    'src/app/api/app-version/route.ts',
    'src/components/app/update-banner.tsx',
    'src/app/layout.tsx',
    'data/app-version.json',
    'public/apk/BasijNews-v2.8.0.apk',   # میزبانى APK روى سرور خودى — سریع براى کاربران ایران
]

cfg = json.load(open(CFG_PATH))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=600, show=True):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8', 'replace').strip()
    e = err.read().decode('utf-8', 'replace').strip()
    if show:
        tail = o[-1500:] if o else ''
        print(f"$ {cmd}\n[rc={rc}]\n{tail}")
        if e: print("[stderr]", e[-400:])
    return rc, o, e

# 1) بکاپ image فعلی
print("=== 1) backup current image ===")
run("docker tag vodda-bashar:prod vodda-bashar:backup-pre228 2>&1 || true", show=False)

# 2) آپلود فایل‌ها
print("=== 2) upload files ===")
sftp = cli.open_sftp()
for rel in FILES:
    local = os.path.join(LOCAL_ROOT, rel)
    remote = f'{REMOTE_ROOT}/{rel}'
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

# 3) ساخت image جدید + recreate
print("=== 3) docker build (چند دقیقه) ===")
rc, o, e = run("cd /www/wwwroot/vodda && docker build --target runner -q -t vodda-bashar:prod bashar 2>&1 | tail -3", timeout=900)
if rc != 0:
    print("BUILD FAILED — نگه داشتن نسخه فعلی")
    cli.close(); raise SystemExit(1)

print("=== 3b) recreate container ===")
run("cd /www/wwwroot/vodda && docker compose -f docker-compose.deploy.yml up -d bashar 2>&1 | tail -4", timeout=300)

# 4) وریفای
print("=== 4) verify ===")
for attempt in range(10):
    rc, o, _ = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3424/api/bootstrap --max-time 5", show=False)
    if o == '200':
        print(f"container healthy after {attempt*6}s")
        break
    time.sleep(6)

run("curl -s 'http://127.0.0.1:3424/api/app-version?current=11' --max-time 8", show=True)
run("curl -s -o /dev/null -w 'APK_HTTP:%{http_code} SIZE:%{size_download}' http://127.0.0.1:3424/apk/BasijNews-v2.8.0.apk --max-time 15", show=True)

cli.close()
print("DEPLOY DONE")
