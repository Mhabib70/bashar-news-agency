// دیباگ رندر خانه محلی
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 412, height: 915 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const login = await fetch(BASE + '/api/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '0912-555-0203' }),
}).then((r) => r.json())
console.log('login:', JSON.stringify(login))

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate((uid) => localStorage.setItem('newsapp_uid', uid), login.userId)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const body = (await page.locator('body').innerText()).slice(0, 600)
console.log('--- body text ---')
console.log(body)
console.log('--- errors:', errors.slice(0, 6))
await page.screenshot({ path: '/tmp/render/ui3/debug.png' })
await browser.close()
