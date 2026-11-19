#!/usr/bin/env python3
# بررسی قطعی محتوای کانتینر در حال اجرا — آیا تم قرمز داخل ایمیج هست؟
import json, paramiko, base64

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def runb64(cmd):
    b64 = base64.b64encode(cmd.encode()).decode()
    full = f'echo {b64} | base64 -d | bash'
    _, o, e = cli.exec_command(full, timeout=90)
    rc = o.channel.recv_exit_status()
    out = o.read().decode('utf-8', 'replace').strip()
    err = e.read().decode('utf-8', 'replace').strip()
    print(f'[rc={rc}] {out[-1200:]}')
    if err:
        print('[err]', err[-300:])
    return out

print('=== 1) logo-mark in container public/ ===')
runb64('docker exec vodda-bashar-1 ls -la /app/public/img/ 2>/dev/null | head -20 || docker exec vodda-bashar-1 find / -name "logo-mark.png" -not -path "*/proc/*" 2>/dev/null | head -3')

print('=== 2) built CSS inside container: red vs old colors ===')
runb64('''docker exec vodda-bashar-1 sh -c 'CSS=$(find /app/.next -name "*.css" -path "*static*" 2>/dev/null | head -1); echo CSS=$CSS; if [ -n "$CSS" ]; then echo "b41a22 count: $(grep -c b41a22 $CSS)"; echo "old-blue 0ea5e9: $(grep -c 0ea5e9 $CSS)"; echo "old-green 166534: $(grep -c 166534 $CSS)"; echo "old-navy 1e3a8a: $(grep -c 1e3a8a $CSS)"; fi' ''')

print('=== 3) favicon in container layout ===')
runb64('''docker exec vodda-bashar-1 sh -c 'grep -o "z-cdn[^\\"]*" /app/.next/server/app/index.html 2>/dev/null | head -2; grep -rn "logo-mark\\|favicon" /app/src/app/layout.tsx 2>/dev/null | head -5' ''')

print('=== 4) server source dir state ===')
runb64('cd /www/wwwroot/vodda/bashar && ls -la public/img/logo-mark.png 2>/dev/null; grep -c "b41a22" src/app/globals.css 2>/dev/null; git log --oneline -1 2>/dev/null || echo "no git"')

cli.close()
