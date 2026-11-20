"""بررسی ساختار CSS و جدول‌های دیتابیس روی سرور"""
import paramiko, json

cfg = json.load(open("/home/z/my-project/upload/deploy.json"))
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg["ip"], username=cfg["username"], password=cfg["password"], timeout=25, allow_agent=False, look_for_keys=False)

cmds = [
    ("static tree", "docker exec vodda-bashar-1 sh -c 'ls .next/static/ 2>/dev/null; ls .next/standalone/.next/static 2>/dev/null | head -6'"),
    ("css anywhere", "docker exec vodda-bashar-1 sh -c 'find .next -name \"*.css\" 2>/dev/null | head -5'"),
    ("db tables", "docker exec vodda-bashar-1 sh -c 'sqlite3 /app/db/custom.db \".tables\" 2>/dev/null || python3 -c \"import sqlite3;c=sqlite3.connect(\\'/app/db/custom.db\\');print([r[0] for r in c.execute(\\'select name from sqlite_master where type=\\\"table\\\"\\')])\" 2>/dev/null'"),
    ("securitylog cols", "docker exec vodda-bashar-1 sh -c 'python3 -c \"import sqlite3;c=sqlite3.connect(\\'/app/db/custom.db\\');print(\\'SecurityLog:\\', [r[1] for r in c.execute(\\'pragma table_info(SecurityLog)\\')]);print(\\'User.active:\\', [r[1] for r in c.execute(\\'pragma table_info(User)\\')])\"'"),
]
for label, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode(errors="ignore").strip()
    err = stderr.read().decode(errors="ignore").strip()
    print(f"== {label} ==\n{out or '(خالی)'}{(' | ERR: ' + err[:200]) if err else ''}\n")
ssh.close()
