#!/usr/bin/env python3
# بررسی دقیق: لاگ مهاجرت + چک ستون‌ها با فایل js موقت داخل کانتینر
import json, paramiko
cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=90, show=True):
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    rc = out.channel.recv_exit_status()
    if show:
        print(f"$ {cmd[:80]}\n[rc={rc}] {out.read().decode('utf-8','replace').strip()[-900:]}")
        e = err.read().decode('utf-8','replace').strip()
        if e: print("[stderr]", e[-250:])
    return rc

print("=== full deploy log: MIGRATE section ===")
run("sed -n '/=== MIGRATE ===/,/=== UP ===/p' /tmp/merge-deploy.log")

print("=== column check via temp js file ===")
check_js = """const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
(async()=>{
  const ni=await p.$queryRawUnsafe('PRAGMA table_info(NewsItem)');
  console.log('NewsItem.preparedAt:', ni.some(x=>x.name==='preparedAt'));
  const u=await p.$queryRawUnsafe('PRAGMA table_info(User)');
  console.log('User.canSendEitaa:', u.some(x=>x.name==='canSendEitaa'));
  console.log('users:', await p.user.count());
  console.log('news:', await p.newsItem.count());
  await p.$disconnect();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)})"""
sftp = cli.open_sftp()
with sftp.open('/tmp/dbcheck.js', 'w') as f:
    f.write(check_js)
sftp.close()
run("docker cp /tmp/dbcheck.js vodda-bashar-1:/tmp/dbcheck.js && docker exec vodda-bashar-1 node /tmp/dbcheck.js", timeout=90)
run("rm -f /tmp/dbcheck.js", show=False)
cli.close()
print("VERIFY DONE")
