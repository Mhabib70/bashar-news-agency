# -*- coding: utf-8 -*-
"""
ری‌برند اپ به تم لوگو (سفید و قرمز) — خبرگزاری بسیج شهر رشت
۱) ساخت لوگو-مارک دایره‌ای از public/img/agency-logo.png
۲) بازنویسی پالت سبز/سرمه‌ای/آبی به قرمز لوگو در src/**  (فقط رنگ‌های برند؛
   رنگ‌های معنایی دسته‌ها/موفقیت/خطر دست‌نخورده می‌مانند)
"""
import os, re, sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- ۱) لوگو-مارک دایره‌ای ----------
def make_logo_mark():
    src = Image.open(os.path.join(ROOT, "public/img/agency-logo.png")).convert("RGBA")
    px = src.load()
    w, h = src.size
    # مرز کره قرمز: پیکسل‌های قرمز روشن (ر > 110، قرمز غالب)
    xs, ys = [], []
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b, a = px[x, y]
            if a > 200 and r > 110 and r > g + 55 and r > b + 55:
                xs.append(x); ys.append(y)
    cx, cy = (min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2
    rad = max(max(xs) - min(xs), max(ys) - min(ys)) // 2
    rad = int(rad * 1.02)  # کمی تا حاشیه نقره‌ای
    print(f"logo sphere: center=({cx},{cy}) r={rad}")

    size = 640
    crop = src.crop((cx - rad, cy - rad, cx + rad, cy + rad)).resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((6, 6, size * 4 - 6, size * 4 - 6), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(crop, (0, 0), mask)
    out.save(os.path.join(ROOT, "public/img/logo-mark.png"))
    print("logo-mark.png saved")

# ---------- ۲) نگاشت رنگ ----------
HEX = {
    # — سبز برند قدیمی → قرمز لوگو —
    "#2f6b33": "#b41a22",  # primary سبز → قرمز اصلی لوگو
    "#4e9c5c": "#d3232e",
    "#7bb661": "#e64852",
    "#5cae6b": "#d3232e",
    "#a8d5a2": "#f3a0a5",
    "#84966f": "#a8767c",
    "#d7e4d7": "#f2d5d6",
    "#2c4033": "#3d1218",
    "#223428": "#3d1218",
    "#233529": "#43161c",
    "#1a3c2a": "#571016",
    "#17321f": "#3d0a10",
    "#e9f1ea": "#fbe9ea",
    "#dbe8dd": "#f8dcdd",
    "#e6efe7": "#fbe7e8",
    "#eef3ee": "#f9f0f0",
    "#e0e8e0": "#f0dede",
    "#dfe7df": "#ecdcdc",
    "#e9eee9": "#f2eaea",
    "#f7faf7": "#faf6f6",
    "#5f6f64": "#7d676b",
    "#93a89a": "#ad9295",
    "#1d2b22": "#2e1518",
    "#0f1712": "#160b0d",
    "#141e18": "#1f1214",
    "#17231c": "#241518",
    "#1a2820": "#2a171b",
    "#16221b": "#221417",
    "#1c2b22": "#2c181c",
    "#0a100c": "#120a0b",
    "#0e1611": "#170d0f",
    "#08120b": "#120709",
    "#0a130d": "#140a0c",
    "#f2f8f4": "#fdf2f2",
    # — سرمه‌ای/آبی v3 → قرمز لوگو —
    "#202c56": "#a3121b",  # navy-2 (بالای هیرو)
    "#17203c": "#7d0e17",  # navy (بدنه هیرو)
    "#101731": "#4c070c",  # navy-deep
    "#f3f6ff": "#fff3f3",  # navy-ink
    "#9aa6cb": "#e3b6bb",  # navy-muted
    "#3b82f6": "#e0202b",  # azure-2
    "#2563eb": "#b41a22",  # azure
    "#1d4ed8": "#8f0e15",  # azure-deep
    "#4f8bfa": "#f0606a",  # tile-blue بالا
    "#38bdf8": "#f87171",  # sky-400 (اکسنت روشن)
    "#93c5fd": "#fca5a5",  # blue-300 (متن دارک)
    "#eef1f8": "#f7f2f2",  # صفحه روشن
    "#f5f7fd": "#fbf5f5",
    "#e4e9f5": "#efdfe0",
    "#101a33": "#2b1316",
    "#5c6b8f": "#82696d",
    "#e3ecfe": "#fde8e9",
    "#eef2ff": "#fbeeee",
    "#93a0c2": "#bfa0a4",
    "#242f56": "#3a1a20",
    "#151d38": "#221317",
    "#1a2344": "#2a181c",
    "#0b1020": "#140a0c",
    "#eef1f8": "#f7f2f2",
}
RGBA = [  # (قبلی، جدید) — با و بدون فاصله
    ((47, 107, 51), (180, 26, 34)),
    ((37, 99, 235), (180, 26, 34)),
    ((59, 130, 246), (224, 32, 43)),
    ((9, 14, 35), (34, 5, 8)),
    ((16, 33, 84), (74, 8, 14)),
    ((4, 9, 30), (20, 3, 5)),
    ((26, 60, 42), (122, 10, 16)),
    ((23, 32, 60), (88, 8, 14)),
]

def build_rgba_pairs():
    pairs = []
    for old, new in RGBA:
        o1 = "rgba(%d, %d, %d," % old
        n1 = "rgba(%d, %d, %d," % new
        o2 = "rgba(%d,%d,%d," % old
        n2 = "rgba(%d,%d,%d," % new
        pairs.append((o1, n1)); pairs.append((o2, n2))
    return pairs

def process_file(path, hex_pairs, rgba_pairs):
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s
    counts = []
    for o, n in hex_pairs:
        c = s.count(o)
        if c:
            s = s.replace(o, n)
            counts.append(f"{o}->{n}:{c}")
    for o, n in rgba_pairs:
        c = s.count(o)
        if c:
            s = s.replace(o, n)
            counts.append(f"{o}->{n}:{c}")
    if s != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(s)
        return counts
    return None

def main():
    make_logo_mark()
    hex_pairs = sorted(HEX.items(), key=lambda kv: -len(kv[0]))
    rgba_pairs = build_rgba_pairs()
    src_dir = os.path.join(ROOT, "src")
    changed = 0
    for dirpath, _, files in os.walk(src_dir):
        for fn in files:
            if not fn.endswith((".ts", ".tsx", ".css")):
                continue
            p = os.path.join(dirpath, fn)
            res = process_file(p, hex_pairs, rgba_pairs)
            if res:
                changed += 1
                print(f"--- {os.path.relpath(p, ROOT)}")
                for c in res:
                    print("   ", c)
    print(f"\n{changed} files changed")

if __name__ == "__main__":
    main()
