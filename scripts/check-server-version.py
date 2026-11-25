#!/usr/bin/env python3
"""بررسی نسخهٔ کد مستقر روی سرور 80.91.208.240 — آیا آخرین کامیت‌ها deploy شده‌اند؟"""
import paramiko, sys, json

CFG = '/home/z/my-project/upload/deploy.json'
cfg = json.load(open(CFG))
HOST = cfg['ip']
USER = cfg['username']
PASSWORD = cfg['password']

def run(ssh, cmd):
    _, out, err = ssh.exec_command(cmd, timeout=30)
    return out.read().decode(errors="replace").strip()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
except Exception as e:
    print("CONNECT_FAIL:", e); sys.exit(1)

print("== ایمیج فعال کانتینر ==")
print(run(ssh, "docker ps --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i bashar"))
print("\n== آخرین کامیت داخل ایمیج prod (فایل build-info) ==")
print(run(ssh, "docker exec vodda-bashar-1 cat /app/BUILD_INFO 2>/dev/null || echo 'NO_BUILD_INFO'"))
print("\n== رشتهٔ تم Candy در CSS لایو (متغیر primary) ==")
print(run(ssh, "docker exec vodda-bashar-1 sh -c \"grep -o '9d4139' /app/.next/static/css/*.css 2>/dev/null | head -2 || echo NONE\""))
print("\n== رشتهٔ کلاس جدید surface-container در CSS لایو ==")
print(run(ssh, "docker exec vodda-bashar-1 sh -c \"grep -lo 'surface-container-lowest' /app/.next/static/css/*.css 2>/dev/null | head -2 || echo NONE\""))
print("\n== رشتهٔ استوری (نباید باشد) ==")
print(run(ssh, "docker exec vodda-bashar-1 sh -c \"grep -c 'استوری خبرنگاران' /app/.next/server/app/page.js 2>/dev/null | head -1 || echo CHECK_MANUAL\""))
print("\n== دیسک ==")
print(run(ssh, "df -h / | tail -1"))
ssh.close()
