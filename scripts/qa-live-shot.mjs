// اسکرین‌شات لایو — welcome
import { chromium } from 'playwright'
import fs from 'fs'

const OUT = '/tmp/render/candy'
fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
await page.goto('http://80.91.208.240/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/40-live-welcome.png` })
console.log('shot live welcome')
const title = await page.title()
console.log('title:', title)
await browser.close()
