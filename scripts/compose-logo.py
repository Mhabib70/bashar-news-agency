# ترکیب لوگوی خبرگزاری بسیج شهر رشت — متن فارسی با فونت وزیرمتن روی نشان تولیدشده
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "/home/z/my-project/public/img/emblem-blank.png"
OUT = "/home/z/my-project/public/img/agency-logo.png"
FONT = "/tmp/Vazirmatn-Bold.ttf"

img = Image.open(SRC).convert("RGBA")
W, H = img.size  # 1024x1024

# مرکز صفحهٔ قرمز نشان (تخمین از تصویر)
CX, CY = 515, 505

def fit_font(text: str, max_w: int, start: int) -> ImageFont.FreeTypeFont:
    size = start
    while size > 20:
        f = ImageFont.truetype(FONT, size)
        d = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
        box = d.textbbox((0, 0), text, font=f, direction="rtl", language="fa")
        if box[2] - box[0] <= max_w:
            return f
        size -= 6
    return ImageFont.truetype(FONT, 20)

caption_top = "خبرگزاری"
main_word = "بسیج"
caption_bottom = "شهر رشت"

f_top = fit_font(caption_top, 470, 72)
f_main = fit_font(main_word, 545, 260)
f_bot = fit_font(caption_bottom, 430, 60)

def draw_layer(text, font, xy, fill, blur=0, offset=(0, 0)):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy[0] + offset[0], xy[1] + offset[1]
    d.text((x, y), text, font=font, fill=fill, anchor="mm", direction="rtl", language="fa")
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return layer

# ۱) سایهٔ نرم زیر متن‌ها (عمق سه‌بعدی)
img = Image.alpha_composite(img, draw_layer(caption_top, f_top, (CX, 340), (50, 0, 0, 190), blur=9, offset=(0, 7)))
img = Image.alpha_composite(img, draw_layer(main_word, f_main, (CX, 515), (50, 0, 0, 200), blur=11, offset=(0, 9)))
img = Image.alpha_composite(img, draw_layer(caption_bottom, f_bot, (CX, 680), (50, 0, 0, 190), blur=9, offset=(0, 7)))

# ۲) متن سفید اصلی
img = Image.alpha_composite(img, draw_layer(caption_top, f_top, (CX, 340), (255, 255, 255, 242)))
img = Image.alpha_composite(img, draw_layer(main_word, f_main, (CX, 515), (255, 255, 255, 255)))
img = Image.alpha_composite(img, draw_layer(caption_bottom, f_bot, (CX, 680), (255, 255, 255, 228)))

img.convert("RGB").save(OUT, "PNG", optimize=True)
print("saved:", OUT, img.size)
