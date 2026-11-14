#!/usr/bin/env python3
# سینک کامل و سریع سورس HEAD به سرور: یک tar → استخراج سمت سرور → حذف فایل‌های اضافی → تأیید md5
import json, os, subprocess, paramiko, hashlib

CFG_PATH = '/home/z/my-project/upload/deploy.json'
LOCAL_ROOT = '/home/z/my-project'
REMOTE_ROOT = '/www/wwwroot/vodda/bashar'
SKIP_PREFIXES = ('apk/', 'public/apk/', '.env')

cfg = json.load(open(CFG_PATH))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
            timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=600, show=True):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    o = out.read().decode('utf-8','replace').strip()
    e = err.read().decode('utf-8','replace').strip()
    if show:
        print(f"$ {cmd[:90]}\n[rc={rc}] {o[-700:]}")
        if e: print("[stderr]", e[-250:])
    return rc, o, e

tracked = subprocess.run(['git', 'ls-files'], cwd=LOCAL_ROOT, capture_output=True, text=True).stdout.splitlines()
files = [f for f in tracked if not any(f.startswith(p) for p in SKIP_PREFIXES) and os.path.isfile(os.path.join(LOCAL_ROOT, f))]
print(f"files to sync: {len(files)}")

# ساخت tar محلی
manifest = '/tmp/merge-sync-files.txt'
with open(manifest, 'w') as f:
    f.write('\n'.join(files))
tar_path = '/tmp/merge-sync.tgz'
subprocess.run(['tar', 'czf', tar_path, '-C', LOCAL_ROOT, '-T', manifest], check=True)
size = os.path.getsize(tar_path)
print(f"tar built: {size/1024/1024:.1f} MB")

print("=== upload tar + extract ===")
sftp = cli.open_sftp()
sftp.put(tar_path, '/tmp/merge-sync.tgz')
sftp.close()
run("cd /www/wwwroot/vodda/bashar && tar xzf /tmp/merge-sync.tgz && echo EXTRACT_OK")
run("rm -f /tmp/merge-sync.tgz " + manifest, show=False)

print("=== delete stale files (در src/prisma/scripts/public که در HEAD نیستند) ===")
keep = set(files)
_, out, _ = run("cd /www/wwwroot/vodda/bashar && find src prisma scripts public -type f 2>/dev/null | sort", show=False)
server_set = set(x for x in out.splitlines() if x.strip())
stale = sorted(server_set - keep)
# محافظت: هیچ‌چیز زیر public/uploads حذف نشود (مگر مسیر bind-mount بیرونی باشد)
stale = [x for x in stale if not x.startswith('public/uploads')]
print(f"stale: {len(stale)} -> {stale[:10]}")
for f in stale:
    run(f"rm -f '/www/wwwroot/vodda/bashar/{f}'", show=False)

print("=== md5 verify sample ===")
sample = ['src/app/globals.css', 'src/components/app/home.tsx', 'src/components/app/social.tsx',
          'src/lib/store.ts', 'package.json', 'next.config.ts', 'prisma/schema.prisma',
          'src/lib/server/session.ts', 'src/components/app/submit-flow.tsx']
ok = 0
for rel in sample:
    local_md5 = hashlib.md5(open(os.path.join(LOCAL_ROOT, rel), 'rb').read()).hexdigest()
    _, out, _ = run(f"md5sum '/www/wwwroot/vodda/bashar/{rel}'", show=False)
    remote_md5 = out.split()[0] if out.split() else 'MISSING'
    status = 'OK' if local_md5 == remote_md5 else 'MISMATCH!'
    if local_md5 == remote_md5: ok += 1
    print(f"  {rel}: {status}")
print(f"{ok}/{len(sample)} verified")
run("grep -c 'v3-navy' /www/wwwroot/vodda/bashar/src/app/globals.css")
run("ls /www/wwwroot/vodda/bashar/src/lib/server/upkeep.ts 2>&1 | tail -1")

os.remove(tar_path)
cli.close()
print("SYNC DONE")
