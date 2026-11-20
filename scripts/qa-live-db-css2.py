"""بررسی رنگ‌های CSS و جدول‌های دیتابیس — نسخهٔ بدون نقل‌قول تو در تو"""
import paramiko, json

cfg = json.load(open("/home/z/my-project/upload/deploy.json"))
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg["ip"], username=cfg["username"], password=cfg["password"], timeout=25, allow_agent=False, look_for_keys=False)

PY_DB = r'''
import sqlite3
c = sqlite3.connect("/tmp/chk.db")
tables = [r[0] for r in c.execute("select name from sqlite_master where type='table'")]
print("SecurityLog:", "SecurityLog" in tables)
cols = [r[1] for r in c.execute("pragma table_info(User)")]
print("User.active:", "active" in cols, "| User.lead؟ News:", end=" ")
ncols = [r[1] for r in c.execute("pragma table_info(NewsItem)")]
print("lead" in ncols)
'''

cmds = [
    ("candy colors in css", "docker exec vodda-bashar-1 sh -c 'cd .next/static/chunks && for c in 9d423a fff8f6 ffe9e4 3e6473 00687d; do printf \"%s:\" $c; grep -o $c *.css | wc -l; done'"),
    ("copy db", "docker cp vodda-bashar-1:/app/db/custom.db /tmp/chk.db && ls -la /tmp/chk.db"),
    ("db schema", f'''python3 - <<'PYEOF'
{PY_DB}
PYEOF'''),
]
for label, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode(errors="ignore").strip()
    err = stderr.read().decode(errors="ignore").strip()
    print(f"== {label} ==\n{out or '(خالی)'}{(' | ERR: ' + err[:200]) if err else ''}\n")
ssh.close()
