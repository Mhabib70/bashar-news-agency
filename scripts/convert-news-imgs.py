# تبدیل عکس‌های خام PNG به JPG بهینه برای public/img/news
from PIL import Image
from pathlib import Path

src = Path("/home/z/my-project/scripts/raw-img")
dst = Path("/home/z/my-project/public/img/news")
dst.mkdir(parents=True, exist_ok=True)

for p in sorted(src.glob("*.png")):
    im = Image.open(p).convert("RGB")
    # کاهش عرض به 1100px برای وب موبایل
    if im.width > 1100:
        im = im.resize((1100, int(im.height * 1100 / im.width)), Image.LANCZOS)
    out = dst / (p.stem + ".jpg")
    im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    print(out.name, out.stat().st_size // 1024, "KB")
