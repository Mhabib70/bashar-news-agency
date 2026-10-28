// تولید ۱۰ عکس خبری ژنریک برای داده نمایشی (بدون متن، بدون نماد خاص — صرفاً صحنه‌های عمومی)
import ZAI from "z-ai-web-dev-sdk"
import fs from "fs"

const OUT = "scripts/raw-img"
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const SIZE = "1344x768"
const IMGS = [
  ["bazaar", "Bustling covered traditional Iranian bazaar corridor with fruit and spice stalls, shoppers walking with bags, warm daylight streaming in, photorealistic documentary photography, no text, no signage"],
  ["rice", "Green rice paddy fields in northern Iran at harvest time, farmers working with sickles, misty mountains in background, golden morning light, photorealistic, no text"],
  ["sport", "Indoor futsal match in a gymnasium, young players in action kicking ball on court, dynamic motion, bright sports hall lighting, photorealistic, no text on jerseys"],
  ["city", "Municipal workers paving a city street with asphalt roller machine, trees and mid-rise residential buildings along road, clear day, photorealistic documentary style, no text"],
  ["rain", "Heavy rain over a green northern Iranian city street, wet asphalt with reflections, pedestrians with umbrellas, parked cars, photorealistic, no text"],
  ["lab", "Modern university research laboratory with young researchers working at computer workstations, code on monitors, clean bright interior, photorealistic, no text"],
  ["library", "Bright modern public library reading hall with wooden bookshelves, students reading at tables, large windows with natural light, photorealistic, no text"],
  ["tree", "Young volunteers planting tree saplings in a city park, shovels and watering cans, spring morning light, green environment, photorealistic, no text"],
  ["ceremony", "Large indoor community ceremony hall with seated audience, stage decorated with flowers and green banners without writing, warm ambient lighting, photorealistic, no text"],
  ["blood", "Mobile blood donation clinic interior, medical staff in gloves preparing donation chair, clean bright modern medical setting, photorealistic, no text"],
]

const zai = await ZAI.create()
let ok = 0
for (const [name, prompt] of IMGS) {
  const out = `${OUT}/${name}.png`
  if (fs.existsSync(out) && fs.statSync(out).size > 50000) { console.log("skip", name); ok++; continue }
  let done = false
  for (let a = 1; a <= 3 && !done; a++) {
    try {
      const r = await zai.images.generations.create({ prompt, size: SIZE })
      const b64 = r?.data?.[0]?.base64
      if (!b64) throw new Error("empty response")
      fs.writeFileSync(out, Buffer.from(b64, "base64"))
      console.log("ok", name, fs.statSync(out).size)
      ok++; done = true
    } catch (e) {
      console.error(`fail ${name} try${a}:`, e.message)
      await new Promise((s) => setTimeout(s, 2000 * a))
    }
  }
}
console.log(`DONE ${ok}/${IMGS.length}`)
process.exit(0)
