"""بررسی زندهٔ لاگ بیلد و وضعیت ایمیج روی سرور (کانفیگ از upload/deploy.json)"""
import paramiko, json

cfg = json.load(open("/home/z/my-project/upload/deploy.json"))
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg["ip"], username=cfg["username"], password=cfg["password"], timeout=25, allow_agent=False, look_for_keys=False)

cmds = [
    ("build-log tail", "tail -4 /tmp/bn-build.log 2>/dev/null"),
    ("build procs", "ps aux | grep -E 'docker build|buildx' | grep -v grep | head -3"),
    ("images", "docker images vodda-bashar --format '{{.Tag}} {{.CreatedSince}}' | head -6"),
    ("disk", "df -h / | tail -1"),
]
for label, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=40)
    out = stdout.read().decode(errors="ignore").strip()
    print(f"== {label} ==\n{out or '(خالی)'}\n")
ssh.close()
