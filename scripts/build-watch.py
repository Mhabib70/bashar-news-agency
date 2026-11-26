#!/usr/bin/env python3
"""رصد بیلد داکر روی سرور تا اتمام (RUNNING → NOT_RUNNING)"""
import paramiko, time, sys

MAX_MIN = int(sys.argv[1]) if len(sys.argv) > 1 else 20

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect('80.91.208.240', port=4444, username='root', password='JSiB0e975u', timeout=20, allow_agent=False, look_for_keys=False)

start = time.time()
while True:
    _, out, _ = cli.exec_command('pgrep -f "docker build" >/dev/null && echo RUNNING || echo NOT_RUNNING; echo ---; tail -3 /tmp/bn-build.log 2>/dev/null', timeout=30)
    txt = out.read().decode().strip()
    mins = int((time.time() - start) / 60)
    print(f"[{mins}m] {txt.replace(chr(10), ' | ')}", flush=True)
    if 'NOT_RUNNING' in txt:
        print("BUILD FINISHED")
        break
    if mins >= MAX_MIN:
        print("TIMEOUT")
        break
    time.sleep(60)
cli.close()
