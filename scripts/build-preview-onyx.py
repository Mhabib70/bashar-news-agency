#!/usr/bin/env python3
"""ساخت پیش‌نمایش تم دارک لوکس خبرگزاری بسیج — دقیقاً بر پایهٔ تصویر مرجع Stitch
خروجی: download/preview-onyx.html (تک‌فایل با فونت و تصاویر embed شده)"""
import base64, io, os
from PIL import Image

ROOT = '/home/z/my-project'
OUT = os.path.join(ROOT, 'download', 'preview-onyx.html')

def b64(path, fmt='png'):
    with open(path, 'rb') as f:
        return f'data:image/{fmt};base64,' + base64.b64encode(f.read()).decode()

def font_b64(path):
    with open(path, 'rb') as f:
        return 'data:font/woff2;base64,' + base64.b64encode(f.read()).decode()

def img_b64_small(path, size=120, fmt='JPEG'):
    im = Image.open(path).convert('RGB')
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, fmt, quality=72)
    return f'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

# فونت‌ها
F_REG = font_b64(f'{ROOT}/public/fonts/Vazirmatn-Regular.woff2')
F_MED = font_b64(f'{ROOT}/public/fonts/Vazirmatn-Medium.woff2')
F_SEMI = font_b64(f'{ROOT}/public/fonts/Vazirmatn-SemiBold.woff2')
F_BOLD = font_b64(f'{ROOT}/public/fonts/Vazirmatn-Bold.woff2')

# تصاویر
HERO = b64(f'{ROOT}/public/img/avatars/f1.jpg', 'jpeg')          # پرترهٔ بزرگ
AVS = {k: img_b64_small(f'{ROOT}/public/img/avatars/f{k}.jpg') for k in [2,3,4,5,6,7,8]}
HERO2 = img_b64_small(f'{ROOT}/public/img/avatars/f3.jpg', 200)  # پرترهٔ قطعهٔ پایین‌راست

html = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>پیش‌نمایش تم Onyx — خبرگزاری بسیج شهر رشت</title>
<style>
@font-face{font-family:'Vazirmatn';src:url(F_REG) format('woff2');font-weight:400;}
@font-face{font-family:'Vazirmatn';src:url(F_MED) format('woff2');font-weight:500;}
@font-face{font-family:'Vazirmatn';src:url(F_SEMI) format('woff2');font-weight:600;}
@font-face{font-family:'Vazirmatn';src:url(F_BOLD) format('woff2');font-weight:700;}

*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#131316;}
body{
  font-family:'Vazirmatn',sans-serif;
  background:radial-gradient(120% 120% at 50% 0%, #2a2a2d 0%, #1d1d20 45%, #131316 100%);
  color:#f2f2ee;
  overflow:hidden;
}
.canvas{
  position:relative;width:1800px;height:1250px;margin:0;
  overflow:hidden;
  background:radial-gradient(120% 120% at 50% 0%, #2a2a2d 0%, #1d1d20 45%, #131316 100%);
}

/* ───── قاب گوشی ───── */
.phone{
  position:absolute;width:400px;height:864px;
  background:#0c0c0e;border-radius:52px;
  border:1px solid #2c2c31;
  box-shadow:0 40px 90px rgba(0,0,0,.55), 0 8px 24px rgba(0,0,0,.4);
  padding:22px 26px;overflow:hidden;
}
.ph-center{left:50%;transform:translateX(-50%);top:140px;z-index:5;}
.ph-left{left:64px;top:250px;transform:rotate(-9deg);z-index:3;}
.ph-right{right:96px;top:240px;transform:rotate(8deg);z-index:3;}

/* نوار وضعیت */
.status{display:flex;justify-content:space-between;align-items:center;height:26px;margin-bottom:6px;}
.status .time{font-size:16px;font-weight:600;letter-spacing:.5px;}
.icons{display:flex;gap:6px;align-items:center;}
.sig{display:flex;align-items:flex-end;gap:1.5px;}
.sig i{width:3px;background:#f2f2ee;border-radius:1px;display:block;}
.sig i:nth-child(1){height:5px}.sig i:nth-child(2){height:7px}.sig i:nth-child(3){height:9px}.sig i:nth-child(4){height:11px}
.wifi{width:15px;height:11px;position:relative;}
.wifi::before{content:'';position:absolute;right:1px;top:1px;width:13px;height:13px;border:2px solid #f2f2ee;border-radius:50%;clip-path:polygon(0 0,100% 0,100% 52%,50% 100%,0 52%);}
.wifi::after{content:'';position:absolute;right:5.5px;bottom:0;width:4px;height:4px;background:#f2f2ee;border-radius:50%;}
.batt{width:22px;height:11px;border:1.5px solid #f2f2ee;border-radius:3px;position:relative;padding:1.5px;}
.batt::after{content:'';position:absolute;right:-3.5px;top:2.5px;width:2px;height:4px;background:#f2f2ee;border-radius:1px;}
.batt i{display:block;height:100%;width:75%;background:#f2f2ee;border-radius:1px;}

/* ───── صفحهٔ مرکزی: خوش‌آمد ───── */
.side-actions{display:flex;flex-direction:column;gap:10px;margin-top:12px;align-items:flex-end;}
.pill-btn{
  display:inline-flex;align-items:center;gap:8px;
  background:#1d1d21;border:1px solid #303035;border-radius:999px;
  padding:11px 18px;font-size:13.5px;font-weight:500;color:#e9e9e4;
}
.pill-btn .plus{width:18px;height:18px;border-radius:50%;background:#f2f2ee;color:#0c0c0e;
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;}
.search-circ{width:38px;height:38px;border-radius:50%;background:#1d1d21;border:1px solid #303035;
  display:flex;align-items:center;justify-content:center;}
.search-circ svg{width:16px;height:16px;stroke:#cfcfd2;stroke-width:2;fill:none;}

.welcome{margin-top:20px;}
.welcome .date{font-size:14.5px;color:#9a9aa0;font-weight:500;}
.welcome .weather{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:19px;font-weight:600;}
.sun{width:22px;height:22px;position:relative;}
.sun::before{content:'';position:absolute;inset:5px;background:#f5c542;border-radius:50%;}
.sun::after{content:'';position:absolute;inset:0;border:2px solid #f5c542;border-radius:50%;clip-path:polygon(0 0,100% 0,100% 30%,0 30%);opacity:.9;}
.welcome h1{font-size:30px;font-weight:700;line-height:1.35;margin-top:10px;}
.welcome h1 span{display:block;color:#fafaf6;}
.welcome .members{font-size:13.5px;color:#8a8a90;margin-top:2px;}

.hero{
  position:relative;width:100%;height:292px;border-radius:30px;overflow:hidden;
  margin-top:20px;border:1px solid #26262b;
}
.hero img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;}
.hero .shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(10,10,12,.88) 100%);}
.hero .who{position:absolute;bottom:16px;right:20px;}
.hero .who b{display:block;font-size:19px;font-weight:700;}
.hero .who span{font-size:12.5px;color:#b9b9bd;}

.stat-card{
  background:#161619;border:1px solid #26262b;border-radius:26px;
  padding:18px 20px;margin-top:16px;
}
.stat-row{display:flex;gap:14px;}
.stat-box{flex:1;background:#1e1e22;border-radius:18px;padding:12px 16px;position:relative;}
.stat-box .big{font-size:34px;font-weight:700;line-height:1.1;}
.stat-box .lbl{position:absolute;left:14px;top:14px;text-align:left;font-size:11px;color:#8a8a90;line-height:1.5;}
.stat-box .lbl b{color:#7ee2a8;font-weight:600;}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
.chip{background:#202024;border:1px solid #2e2e33;border-radius:999px;padding:7px 13px;font-size:11.5px;color:#c9c9ce;font-weight:500;}
.chip.hot{background:#17301f;border-color:#1f4d31;color:#8fe6b1;}
.avatars{display:flex;align-items:center;justify-content:space-between;margin-top:14px;}
.avatars .row{display:flex;align-items:center;}
.avatars img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #0c0c0e;margin-left:-8px;}
.avatars img:first-child{margin-left:0;}
.more-circ{width:38px;height:38px;border-radius:50%;background:#1e1e22;border:1px solid #303035;color:#cfcfd2;
  display:flex;align-items:center;justify-content:center;font-size:16px;}

/* ───── صفحهٔ چپ: کارنامه با نمودار شعاعی ───── */
.back-row{display:flex;align-items:center;gap:12px;margin-top:14px;}
.back-circ{width:38px;height:38px;border-radius:50%;background:#1d1d21;border:1px solid #303035;
  display:flex;align-items:center;justify-content:center;color:#e9e9e4;font-size:16px;}
.back-row span{font-size:13.5px;color:#9a9aa0;}
.work-title{margin-top:26px;}
.work-title h2{font-size:27px;font-weight:700;}
.work-title p{font-size:13.5px;color:#8a8a90;margin-top:4px;}
.burst{position:relative;width:270px;height:270px;margin:58px auto 0;}
.burst .ray{position:absolute;left:50%;top:50%;transform-origin:0 50%;height:3.4px;border-radius:3px;}
.burst .core{
  position:absolute;inset:62px;background:#101013;border-radius:50%;
  border:1px solid #26262b;display:flex;flex-direction:column;align-items:center;justify-content:center;
}
.burst .core b{font-size:44px;font-weight:700;line-height:1.1;}
.burst .core span{font-size:13px;color:#8a8a90;}
.mini-rows{margin-top:56px;border-top:1px solid #232327;}
.mini-rows .mr{display:flex;justify-content:space-between;padding:12px 2px;border-bottom:1px solid #232327;font-size:13px;color:#c9c9ce;}
.mini-rows .mr b{color:#7ee2a8;font-weight:600;font-size:12px;}

/* ───── صفحهٔ راست: صف بررسی ───── */
.stage-head{display:flex;align-items:center;gap:16px;margin-top:16px;}
.ring{width:64px;height:64px;position:relative;flex-shrink:0;}
.ring svg{transform:rotate(-90deg);}
.ring .pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#8fe6b1;}
.stage-head .st{font-size:15.5px;font-weight:700;line-height:1.6;}
.stage-head .st span{display:block;font-size:12.5px;font-weight:400;color:#9a9aa0;}
.tasks{margin-top:30px;position:relative;}
.tasks::before{content:'';position:absolute;top:14px;bottom:30px;right:13.5px;border-right:1.5px dashed #2c5b3d;}
.task{display:flex;align-items:center;gap:13px;padding:13px 0;position:relative;}
.tk-circ{width:27px;height:27px;border-radius:50%;flex-shrink:0;border:1.5px solid #35353b;background:#141417;z-index:1;}
.tk-circ.done{background:#22c55e;border-color:#22c55e;position:relative;}
.tk-circ.done::after{content:'';position:absolute;right:8px;top:6px;width:7px;height:12px;
  border-right:2.2px solid #08130c;border-bottom:2.2px solid #08130c;transform:rotate(42deg);}
.task .t{flex:1;font-size:13.5px;font-weight:500;color:#e6e6e2;line-height:1.6;}
.task.done .t{color:#a9a9ae;}
.task .tm{font-size:12px;color:#77777d;font-weight:500;}

/* ───── قطعه‌های کلاژ (لبه‌ها) ───── */
.frag{position:absolute;background:#111113;border:1px solid #26262b;border-radius:28px;box-shadow:0 30px 70px rgba(0,0,0,.5);overflow:hidden;z-index:2;}
.frag-1{left:-120px;top:-60px;width:300px;height:330px;transform:rotate(-10deg);padding:22px;}
.frag-1 .fr{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid #222226;font-size:12.5px;color:#c9c9ce;}
.frag-1 .fr span{color:#77777d;font-size:11.5px;}
.frag-2{right:-90px;top:-40px;width:280px;height:260px;transform:rotate(9deg);padding:22px;z-index:2;}
.frag-2 .dline{position:absolute;right:30px;top:0;bottom:0;border-right:1.5px dashed #2c5b3d;}
.frag-2 .fr{display:flex;justify-content:space-between;align-items:center;padding:12px 0;font-size:12.5px;color:#c9c9ce;position:relative;}
.frag-2 .dot{width:18px;height:18px;border-radius:50%;background:#1a1a1e;border:1.5px solid #35353b;}
.frag-3{left:-70px;bottom:-90px;width:320px;height:280px;transform:rotate(7deg);padding:24px;z-index:6;}
.frag-3 .chiprow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.frag-4{right:-60px;bottom:-70px;width:300px;height:240px;transform:rotate(-6deg);padding:24px;z-index:6;display:flex;gap:14px;align-items:flex-start;}
.frag-4 img{width:52px;height:52px;border-radius:50%;object-fit:cover;}
.frag-4 .n{font-size:16px;font-weight:700;}
.frag-4 .r{font-size:12px;color:#8a8a90;margin-top:2px;}

.cap{
  position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
  font-size:13px;color:#6d6d73;z-index:10;letter-spacing:.2px;
}
.cap b{color:#9a9aa0;font-weight:600;}
</style>
</head>
<body>
<div class="canvas" id="cv">

  <!-- قطعه بالا-چپ -->
  <div class="frag frag-1">
    <div class="fr">تایید گزارش شهرداری رشت <span>۱۲:۱۱</span></div>
    <div class="fr">ویرایش تصویر خبر پارک <span>۱۳:۲۲</span></div>
    <div class="fr">ارسال خبر همایش به ایتا <span>۱۵:۴۱</span></div>
    <div class="fr">تنظیم گزارش ورزشی <span>۱۶:۵۴</span></div>
  </div>

  <!-- قطعه بالا-راست -->
  <div class="frag frag-2">
    <div class="dline"></div>
    <div class="fr">تکمیل ویژه‌نامهٔ هفته <span class="dot"></span></div>
    <div class="fr">بازنگری خبر آب‌وهوا <span class="dot"></span></div>
    <div class="fr">طراحی گزارش تصویری <span class="dot"></span></div>
  </div>

  <!-- قطعه پایین-چپ -->
  <div class="frag frag-3">
    <div class="chiprow">
      <span class="chip">نقشهٔ مسیر خبر</span>
      <span class="chip hot">خبر فوری</span>
      <span class="chip">تحلیل</span>
    </div>
    <div class="chiprow">
      <span class="chip">گزارش تصویری</span>
      <span class="chip">مصاحبه</span>
    </div>
    <div class="chiprow">
      <span class="chip">رپورتاژ</span>
      <span class="chip">یادداشت</span>
    </div>
  </div>

  <!-- قطعه پایین-راست -->
  <div class="frag frag-4">
    <img src="HERO2" alt="">
    <div>
      <div class="n">مریم ر.</div>
      <div class="r">خبرنگار برتر ماه</div>
    </div>
  </div>

  <!-- ═══ گوشی چپ: کارنامهٔ ماه ═══ -->
  <div class="phone ph-left">
    <div class="status"><div class="icons"><span class="sig"><i></i><i></i><i></i><i></i></span><span class="wifi"></span><span class="batt"><i></i></span></div><div class="time">۱۹:۴۱</div></div>
    <div class="back-row"><div class="back-circ">›</div><span>بازگشت</span></div>
    <div class="work-title">
      <h2>کارنامهٔ ماه</h2>
      <p>ترکیب انواع انتشار خبر</p>
    </div>
    <div class="burst" id="burst">
      <div class="core"><b>۱۲۸</b><span>خبر در مهر</span></div>
    </div>
    <div class="mini-rows">
      <div class="mr">مجموع بازدید اخبار <b>۸٪ افزایش</b></div>
      <div class="mr">خبرهای فوری منتشرشده <b>۴۲</b></div>
      <div class="mr">گزارش ویژهٔ شهری <b>۱۱</b></div>
      <div class="mr">خبر پذیرفته‌شده در بازنگری <b>۹</b></div>
    </div>
  </div>

  <!-- ═══ گوشی راست: صف بررسی خبر ═══ -->
  <div class="phone ph-right">
    <div class="status"><div class="icons"><span class="sig"><i></i><i></i><i></i><i></i></span><span class="wifi"></span><span class="batt"><i></i></span></div><div class="time">۱۹:۴۱</div></div>
    <div class="stage-head">
      <div class="ring">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="27" fill="none" stroke="#26262b" stroke-width="7"/>
          <circle cx="32" cy="32" r="27" fill="none" stroke="#22c55e" stroke-width="7" stroke-linecap="round" stroke-dasharray="169.6" stroke-dashoffset="130.6"/>
        </svg>
        <div class="pct">۲۳٪</div>
      </div>
      <div class="st">مرحلهٔ ۳ — تدوین ویژه‌نامهٔ هفته<span>بر پایهٔ تقویم خبری اتاق خبر</span></div>
    </div>
    <div class="tasks">
      <div class="task done"><div class="tk-circ done"></div><div class="t">تایید گزارش افتتاح طرح ترانزیت</div><div class="tm">۱۳:۲۲</div></div>
      <div class="task done"><div class="tk-circ done"></div><div class="t">ویرایش تصاویر خبر پارک شهیدان</div><div class="tm">۱۵:۴۱</div></div>
      <div class="task done"><div class="tk-circ done"></div><div class="t">ارسال خبر همایش مقاومت به ایتا</div><div class="tm">۱۶:۵۴</div></div>
      <div class="task"><div class="tk-circ"></div><div class="t">مصاحبه با فرمانده حوزه مقاومت</div><div class="tm">۱۷:۱۱</div></div>
      <div class="task"><div class="tk-circ"></div><div class="t">تنظیم گزارش مسابقات ورزشی</div><div class="tm">۱۸:۰۸</div></div>
      <div class="task"><div class="tk-circ"></div><div class="t">بازنگری خبر اوقات بازار هفتگی</div><div class="tm">۱۸:۵۰</div></div>
      <div class="task"><div class="tk-circ"></div><div class="t">تهیهٔ گزارش آب‌وهوای فردا</div><div class="tm">۱۹:۱۰</div></div>
      <div class="task"><div class="tk-circ"></div><div class="t">آرشیو تصاویر رویدادهای هفته</div><div class="tm">۱۹:۳۰</div></div>
    </div>
  </div>

  <!-- ═══ گوشی مرکزی: خوش‌آمد ═══ -->
  <div class="phone ph-center">
    <div class="status"><div class="icons"><span class="sig"><i></i><i></i><i></i><i></i></span><span class="wifi"></span><span class="batt"><i></i></span></div><div class="time">۱۹:۴۱</div></div>

    <div class="side-actions">
      <div class="pill-btn"><span class="plus">+</span>خبر جدید</div>
      <div class="search-circ"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>
    </div>

    <div class="welcome">
      <div class="date">چهارشنبه، ۲۵ مهر</div>
      <div class="weather"><span class="sun"></span>۲۷°</div>
      <h1>خوش آمدی،<span>حبیب</span></h1>
      <div class="members">۱۲ خبرنگار فعال در اتاق خبر</div>
    </div>

    <div class="hero">
      <img src="HERO" alt="">
      <div class="shade"></div>
      <div class="who"><b>فاطمه حسینی</b><span>خبرنگار برتر مهر</span></div>
    </div>

    <div class="stat-card">
      <div class="stat-row">
        <div class="stat-box">
          <div class="lbl">خبر<br><b>٪۱۰۳</b></div>
          <div class="big">۱۲۸</div>
        </div>
        <div class="stat-box">
          <div class="lbl">گزارش ویژه<br><b>٪۴۰</b></div>
          <div class="big">۱۱</div>
        </div>
      </div>
      <div class="chips">
        <span class="chip">گزارش تصویری</span>
        <span class="chip hot">خبر فوری</span>
        <span class="chip">تحلیل</span>
        <span class="chip">مصاحبه</span>
        <span class="chip">رپورتاژ</span>
        <span class="chip">یادداشت</span>
      </div>
      <div class="avatars">
        <div class="row">
          <img src="AV2" alt=""><img src="AV3" alt=""><img src="AV4" alt=""><img src="AV5" alt=""><img src="AV6" alt="">
        </div>
        <div class="more-circ">‹</div>
      </div>
    </div>
  </div>

  <div class="cap">پیش‌نمایش طراحی <b>Onyx</b> — خبرگزاری بسیج شهر رشت · نسخهٔ ۱</div>
</div>

<script>
// نمودار شعاعی (خورشیدپراکن) — همان زبان تصویر مرجع
(function(){
  const el = document.getElementById('burst');
  const N = 150;
  for (let i = 0; i < N; i++){
    const ang = i * 360 / N;
    const t = i / N;
    const len = 40 + 24 * Math.abs(Math.sin(i * 1.7)) + (i % 3) * 3;
    // رنگ: بیشتر پرتوی روشن مایل به نعنایی، بعضی خاکستری
    let bg;
    const k = i % 6;
    if (k < 3) bg = 'linear-gradient(90deg, rgba(238,242,236,.92), rgba(191,240,212,.95))';
    else if (k < 5) bg = 'linear-gradient(90deg, rgba(150,160,150,.55), rgba(110,200,150,.45))';
    else bg = 'linear-gradient(90deg, rgba(110,110,116,.5), rgba(90,90,96,.4))';
    const d = document.createElement('div');
    d.className = 'ray';
    d.style.width = len + 'px';
    d.style.background = bg;
    d.style.transform = 'rotate(' + ang + 'deg) translateX(58px)';
    el.appendChild(d);
  }
})();
</script>
</body>
</html>"""

html = html.replace('F_REG', F_REG).replace('F_MED', F_MED).replace('F_SEMI', F_SEMI).replace('F_BOLD', F_BOLD)
html = html.replace('HERO2', HERO2).replace('HERO', HERO)
html = html.replace('AV2', AVS[2]).replace('AV3', AVS[3]).replace('AV4', AVS[4]).replace('AV5', AVS[5]).replace('AV6', AVS[6])

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('written:', OUT, f'{os.path.getsize(OUT)//1024} KB')
