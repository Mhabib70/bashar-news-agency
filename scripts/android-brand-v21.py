#!/usr/bin/env python3
"""آماده‌سازی لوگو و آیکون‌های اندروید با هویت جدید بسیج (نسخه ۲.۱)
- logo.png: برش دایره‌ای نشان بسیج با پس‌زمینه شفاف (برای اسپلش روشن)
- ic_launcher*.png: آیکون لانچر — پس‌زمینه سبز عمیق بسیج + نشان قرمز
"""
from PIL import Image, ImageDraw, ImageFilter

SRC = "/home/z/my-project/public/img/agency-logo.png"  # 1024x1024
ANDROID = "/home/z/my-project/android/res"
GREEN_DEEP = (23, 50, 31)      # --g900 بسیج
LIGHT = (242, 248, 244)        # --g50

# --- ۱) برش دایره‌ای نشان از تصویر اصلی ---
src = Image.open(SRC).convert("RGBA")
w, h = src.size
# نشان دایره‌ای حدوداً ۸۶٪ عرض را پر می‌کند؛ مرکز تصویر
D = int(w * 0.86)
cx, cy = w // 2, h // 2
box = (cx - D // 2, cy - D // 2, cx + D // 2, cy + D // 2)
badge = src.crop(box)
bd = badge.size[0]

# ماسک دایره‌ای با لبه نرم ملایم
mask = Image.new("L", (bd * 4, bd * 4), 0)
ImageDraw.Draw(mask).ellipse((0, 0, bd * 4 - 1, bd * 4 - 1), fill=255)
mask = mask.resize((bd, bd), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1))
badge.putalpha(mask)
badge.save("/home/z/my-project/scripts/mockup/badge-circle.png")

# --- ۲) لوگوی اسپلش: نشان شفاف 512px ---
splash_logo = badge.resize((512, 512), Image.LANCZOS)
splash_logo.save(f"{ANDROID}/drawable-nodpi/logo.png")

# --- ۳) آیکون لانچر: مربع سبز عمیق + نشان با حاشیه ---
sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
for folder, s in sizes.items():
    S = s * 4  # بزرگ‌تر بساز بعد کوچک کن (کیفیت)
    icon = Image.new("RGBA", (S, S), GREEN_DEEP + (255,))
    # حلقه ظریف روشن دور پس‌زمینه
    dr = ImageDraw.Draw(icon)
    m = int(S * 0.045)
    inset = S - 2 * m
    b = badge.resize((int(inset * 0.94), int(inset * 0.94)), Image.LANCZOS)
    off = (S - b.size[0]) // 2
    icon.alpha_composite(b, (off, off))
    icon = icon.resize((s, s), Image.LANCZOS)
    icon.save(f"{ANDROID}/{folder}/ic_launcher.png")

    # آیکون گرد: خود نشان تمام‌قد
    r = badge.resize((s * 4, s * 4), Image.LANCZOS).resize((s, s), Image.LANCZOS)
    r.save(f"{ANDROID}/{folder}/ic_launcher_round.png")

print("ICONS_OK")
