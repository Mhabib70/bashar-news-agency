#!/usr/bin/env python3
# بررسی زندهٔ تم قرمز/سفید روی سرور وودا
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=60):
    _, o, e = cli.exec_command(cmd, timeout=t)
    rc = o.channel.recv_exit_status()
    print(f"$ {cmd[:80]}\n[rc={rc}]", o.read().decode('utf-8', 'replace').strip()[-800:])
    err = e.read().decode('utf-8', 'replace').strip()
    if err:
        print("[err]", err[-200:])
    return rc, o, e

run("docker images vodda-bashar --format '{{.Repository}}:{{.Tag}}  {{.CreatedAt}}  {{.Size}}'")
run('curl -s http://127.0.0.1:3424/ | grep -o "/_next/static/css/[^\"]*\.css" | head -2')

# extract css url then probe colors
_, out, _ = run('CSS=$(curl -s http://127.0.0.1:3424/ | grep -o "/_next/static/css/[^\"]*\.css" | head -1); echo "CSSURL=$CSS"; curl -s "http://127.0.0.1:3424$CSS" > /tmp/live.css; echo "size=$(wc -c < /tmp/live.css)"; echo "-- red b41a22:"; grep -c "b41a22" /tmp/live.css; echo "-- old brand colors (should be 0):"; grep -c "0ea5e9" /tmp/live.css || true; grep -c "166534" /tmp/live.css || true; grep -c "1e3a8a" /tmp/live.css || true')
print(out.read().decode('utf-8', 'replace'))

run('curl -s http://127.0.0.1:3424/logo.svg | head -c 300; echo')
run('curl -s http://127.0.0.1:3424/img/logo-mark.png -o /dev/null -w "logo-mark.png: %{http_code} %{size_download}B\\n"')
run('curl -s http://127.0.0.1:3424/api/health')
cli.close()
