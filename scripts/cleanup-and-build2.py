#!/usr/bin/env python3
# پاک‌سازی دیسک + build فقط runner (اسکیما از قبل sync است) + up + QA
import json, paramiko, time
cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=900, show=True):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    if show:
        print(f"$ {cmd[:88]}\n[rc={rc}] {out.read().decode('utf-8','replace').strip()[-600:]}")
        e = err.read().decode('utf-8','replace').strip()
        if e: print("[stderr]", e[-200:])
    return rc

print("=== cleanup ===")
run("docker builder prune -af 2>&1 | tail -1", timeout=600)
run("docker rmi vodda-bashar:migrator 2>/dev/null; docker image prune -f 2>&1 | tail -1", timeout=300)
run("docker rmi vodda-bashar:backup-pre228 vodda-bashar:backup-pre-v3ui 2>/dev/null | tail -2", timeout=60)
run("journalctl --vacuum-size=100M 2>&1 | tail -1", timeout=120)
run("df -h / | tail -1")

script = r'''cat > /tmp/merge-deploy2.sh <<'EOF'
#!/bin/bash
exec > /tmp/merge-deploy2.log 2>&1
set -x
echo "=== BUILD2 START $(date) ==="
cd /www/wwwroot/vodda
docker builder prune -af 1>/dev/null 2>&1
docker build --target runner -q -t vodda-bashar:prod bashar || { echo "BUILD2_FAIL"; exit 1; }
echo "=== BUILD2 OK $(date) ==="
docker compose -f docker-compose.deploy.yml up -d bashar 2>&1 | tail -3
sleep 8
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3424/api/bootstrap --max-time 5)
  echo "health try $i: $code"
  [ "$code" = "200" ] && break
  sleep 6
done
echo "=== QA2 ==="
curl -s -o /dev/null -w 'HOME:%{http_code}\n' http://127.0.0.1:3424/ --max-time 10
curl -s -o /dev/null -w 'UPLOAD_ROUTE:%{http_code}\n' -X GET http://127.0.0.1:3424/api/upload --max-time 8
curl -s -o /dev/null -w 'APK:%{http_code}\n' -r 0-99 http://127.0.0.1:3424/apk/BasijNews-v2.8.0.apk --max-time 10
curl -s -c /tmp/c2.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{"phone":"09300500977"}' --max-time 8 | head -c 110; echo
curl -s -b /tmp/c2.txt -o /dev/null -w 'STATE:%{http_code}\n' http://127.0.0.1:3424/api/state --max-time 8
rm -f /tmp/c2.txt
df -h / | tail -1
echo "=== DEPLOY2 END $(date) ==="
EOF
chmod +x /tmp/merge-deploy2.sh
rm -f /tmp/merge-deploy2.log
nohup /tmp/merge-deploy2.sh > /dev/null 2>&1 &
echo "LAUNCHED2 $!"
'''
_, out, err = cli.exec_command("bash -c '" + script.replace("'", "'\\''") + "'", timeout=30)
print(out.read().decode(), err.read().decode())
cli.close()
print("CLEANUP+LAUNCH DONE")
