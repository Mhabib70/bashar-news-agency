#!/bin/bash
# تولید ۱۸ آواتار فیک برای دمو — ۱۰ مرد + ۸ زن (خبرگزاری بسیج شهر رشت)
# خروجی: public/img/avatars/{m1..m10,f1..f8}.png (بعداً با resize-avatars.py به JPG 400px)
set -u
DIR="/home/z/my-project/public/img/avatars"
mkdir -p "$DIR"

gen() { # gen <name> <prompt>
  local out="$DIR/$1.png"
  if [ -s "$out" ]; then echo "skip $1 (exists)"; return 0; fi
  z-ai image -p "$2" -o "$out" -s 1024x1024 >/dev/null 2>&1 && echo "ok  $1" || echo "FAIL $1"
}

# — مردان —
gen m1 "Professional corporate headshot portrait of a confident Middle Eastern man in his early 40s, short dark hair with subtle gray streaks, neatly trimmed beard, elegant dark navy suit jacket over white shirt, slight warm smile, blurred modern newsroom office background, soft natural window lighting, photorealistic, sharp focus on face, high quality photography" &
gen m2 "Professional headshot portrait of a friendly Middle Eastern man in his early 30s, clean shaven, short black hair, dark green polo shirt, blurred press office background, natural lighting, photorealistic, sharp focus, high quality" &
gen m3 "Professional headshot portrait of a young Middle Eastern man in his mid 20s, light stubble, thick dark hair, gray casual button shirt, blurred city street background, golden hour light, photorealistic, high quality" &
wait
gen m4 "Professional headshot portrait of a Middle Eastern man in his mid 40s, rectangular glasses, short beard with gray hints, charcoal blazer over black shirt, blurred modern office background, photorealistic, high quality" &
gen m5 "Professional headshot portrait of a Middle Eastern man in his 30s, full dark beard, olive utility jacket, blurred green rice field outdoor background in northern Iran, natural daylight, photorealistic, high quality" &
gen m6 "Professional headshot portrait of a young Middle Eastern man in his early 20s, clean shaven, wavy dark hair, denim shirt, blurred university campus background, bright natural light, photorealistic, high quality" &
wait
gen m7 "Professional headshot portrait of a Middle Eastern man in his mid 30s, round glasses, clean shaven, maroon shirt, blurred library bookshelves background, warm indoor light, photorealistic, high quality" &
gen m8 "Professional headshot portrait of a distinguished Middle Eastern man in his late 40s, gray-flecked short beard, dark gray suit white shirt no tie, neutral studio gray background, soft studio lighting, photorealistic, high quality" &
gen m9 "Professional headshot portrait of an athletic Middle Eastern man in his late 20s, short sporty haircut, light beard, navy zip jacket, blurred outdoor sports field background, daylight, photorealistic, high quality" &
wait
gen m10 "Professional headshot portrait of a Middle Eastern journalist man in his mid 30s, trimmed short beard and mustache, light blue shirt with press lanyard badge, blurred conference room background, photorealistic, high quality" &

# — زنان (حجاب، متناسب با فضای خبرگزاری ایرانی) —
gen f1 "Professional corporate headshot portrait of a Middle Eastern woman in her mid 30s wearing an elegant navy blue hijab, warm confident smile, blurred modern newsroom background, soft natural lighting, photorealistic, sharp focus, high quality" &
wait
gen f2 "Professional headshot portrait of a young Middle Eastern woman in her mid 20s wearing a dark emerald green hijab, friendly expression, blurred modern office background, natural light, photorealistic, high quality" &
gen f3 "Professional headshot portrait of a Middle Eastern woman in her early 40s wearing a soft brown hijab, kind smile, office background blurred, warm indoor lighting, photorealistic, high quality" &
gen f4 "Professional headshot portrait of a young Middle Eastern woman in her early 20s wearing a light gray hijab, gentle smile, blurred library background, bright natural light, photorealistic, high quality" &
wait
gen f5 "Professional headshot portrait of a Middle Eastern woman in her early 30s wearing a dark teal hijab, professional confident look, blurred press conference hall background, photorealistic, high quality" &
gen f6 "Professional headshot portrait of a young Middle Eastern woman in her mid 20s wearing a black hijab, confident calm expression, blurred modern office background, photorealistic, high quality" &
gen f7 "Professional headshot portrait of a Middle Eastern woman in her late 30s wearing a burgundy hijab, warm professional smile, blurred meeting room background, soft lighting, photorealistic, high quality" &
wait
gen f8 "Professional headshot portrait of a young Middle Eastern woman in her late 20s wearing a cream beige hijab, soft smile, blurred green outdoor park background, golden hour light, photorealistic, high quality" &
wait

echo "---"
ls -la "$DIR" | grep -c "\.png$" || true
echo "done"
