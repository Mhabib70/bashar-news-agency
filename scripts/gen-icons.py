#!/usr/bin/env python3
"""تولید آیکون‌های لانچر اندروید از لوگوی خبرگزاری بشر"""
from PIL import Image, ImageDraw, ImageOps

SRC = "/home/z/my-project/public/img/agency-logo.png"
OUT = "/home/z/my-project/android/res"

src = Image.open(SRC).convert("RGBA")

# مربع‌سازی (پیش‌فرض ۵۱۲×۵۱۲ است)
side = min(src.size)
src = src.crop(((src.width - side) // 2, (src.height - side) // 2,
                (src.width + side) // 2, (src.height + side) // 2))

SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

def circle_icon(size: int) -> Image.Image:
    """لوگو داخل دایره با پس‌زمینه تیره — برای آیکون گرد و مدرن"""
    scale = 4
    s = size * scale
    # پس‌زمینه تیره گرادیانی
    canvas = Image.new("RGBA", (s, s), (6, 7, 4, 255))
    # لوگو با کمی حاشیه (۸۶٪)
    inner = int(s * 0.86)
    logo = src.resize((inner, inner), Image.LANCZOS)
    off = (s - inner) // 2
    canvas.paste(logo, (off, off), logo)
    # ماسک دایره
    mask = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, s - 1, s - 1), fill=255)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)

def square_icon(size: int) -> Image.Image:
    """لوگوی کامل روی بوم تیره (legacy)"""
    canvas = Image.new("RGBA", (size, size), (6, 7, 4, 255))
    inner = int(size * 0.92)
    logo = src.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(logo, (off, off), logo)
    return canvas

for dpi, px in SIZES.items():
    d = f"{OUT}/mipmap-{dpi}"
    circle_icon(px).save(f"{d}/ic_launcher.png")
    square_icon(px).save(f"{d}/ic_launcher_round.png")
    print(f"mipmap-{dpi}: {px}px OK")

# آیکون استور ۵۱۲
circle_icon(512).save("/home/z/my-project/docs/icon-512.png")
print("store icon 512 OK")
