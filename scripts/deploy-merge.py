#!/usr/bin/env python3
# استقرار نسخه ادغام‌شده (UI v3 + سشن + جلالی + زمان‌بند) روی سرور ودا
# مراحل: پاک‌سازی دیسک → بکاپ image → سینک کامل سورس (آپلود ۳۲۰+ فایل + حذف فایل‌های قدیمی) →
#        build runner+migrator → مهاجرت اسکیما روی volume واقعی → up -d → health + QA
import json, os, time, paramiko

CFG_PATH = '/home/z/my-project/upload/deploy.json'
LOCAL_ROOT = '/home/z/my-project'
REMOTE_ROOT = '/www/wwwroot/vodda/bashar'
REMOTE_APP = '/www/wwwroot/vodda'

# فایل‌هایی که آپلود نمی‌شوند (باینری‌های بزرگ APK — از قبل روی سرور هستند + env سروری)
SKIP_PREFIXES = ('apk/', 'public/apk/', '.env')

cfg = json.load(open(CFG_PATH))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=900, show=True):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8', 'replace').strip()
    e = err.read().decode('utf-8', 'replace').strip()
    if show:
        print(f"$ {cmd}\n[rc={rc}] {o[-1200:]}")
        if e: print("[stderr]", e[-300:])
    return rc, o, e

import subprocess
tracked = subprocess.run(['git', 'ls-files'], cwd=LOCAL_ROOT, capture_output=True, text=True).stdout.splitlines()
files = [f for f in tracked if not any(f.startswith(p) for p in SKIP_PREFIXES)]
print(f"=== 0) plan: {len(files)} files to upload (of {len(tracked)} tracked) ===")

print("=== 1) disk cleanup (builder prune) ===")
run("docker builder prune -af 2>&1 | tail -1", timeout=300)
run("df -h / | tail -1", show=False)

print("=== 2) backup current image ===")
run("docker tag vodda-bashar:prod vodda-bashar:backup-pre-merge 2>&1 || true", show=False)
run("docker images vodda-bashar --format '{{.Repository}}:{{.Tag}}' | head -5")

print("=== 3) upload full source tree ===")
sftp = cli.open_sftp()
uploaded = 0
for rel in files:
    local = os.path.join(LOCAL_ROOT, rel)
    if not os.path.isfile(local):
        continue
    remote = f'{REMOTE_ROOT}/{rel}'
    parts = remote.rsplit('/', 1)[0].split('/')
    for i in range(2, len(parts) + 1):
        d = '/'.join(parts[:i])
        try:
            sftp.stat(d)
        except FileNotFoundError:
            sftp.mkdir(d)
    sftp.put(local, remote)
    uploaded += 1
sftp.close()
print(f"uploaded {uploaded} files")

print("=== 4) delete stale tracked files (مثل upkeep.ts حذف‌شده) ===")
# فایل‌های زیر src/ و prisma/ و scripts/ روی سرور که در HEAD وجود ندارند باید حذف شوند
remote_list_cmd = ("cd /www/wwwroot/vodda/bashar && find src prisma scripts -type f 2>/dev/null | sort")
_, server_files, _ = run(remote_list_cmd, show=False)
server_set = set(x for x in server_files.splitlines() if x.strip())
keep = set(files)
stale = sorted(server_set - keep)
print(f"stale files to remove: {len(stale)}")
for f in stale:
    run(f"rm -f '/www/wwwroot/vodda/bashar/{f}'", show=False)
if stale:
    print("removed:", ", ".join(stale[:8]), "..." if len(stale) > 8 else "")

print("=== 5) verify server env (compose .env) ===")
run("grep -oE '^(SESSION_SECRET|BASHAR_EITAA_TOKEN|BASHAR_EITAA_CHANNEL)=' /www/wwwroot/vodda/.env 2>/dev/null || echo 'MISSING VARS'", show=True)

print("=== 6) docker build: runner + migrator ===")
rc, o, e = run("cd /www/wwwroot/vodda && docker build -q -t vodda-bashar:migrator bashar 2>&1 | tail -2", timeout=1500)
if rc != 0:
    print("BUILD FAILED (migrator/full) — نگه داشتن نسخه فعلی"); cli.close(); raise SystemExit(1)
rc, o, e = run("cd /www/wwwroot/vodda && docker build --target runner -q -t vodda-bashar:prod bashar 2>&1 | tail -2", timeout=1500)
if rc != 0:
    print("BUILD FAILED (runner) — نگه داشتن نسخه فعلی"); cli.close(); raise SystemExit(1)
run("docker images vodda-bashar --format '{{.Repository}}:{{.Tag}} {{.Size}}' | head -4")

print("=== 7) schema migration روی volume واقعی (افزودن preparedAt + canSendEitaa) ===")
run("docker run --rm -v bashar_bashar-db:/app/db -e DATABASE_URL=file:/app/db/custom.db vodda-bashar:migrator 2>&1 | tail -5", timeout=600)

print("=== 8) recreate container ===")
run(f"cd {REMOTE_APP} && docker compose -f docker-compose.deploy.yml up -d bashar 2>&1 | tail -3", timeout=300)

print("=== 9) health check ===")
healthy = False
for attempt in range(15):
    rc, o, _ = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3424/api/bootstrap --max-time 5", show=False)
    if o == '200':
        print(f"container healthy after ~{attempt*6}s")
        healthy = True
        break
    time.sleep(6)
if not healthy:
    print("!!! CONTAINER NOT HEALTHY — بررسی لازم"); cli.close(); raise SystemExit(1)

print("=== 10) live API QA ===")
run("curl -s -o /dev/null -w 'HOME:%{http_code}\\n' http://127.0.0.1:3424/ --max-time 10", show=False)
run("curl -s 'http://127.0.0.1:3424/api/app-version?current=12' --max-time 8 | head -c 150", show=False)
run("curl -s -c /tmp/bn_cookies.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' --max-time 8 | head -c 120", show=False)
run("curl -s -b /tmp/bn_cookies.txt -o /dev/null -w 'STATE_WITH_SESSION:%{http_code}\\n' http://127.0.0.1:3424/api/state --max-time 8", show=False)
run("curl -s -o /dev/null -w 'UPLOAD_ROUTE:%{http_code}\\n' http://127.0.0.1:3424/api/upload --max-time 8", show=False)
run("rm -f /tmp/bn_cookies.txt", show=False)
run("df -h / | tail -1", show=False)

cli.close()
print("MERGE DEPLOY DONE")
