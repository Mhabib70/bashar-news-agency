#!/usr/bin/env python3
# استقرار کامل یک‌دستی — روی کامپیوتر کاربر (IP ایران) اجرا شود:
#   python3 scripts/deploy-full.py
# فازها: sync → build → رصد status (حداکثر ۲۰ دقیقه) → finish → QA لایو (HTTP + CSS)
# پیش‌نیاز: pip install paramiko  +  فایل upload/deploy.json (ip/username/password)
import json, os, re, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, 'upload', 'deploy.json')
SERVER_IP = json.load(open(CFG))['ip'] if os.path.exists(CFG) else '80.91.208.240'

def sh(phase, timeout=1200):
    print(f"\n========== فاز {phase} ==========", flush=True)
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'deploy-packages.py'), phase],
                       capture_output=True, text=True, timeout=timeout)
    out = (r.stdout or '') + (r.stderr or '')
    tail = out[-1800:]
    print(tail, flush=True)
    return r.returncode, out

def qa_live():
    print("\n========== QA لایو ==========", flush=True)
    base = f"http://{SERVER_IP}"
    ok = True
    # ۱) صفحهٔ اصلی
    try:
        html = urllib.request.urlopen(base + '/', timeout=15).read().decode('utf-8', 'replace')
        print(f"[OK] صفحهٔ اصلی: HTTP 200، طول {len(html)//1024}KB")
    except Exception as e:
        print(f"[خطا] صفحهٔ اصلی: {e}"); ok = False; html = ''
    # ۲) API
    try:
        urllib.request.urlopen(base + '/api/bootstrap', timeout=15)
        print("[OK] /api/bootstrap: 200")
    except Exception as e:
        print(f"[خطا] /api/bootstrap: {e}"); ok = False
    # ۳) CSS لایو: نبود v3-card قدیمی + حضور توکن Candy
    css_urls = re.findall(r'href="(/_next/static/[^"]+\.css)"', html)
    all_css = ''
    for u in css_urls[:6]:
        try:
            all_css += urllib.request.urlopen(base + u, timeout=15).read().decode('utf-8', 'replace')
        except Exception as e:
            print(f"[هشدار] CSS {u}: {e}")
    if not all_css:
        print("[هشدار] CSS لایو واکشی نشد — بعد از finish دوباره چک کنید")
    else:
        has_old = ('.v3-card' in all_css) or ('--v3-ink' in all_css)
        has_candy = 'surface-container-lowest' in all_css
        print(f"CSS: {len(css_urls)} فایل، {len(all_css)//1024}KB | کلاس قدیمی v3-card: {'هست ✗' if has_old else 'نیست ✓'} | توکن Candy: {'هست ✓' if has_candy else 'نیست ✗'}")
        if has_old or not has_candy:
            print("⇒ نسخهٔ لایو هنوز قدیمی است (استقرار انجام نشده یا CSS کش شده)"); ok = False
    return ok

def main():
    if not os.path.exists(CFG):
        print("فایل upload/deploy.json پیدا نشد — credential سرور لازم است."); sys.exit(2)
    print(f"استقرار کامل از این ماشین به {SERVER_IP} شروع می‌شود...")
    rc, out = sh('sync', timeout=900)
    if rc != 0 or 'SYNC_DONE' not in out:
        if 'timed out' in out or 'TimeoutError' in out:
            print("\n✗ پورت ۲۲ از این ماشین هم بلاک است — از پنل هاستینگ (ودا) فایروال/پورت ۲۲ را باز کنید یا با پشتیبانی تماس بگیرید.")
        sys.exit(1)
    rc, out = sh('build', timeout=120)
    if rc != 0:
        print("\n✗ شروع بیلد ناموفق بود."); sys.exit(1)
    # رصد بیلد
    deadline = time.time() + 20 * 60
    while time.time() < deadline:
        time.sleep(90)
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'deploy-packages.py'), 'status'],
                           capture_output=True, text=True, timeout=60)
        print(f"[status] {(r.stdout or '').strip()[-160:]}", flush=True)
        if 'NOT_RUNNING' in r.stdout:
            print("بیلد تمام شد."); break
    else:
        print("✗ بیلد بعد از ۲۰ دقیقه تمام نشد — بعداً با 'status' چک کنید."); sys.exit(1)
    rc, out = sh('finish', timeout=1800)
    if rc != 0 or 'FINISH DONE' not in out:
        print("\n✗ فاز finish ناموفق بود — خروجی بالا را بررسی کنید."); sys.exit(1)
    if qa_live():
        print("\n✓✓ استقرار Candy کامل و تایید شد — نسخهٔ لایو جدید است.")
    else:
        print("\n⚠ استقرار انجام شد اما QA لایو کامل پاس نشد — خروجی بالا را ببینید.")
        sys.exit(1)

if __name__ == '__main__':
    main()
