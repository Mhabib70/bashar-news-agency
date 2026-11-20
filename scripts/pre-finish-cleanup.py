"""پاکسازی سریع کش بیلد برای آزادسازی دیسک قبل از finish"""
import paramiko, json

cfg = json.load(open("/home/z/my-project/upload/deploy.json"))
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg["ip"], username=cfg["username"], password=cfg["password"], timeout=25, allow_agent=False, look_for_keys=False)

for label, cmd in [
    ("builder prune", "docker builder prune -f 2>&1 | tail -1"),
    ("dangling images", "docker image prune -f 2>&1 | tail -1"),
    ("disk after", "df -h / | tail -1"),
]:
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    print(f"== {label} ==\n{stdout.read().decode(errors='ignore').strip()}\n")
ssh.close()
