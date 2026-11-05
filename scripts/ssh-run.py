#!/usr/bin/env python3
# اجرای امن دستور روی سرور ودا (paramiko) — اعتبارنامه فقط از upload/deploy.json خوانده و چاپ نمی‌شود
import json, sys, paramiko

CFG = '/home/z/my-project/upload/deploy.json'

def main():
    cmd = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    cfg = json.load(open(CFG))
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'],
                timeout=20, banner_timeout=20, auth_timeout=20,
                allow_agent=False, look_for_keys=False)
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    code = stdout.channel.recv_exit_status()
    cli.close()
    if out:
        print(out, end='' if out.endswith('\n') else '\n')
    if err:
        print('[stderr]', err.strip()[:2000], file=sys.stderr)
    sys.exit(code)

if __name__ == '__main__':
    main()
