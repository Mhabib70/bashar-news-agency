#!/usr/bin/env python3
# استقرار بسته‌های تعامل/اثر/ابزار روی ودا — دومرحله‌ای برای عبور از محدودیت زمانی
#   sync   : سینک tar کامل سورس + حذف فایل‌های قدیمی + بکاپ image
#   build  : شروع بیلد داکر به‌صورت detached (nohup) — فوراً برمی‌گردد
#   status : بررسی وضعیت بیلد
#   finish : migrator (بدون accept-data-loss) + up -d + health + QA زنده
import json, os, sys, time, io, tarfile, paramiko

CFG = '/home/z/my-project/upload/deploy.json'
LOCAL = '/home/z/my-project'
REMOTE_APP = '/www/wwwroot/vodda'
REMOTE_ROOT = '/www/wwwroot/vodda/bashar'
BUILD_LOG = '/tmp/bn-build.log'
SKIP_PREFIXES = ('apk/', 'public/apk/', '.env', 'node_modules/', '.next/', '.git/', 'db/', 'tool-results/', 'upload/', 'download/', 'skills/', '.turbo/')
PHASE = sys.argv[1] if len(sys.argv) > 1 else "sync"

cfg = json.load(open(CFG))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=900, show=True):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8', 'replace').strip()
    e = err.read().decode('utf-8', 'replace').strip()
    if show:
        print(f"$ {cmd}\n[rc={rc}] {o[-1000:]}")
        if e: print("[stderr]", e[-250:])
    return rc, o, e

if PHASE == "sync":
    print("=== 1) backup current image ===")
    run("docker tag vodda-bashar:prod vodda-bashar:backup-pre-packages 2>&1 || true", show=False)
    run("docker images vodda-bashar --format '{{.Repository}}:{{.Tag}}'", show=False)

    print("=== 2) tar-sync full tracked source ===")
    import subprocess
    tracked = subprocess.run(['git', 'ls-files'], cwd=LOCAL, capture_output=True, text=True).stdout.splitlines()
    files = [f for f in tracked if not any(f.startswith(p) for p in SKIP_PREFIXES)]
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tf:
        for rel in files:
            p = os.path.join(LOCAL, rel)
            if os.path.isfile(p):
                tf.add(p, arcname=rel)
    data = buf.getvalue()
    print(f"tar size: {len(data)//1024} KB, {len(files)} files")
    sftp = cli.open_sftp()
    with sftp.open('/tmp/bn-src.tgz', 'wb') as f:
        f.write(data)
    run("cd /www/wwwroot/vodda/bashar && tar xzf /tmp/bn-src.tgz && rm -f /tmp/bn-src.tgz && echo extracted", timeout=300)
    sftp.close()

    print("=== 3) delete stale files on server ===")
    keep = set(files)
    _, server_files, _ = run("cd /www/wwwroot/vodda/bashar && find src prisma scripts -type f 2>/dev/null | sort", show=False)
    stale = sorted(set(x for x in server_files.splitlines() if x.strip()) - keep)
    print(f"stale: {len(stale)}")
    for f in stale:
        run(f"rm -f '/www/wwwroot/vodda/bashar/{f}'", show=False)
    if stale: print("removed:", ", ".join(stale[:6]), "..." if len(stale) > 6 else "")

    print("=== 4) verify env ===")
    run("grep -oE '^(SESSION_SECRET|BASHAR_EITAA_TOKEN|BASHAR_EITAA_CHANNEL)=' /www/wwwroot/vodda/.env 2>/dev/null | sort -u || echo 'MISSING VARS'")
    run("ls /www/wwwroot/vodda/bashar/src/app/api/news/ && echo SYNC_DONE")

elif PHASE == "build":
    run("docker builder prune -f 2>&1 | tail -1", show=False)
    cmd = (f"cd /www/wwwroot/vodda && nohup sh -c "
           f"'docker build -q -t vodda-bashar:migrator bashar && "
           f"docker build --target runner -q -t vodda-bashar:prod bashar' "
           f"> {BUILD_LOG} 2>&1 & echo started")
    run(cmd)
    run(f"sleep 3; tail -2 {BUILD_LOG} 2>/dev/null; echo BUILD_STARTED")

elif PHASE == "status":
    rc, o, _ = run(f"tail -3 {BUILD_LOG} 2>/dev/null; echo ---; pgrep -f 'docker build' >/dev/null && echo RUNNING || echo NOT_RUNNING", show=False)
    print(o)

elif PHASE == "finish":
    print("=== 1) migrate schema on real volume (additive: pinHash, views, eitaaReactions, draft.*) ===")
    run("docker run --rm -v bashar_bashar-db:/app/db -e DATABASE_URL=file:/app/db/custom.db vodda-bashar:migrator 2>&1 | tail -4", timeout=600)

    print("=== 2) recreate container ===")
    run(f"cd {REMOTE_APP} && docker compose -f docker-compose.deploy.yml up -d bashar 2>&1 | tail -3", timeout=300)

    print("=== 3) health check ===")
    healthy = False
    for i in range(20):
        rc, o, _ = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3424/api/bootstrap --max-time 5", show=False)
        if o == '200':
            print(f"healthy after ~{i * 6}s"); healthy = True; break
        time.sleep(6)
    if not healthy:
        print("!!! NOT HEALTHY"); cli.close(); raise SystemExit(1)

    print("=== 4) live QA ===")
    run("curl -s -o /dev/null -w 'HOME:%{http_code}\\n' http://127.0.0.1:3424/ --max-time 10", show=False)
    run("curl -s 'http://127.0.0.1:3424/api/app-version?current=12' --max-time 8 | head -c 90", show=False)
    # ورود بدون PIN (ادمین سرور هنوز PIN ندارد) → نشست
    run("rm -f /tmp/bn_qa.txt; curl -s -c /tmp/bn_qa.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' --max-time 8 | head -c 120", show=False)
    run("curl -s -b /tmp/bn_qa.txt 'http://127.0.0.1:3424/api/news/calendar' --max-time 8 | head -c 120", show=False)
    run("curl -s -b /tmp/bn_qa.txt 'http://127.0.0.1:3424/api/news/feed?take=3' --max-time 8 | python3 -c \"import json,sys; d=json.load(sys.stdin); n=d['news'][0] if d['news'] else {}; print('feed_views_key:', 'views' in n, '| isWeekFeatured:', 'isWeekFeatured' in n)\"", show=False)
    run("curl -s -b /tmp/bn_qa.txt -X POST http://127.0.0.1:3424/api/news/view -H 'Content-Type: application/json' -d '{\"newsId\":1}' --max-time 8 | head -c 80", show=False)
    run("rm -f /tmp/bn_qa.txt", show=False)
    run("df -h / | tail -1", show=False)
    print("FINISH DONE")

cli.close()
