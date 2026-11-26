#!/usr/bin/env python3
# اسکن کامل پورت‌های TCP سرور (سرور خود کاربر) برای یافتن در ور جایگزین SSH/پنل
# فقط CONNECT می‌زنیم؛ برای پورت‌های باز بنر کوتاه می‌خوانیم تا سرویس شناسایی شود
import socket, concurrent.futures as cf

IP = "80.91.208.240"
TIMEOUT = 0.9
WORKERS = 400
SKIP = {80, 8080, 8090}  # اینها را می‌دانیم (اپ)

def probe(p):
    s = socket.socket()
    s.settimeout(TIMEOUT)
    try:
        s.connect((IP, p))
    except Exception:
        return None
    banner = b""
    try:
        s.settimeout(1.2)
        banner = s.recv(96)
    except Exception:
        pass
    finally:
        s.close()
    return p, banner

found = []
with cf.ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futs = {ex.submit(probe, p): p for p in range(1, 65536) if p not in SKIP}
    done = 0
    for f in cf.as_completed(futs):
        done += 1
        if done % 8000 == 0:
            print(f"...{done}/65532 scanned", flush=True)
        r = f.result()
        if r:
            found.append(r)

print("----- OPEN PORTS -----")
for p, b in sorted(found):
    print(f"{p}: {b!r}")
print("total:", len(found))
