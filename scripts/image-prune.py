#!/usr/bin/env python3
# حذف ایمن تگ‌های قدیمی پروژه‌ها — نگه‌داشتن prod و rollback هر پروژه
import json, paramiko

cfg = json.load(open('/home/z/my-project/upload/deploy.json'))
cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(cfg['ip'], username=cfg['username'], password=cfg['password'], timeout=25, allow_agent=False, look_for_keys=False)

def run(cmd, t=300):
    _, o, e = cli.exec_command(cmd, timeout=t)
    rc = o.channel.recv_exit_status()
    out = o.read().decode('utf-8', 'replace').strip()
    print(f"$ {cmd[:100]}\n[rc={rc}]", out[-1600:])
    err = e.read().decode('utf-8', 'replace').strip()
    if err:
        print('[err]', err[-200:])
    return out

print('=== images with created dates ===')
out = run("docker images --format '{{.Repository}}:{{.Tag}}|{{.CreatedAt}}|{{.ID}}' | sort")
images = [l.split('|') for l in out.splitlines() if l and '<none>' not in l]

# keep list: any tag containing prod / rollback / latest; keep newest 2 versioned per repo
KEEP_PAT = ('prod', 'rollback', 'latest', 'alpine', 'mysql', 'caddy', 'coturn', 'node:', 'poster')
by_repo = {}
for repo, date, iid in images:
    by_repo.setdefault(repo.rsplit(':', 1)[0], []).append((repo, date, iid))

to_delete = []
for repo, tags in by_repo.items():
    ver = [t for t in tags if not any(k in t[0] for k in KEEP_PAT)]
    ver.sort(key=lambda t: t[1], reverse=True)
    for t in ver[2:]:  # keep 2 newest versioned tags per repo
        to_delete.append(t[0])

print('\n=== to delete ({} tags) ==='.format(len(to_delete)))
for t in to_delete:
    print(' ', t)
if to_delete:
    run('docker rmi ' + ' '.join(to_delete) + ' 2>&1 | tail -3')

print('=== prune build cache + dangling ===')
run('docker builder prune -f 2>&1 | tail -1')
run('docker image prune -f 2>&1 | tail -1')

print('=== disk now ===')
run('df -h / | tail -1')

cli.close()
