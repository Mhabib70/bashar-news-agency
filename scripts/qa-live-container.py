"""QA لایو از داخل کانتینر: فایل CSS بیلدشده + APIهای جدید"""
import paramiko, json

cfg = json.load(open("/home/z/my-project/upload/deploy.json"))
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg["ip"], username=cfg["username"], password=cfg["password"], timeout=25, allow_agent=False, look_for_keys=False)

cmds = [
    ("css files", "docker exec vodda-bashar-1 sh -c 'ls .next/static/css/*.css 2>/dev/null | head -3'"),
    ("candy colors", "docker exec vodda-bashar-1 sh -c 'for c in 9d423a fff8f6 ffe9e4 3e6473 00687d; do printf \"%s: \" $c; cat .next/static/css/*.css | grep -c $c || true; done'"),
    ("container start", "docker inspect vodda-bashar-1 --format '{{.State.Status}} started={{.State.StartedAt}}'"),
    ("image tag", "docker inspect vodda-bashar-1 --format '{{.Config.Image}}'"),
    ("security-log api", "curl -s -o /dev/null -w '%{http_code}' -b /tmp/bn_qa.txt http://127.0.0.1:3424/api/security-log --max-time 8"),
    ("login+stats", "rm -f /tmp/bn_qa.txt; curl -s -c /tmp/bn_qa.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' --max-time 8 | head -c 80; echo; curl -s -b /tmp/bn_qa.txt http://127.0.0.1:3424/api/admin/stats --max-time 8 | head -c 200"),
    ("feed", "curl -s -b /tmp/bn_qa.txt 'http://127.0.0.1:3424/api/news/feed?take=2' --max-time 8 | head -c 120"),
]
for label, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode(errors="ignore").strip()
    err = stderr.read().decode(errors="ignore").strip()
    print(f"== {label} ==\n{out or '(خالی)'}{(' | ERR: ' + err) if err else ''}\n")
ssh.close()
