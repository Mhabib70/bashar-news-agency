# -*- coding: utf-8 -*-
"""اسکرین‌شات تم اونیکس در اپ واقعی: خوش‌آمد → ورود → اپ → داشبورد ادمین"""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/download"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 390, "height": 844}, locale="fa-IR", device_scale_factor=2)
        page = await ctx.new_page()

        # ۱) خوش‌آمد — تم اونیکس پیش‌فرض (موبایل)
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(1500)
        cls = await page.evaluate("document.documentElement.className")
        print("html class:", cls)
        await page.screenshot(path=f"{OUT}/onyx-1-welcome.png")

        # ۲) ورود با شمارهٔ کاربر
        await page.locator("button:has-text('ورود')").first.click(timeout=15000)
        await page.wait_for_timeout(600)
        await page.locator("input[inputmode='tel']").first.fill("09105912852")
        await page.locator("button:has-text('ورود')").last.click(timeout=10000)
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUT}/onyx-2-app.png")

        # ۳) داشبورد ادمین
        await page.goto(f"{BASE}/admin", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(2500)
        await page.screenshot(path=f"{OUT}/onyx-3-admin.png")

        # بررسی رنگ پس‌زمینهٔ واقعی رندرشده
        bg = await page.evaluate("getComputedStyle(document.body).backgroundColor")
        print("body bg:", bg)
        await browser.close()

asyncio.run(main())
