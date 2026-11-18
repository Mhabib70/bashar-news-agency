#!/usr/bin/env python3
# QA زندهٔ ۱۲ اصلاح روی ودا
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, label=""):
    _, out, err = cli.exec_command(cmd, timeout=60)
    rc = out.channel.recv_exit_status()
    print(f"### {label or cmd[:50]}\n[rc={rc}] {out.read().decode('utf-8','replace').strip()[:420]}")
    return rc, out

# ۰) ورود ادمین
run("rm -f /tmp/qa12.txt; curl -s -c /tmp/qa12.txt -X POST http://127.0.0.1:3424/api/login -H 'Content-Type: application/json' -d '{\"phone\":\"09300500977\"}' | head -c 60", "LOGIN")

# ۱) ستون‌های جدید در دیتابیس (مهاجرت اعمال شد؟)
run("docker exec vodda-bashar-1 node -e \"const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();(async()=>{const u=await db.user.findFirst({select:{canManageContent:true}});console.log('canManageContent col:',typeof u.canManageContent);await db.externalContact.count().then(c=>console.log('ExternalContact table OK, rows:',c));await db.\\$disconnect()})()\"", "SCHEMA (canManageContent + ExternalContact)")

# ۲) خروجی‌ها — نشست‌محور
run("curl -s -b /tmp/qa12.txt -o /dev/null -w 'export users:%{http_code} ' 'http://127.0.0.1:3424/api/export?type=users'; curl -s -b /tmp/qa12.txt -o /dev/null -w 'news:%{http_code} ' 'http://127.0.0.1:3424/api/export?type=news'; curl -s -b /tmp/qa12.txt -o /dev/null -w 'districts:%{http_code}\\n' 'http://127.0.0.1:3424/api/export?type=districts'", "EXPORTS")

# ۳) مخاطبان: create → list → delete
run("curl -s -b /tmp/qa12.txt -X POST http://127.0.0.1:3424/api/contacts -H 'Content-Type: application/json' -d '{\"action\":\"create\",\"fullName\":\"تست رسانه\",\"mediaName\":\"روزنامه گیلان\",\"phone\":\"09121112233\"}' | head -c 80", "CONTACT create")
run("curl -s -b /tmp/qa12.txt http://127.0.0.1:3424/api/contacts | python3 -c \"import json,sys; d=json.load(sys.stdin); print('list:',len(d['contacts']),'| sms:',d['smsConfigured'],'| eitaa:',d['eitaaConfigured'])\"", "CONTACT list")
run("CID=$(curl -s -b /tmp/qa12.txt http://127.0.0.1:3424/api/contacts | python3 -c \"import json,sys; print(json.load(sys.stdin)['contacts'][0]['id'])\"); curl -s -b /tmp/qa12.txt -X POST http://127.0.0.1:3424/api/contacts -H 'Content-Type: application/json' -d \"{\\\"action\\\":\\\"delete\\\",\\\"id\\\":$CID}\" | head -c 60", "CONTACT delete")

# ۴) تالار: افتخارات بدون ادمین + viewer flag
run("curl -s -b /tmp/qa12.txt http://127.0.0.1:3424/api/forum | python3 -c \"import json,sys; d=json.load(sys.stdin); print('viewer.canManageContent:', d['viewer'].get('canManageContent'), '| honor roles:', [h['role'] for h in d.get('honorBoard',[])])\"", "FORUM honor+perm")

# ۵) آموزش: viewer flag
run("curl -s -b /tmp/qa12.txt http://127.0.0.1:3424/api/training | python3 -c \"import json,sys; d=json.load(sys.stdin); print('training canManageContent:', d['viewer'].get('canManageContent'))\"", "TRAINING perm")

# ۶) پیام همگانی هدفمند (کارشناس‌ها)
run("curl -s -b /tmp/qa12.txt -X POST http://127.0.0.1:3424/api/broadcast -H 'Content-Type: application/json' -d '{\"title\":\"تست هدفمند\",\"text\":\"تست ارسال به کارشناس‌ها — نادیده بگیرید\",\"targets\":{\"roles\":[\"specialist\"]}}' | head -c 130", "BROADCAST targeted")
run("curl -s -b /tmp/qa12.txt -X POST http://127.0.0.1:3424/api/broadcast -H 'Content-Type: application/json' -d '{\"title\":\"تست همگانی\",\"text\":\"تست ارسال به همه — نادیده بگیرید\"}' | head -c 100", "BROADCAST all")

# ۷) کاربران: PATCH (خود ادمین، بدون تغییر واقعی)
run("MID=$(curl -s -b /tmp/qa12.txt http://127.0.0.1:3424/api/state | python3 -c \"import json,sys; print(json.load(sys.stdin)['user']['id'])\"); MNAME=$(curl -s -b /tmp/qa12.txt http://127.0.0.1:3424/api/state | python3 -c \"import json,sys; print(json.load(sys.stdin)['user']['fullName'])\"); python3 -c \"import json,sys; print(json.dumps({'id':sys.argv[1],'fullName':sys.argv[2]}))\" $MID \\\"$MNAME\\\" | curl -s -b /tmp/qa12.txt -X PATCH http://127.0.0.1:3424/api/users -H 'Content-Type: application/json' -d @- | head -c 80", "USER PATCH")

# ۸) بررسی اخبار: همه اخبار با جستجو
run("curl -s -b /tmp/qa12.txt 'http://127.0.0.1:3424/api/news/all' | python3 -c \"import json,sys; d=json.load(sys.stdin); from collections import Counter; print('all:',len(d['news']),Counter(n['status'] for n in d['news']))\"", "REVIEW all-news")
run("curl -s -b /tmp/qa12.txt 'http://127.0.0.1:3424/api/news/all?q=%D8%B1%D8%B4%D8%AA' | python3 -c \"import json,sys; print('search رشت:',len(json.load(sys.stdin)['news']))\"", "REVIEW search")

run("rm -f /tmp/qa12.txt", "cleanup")
cli.close()
print("LIVE QA DONE")
