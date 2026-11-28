# -*- coding: utf-8 -*-
"""تست کامل ورود از مرورگر: صفحهٔ اصلی → ورود با شمارهٔ ادمین → داشبورد /admin"""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/download"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 800}, locale="fa-IR")
        pg = await ctx.new_page()

        # ۱) صفحهٔ اصلی (خوش‌آمد)
        await pg.goto(BASE, wait_until="networkidle", timeout=60000)
        await pg.screenshot(path=f"{OUT}/pv-1-home.png")
        title = await pg.title()
        print("step1 home:", title[:60])

        # ۲) باز کردن دیالوگ ورود با شماره
        login_btn = pg.locator("button:has-text('ورود'), button:has-text('ورود به سامانه')").first
        await login_btn.click(timeout=15000)
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=f"{OUT}/pv-2-dialog.png")

        # ۳) تایپ شمارهٔ ادمین و ارسال
        inp = pg.locator("input[inputmode='tel']").first
        await inp.fill("09120000000")
        submit = pg.locator("button:has-text('ورود')").last
        await submit.click(timeout=10000)
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f"{OUT}/pv-3-logged-in.png")

        # ۴) ورود به داشبورد ادمین
        await pg.goto(f"{BASE}/admin", wait_until="networkidle", timeout=60000)
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path=f"{OUT}/pv-4-admin.png")
        url = pg.url
        print("step4 admin url:", url)
        txt = await pg.inner_text("body")
        print("admin body sample:", " | ".join(txt.split("\n")[:8]))

        await browser.close()

asyncio.run(main())
