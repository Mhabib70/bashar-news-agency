# شماره‌گذاری صفحات بدنه با اعداد فارسی + متادیتای PDF
# جلد (صفحه ۱) و صفحهٔ پایانی (آخر) بدون شماره؛ صفحات بدنه: ۱ تا ۷
import io
from fontTools.ttLib import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from pypdf import PdfReader, PdfWriter

# ۱) تبدیل woff2 → ttf برای reportlab
f = TTFont("fonts/Vazirmatn-Regular.woff2")
f.flavor = None
f.save("Vazirmatn-Regular.ttf")
pdfmetrics.registerFont(RLFont("Vazir", "Vazirmatn-Regular.ttf"))

FA = "۰۱۲۳۴۵۶۷۸۹"
def fa_num(n): return "".join(FA[int(d)] for d in str(n))

SRC, OUT = "speech.pdf", "speech-numbered.pdf"
reader = PdfReader(SRC)
W = float(reader.pages[0].mediabox.width)
H = float(reader.pages[0].mediabox.height)
n = len(reader.pages)

# ۲) لایهٔ شماره صفحه
buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=(W, H))
for i in range(n):
    if i == 0 or i == n - 1:  # جلد و صفحهٔ پایانی
        c.showPage(); continue
    c.setFont("Vazir", 10)
    c.setFillColorRGB(0x5a / 255, 0x6b / 255, 0x5a / 255)
    c.drawCentredString(W / 2, 24, fa_num(i))  # بدنه از ۱ شروع می‌شود
    c.showPage()
c.save()
buf.seek(0)
overlay = PdfReader(buf)

# ۳) ادغام + متادیتا
writer = PdfWriter()
for i, page in enumerate(reader.pages):
    if 0 < i < n - 1:
        page.merge_page(overlay.pages[i])
    writer.add_page(page)
writer.add_metadata({
    "/Title": "متن سخنرانی معرفی اپلیکیشن خبرگزاری بسیج شهر رشت",
    "/Author": "خبرگزاری بسیج شهر رشت",
    "/Subject": "متن کامل سخنرانی معرفی اپ خبرنگاران — ۱۵ تا ۲۰ دقیقه",
    "/Creator": "Z.ai",
})
with open(OUT, "wb") as fh:
    writer.write(fh)
print("numbered pages: 2..", n - 1, "| total:", n)
