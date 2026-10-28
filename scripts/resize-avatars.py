# برش مربعی + تبدیل آواتارها به JPG 400px (سبک برای اپ)
import os
from PIL import Image

SRC = "/home/z/my-project/public/img/avatars"
for f in sorted(os.listdir(SRC)):
    if not f.endswith(".png"):
        continue
    p = os.path.join(SRC, f)
    im = Image.open(p).convert("RGB")
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2)).resize((400, 400), Image.LANCZOS)
    out = os.path.join(SRC, f[:-4] + ".jpg")
    im.save(out, "JPEG", quality=85, optimize=True)
    os.remove(p)
    print(f"{f} -> {os.path.basename(out)}  {os.path.getsize(out)//1024}KB")
