#!/usr/bin/env python3
# اسکن هدفمند پورت‌های ورود جایگزین روی سرور (SSH جایگزین / پنل وب) — فقط پورت‌های شناخته‌شدهٔ مدیریتی
import socket, concurrent.futures as cf

IP = "80.91.208.240"
PORTS = [
    # SSH جایگزین
    22, 222, 2022, 2222, 6022, 10022, 22022, 22222, 65022,
    # پنل‌های وب مدیریتی
    888, 8443, 8899, 9090, 9999, 10000, 20000, 8090, 7800, 10086,
    2082, 2083, 2086, 2087, 2089, 3690, 5985,
    # سرویس‌های اپ
    443, 3000, 3001, 3424, 5000, 8000, 8001, 9000, 9001, 8081, 8082, 8083, 8084, 8085,
    # دیتابیس (فقط برای دانش وضعیت)
    3306, 5432, 6379, 27017,
]
TIMEOUT = 1.8

def probe(p):
    s = socket.socket()
    s.settimeout(TIMEOUT)
    try:
        s.connect((IP, p))
        banner = b""
        try:
            s.settimeout(1.5)
            banner = s.recv(128)  # SSH بنر می‌فرستد؛ nginx صبر می‌کند
        except Exception:
            pass
        s.close()
        return p, banner[:80]
    except Exception:
        return None

open_ports = []
with cf.ThreadPoolExecutor(max_workers=16) as ex:
    for r in ex.map(probe, PORTS):
        if r:
            p, b = r
            open_ports.append(p)
            print(f"OPEN {p}  banner={b!r}")

print("-----")
print("open:", open_ports if open_ports else "هیچ")
