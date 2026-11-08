#!/usr/bin/env python3
# Deploy بازطراحی UI v3 به سرور ودا — بکاپ image + آپلود ۱۵ فایل + build با target runner + وریفای
import json, os, time, paramiko

CFG_PATH = '/home/z/my-project/upload/deploy.json'
LOCAL_ROOT = '/home/z/my-project'
REMOTE_ROOT = '/www/wwwroot/vodda/bashar'

FILES = [
    'src/app/globals.css',
    'src/app/page.tsx',
    'src/app/layout.tsx',
    'src/components/app/activity.tsx',
    'src/components/app/bits.tsx',
    'src/components/app/bottom-nav.tsx',
    'src/components/app/home.tsx',
    'src/components/app/news-edit.tsx',
    'src/components/app/news-tab.tsx',
    'src/components/app/profile.tsx',
    'src/components/app/review-tab.tsx',
    'src/components/app/sheets.tsx',
    'src/components/app/social.tsx',
    'src/components/app/submit-flow.tsx',
    'src/components/app/welcome.tsx',
    'src/components/app/update-banner.tsx',
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
        print(f"$ {cmd}\n[rc={rc}] {o[-900:]}")
        if e: print("[stderr]", e[-300:])
    return rc, o, e

print("=== 1) backup current image ===")
run("docker tag vodda-bashar:prod vodda-bashar:backup-pre-v3ui 2>&1 || true", show=False)

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

print("=== 3) docker build --target runner ===")
rc, o, e = run("cd /www/wwwroot/vodda && docker build --target runner -q -t vodda-bashar:prod bashar 2>&1 | tail -3", timeout=900)
if rc != 0:
    print("BUILD FAILED — نگه داشتن نسخه فعلی")
    cli.close(); raise SystemExit(1)

print("=== 3b) recreate container ===")
run("cd /www/wwwroot/vodda && docker compose -f docker-compose.deploy.yml up -d bashar 2>&1 | tail -3", timeout=300)

print("=== 4) verify ===")
for attempt in range(12):
    rc, o, _ = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3424/api/bootstrap --max-time 5", show=False)
    if o == '200':
        print(f"container healthy after ~{attempt*6}s")
        break
    time.sleep(6)

run("curl -s -o /dev/null -w 'HOME_HTTP:%{http_code}' http://127.0.0.1:3424/ --max-time 10", show=True)
run("curl -s 'http://127.0.0.1:3424/api/app-version?current=12' --max-time 8 | head -c 120", show=True)

cli.close()
print("DEPLOY DONE")
