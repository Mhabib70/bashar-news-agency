#!/usr/bin/env python3
# ساخت و استقرار سمت سرور با nohup — مستقل از اتصال SSH
import json, paramiko
cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

script = r'''cat > /tmp/merge-deploy.sh <<'EOF'
#!/bin/bash
exec > /tmp/merge-deploy.log 2>&1
set -x
echo "=== BUILD START $(date) ==="
cd /www/wwwroot/vodda
docker build -q -t vodda-bashar:migrator bashar || { echo "BUILD_FAIL_MIGRATOR"; exit 1; }
docker build --target runner -q -t vodda-bashar:prod bashar || { echo "BUILD_FAIL_RUNNER"; exit 1; }
echo "=== BUILD OK $(date) ==="
echo "=== MIGRATE ==="
docker run --rm -v bashar_bashar-db:/app/db -e DATABASE_URL=file:/app/db/custom.db vodda-bashar:migrator 2>&1 | tail -6
echo "=== UP ==="
docker compose -f docker-compose.deploy.yml up -d bashar 2>&1 | tail -3
sleep 8
echo "=== HEALTH ==="
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3424/api/bootstrap --max-time 5)
  echo "health try $i: $code"
  [ "$code" = "200" ] && break
  sleep 6
done
echo "=== QA ==="
curl -s -o /dev/null -w 'HOME:%{http_code}\n' http://127.0.0.1:3424/ --max-time 10
curl -s 'http://127.0.0.1:3424/api/app-version?current=12' --max-time 8 | head -c 120; echo
curl -s -c /tmp/bnc.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{"phone":"09300500977"}' --max-time 8 | head -c 130; echo
curl -s -b /tmp/bnc.txt -o /dev/null -w 'STATE_WITH_SESSION:%{http_code}\n' http://127.0.0.1:3424/api/state --max-time 8
rm -f /tmp/bnc.txt
df -h / | tail -1
echo "=== MERGE DEPLOY SCRIPT END $(date) ==="
EOF
chmod +x /tmp/merge-deploy.sh
rm -f /tmp/merge-deploy.log
nohup /tmp/merge-deploy.sh > /dev/null 2>&1 &
echo "LAUNCHED PID $!"
'''
_, out, err = cli.exec_command("bash -c '" + script.replace("'", "'\\''") + "'", timeout=30)
print(out.read().decode(), err.read().decode())
cli.close()
print("LAUNCH DONE — poll /tmp/merge-deploy.log")
