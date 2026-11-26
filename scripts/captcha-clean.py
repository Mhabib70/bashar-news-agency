#!/usr/bin/env python3
# پاکسازی کپتا: حذف خطوط سرخابی + بزرگ‌نمایی + بهبود کنتراست
import base64, sys
from PIL import Image
import io, colorsys

# خواندن base64 از فایل (آرگومان اول) و ذخیرهٔ نسخهٔ پاک
src = sys.argv[1]
dst = sys.argv[2]
b64 = open(src).read().strip()
if ',' in b64:
    b64 = b64.split(',', 1)[1]
img = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
w, h = img.size
px = img.load()

for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        mx, mn = max(r, g, b), min(r, g, b)
        sat = (mx - mn) / mx if mx else 0
        # سرخابی/صورتی: قرمز و آبی بالا، سبز پایین
        if r > 140 and b > 90 and g < r * 0.55 and g < b * 0.75:
            # جایگزینی با رنگ پس‌زمینهٔ آبی روشن
            px[x, y] = (173, 196, 214)
        elif sat > 0.55 and r > 180 and g < 120 and b > 120 and abs(int(r) - int(b)) < 90:
            px[x, y] = (173, 196, 214)

img = img.resize((w * 6, h * 6), Image.LANCZOS)
img.save(dst)
print("cleaned:", dst, img.size)
