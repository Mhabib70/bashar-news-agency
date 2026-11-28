# -*- coding: utf-8 -*-
"""تست fallback توکن: ورود واقعی از UI → پاک‌سازی کامل کوکی‌ها → ناوبری مجدد.
اگر اپ بدون هیچ کوکی‌ای با هدر x-session-token کار کند، مشکل آیفریم/وب‌ویو حل است."""
import asyncio
from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/download"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 800}, locale="fa-IR")
        page = await ctx.new_page()

        # ۱) ورود واقعی از رابط کاربری
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.locator("button:has-text('ورود')").first.click(timeout=15000)
        await page.wait_for_timeout(600)
        await page.locator("input[inputmode='tel']").first.fill("09105912852")
        await page.locator("button:has-text('ورود')").last.click(timeout=10000)
        await page.wait_for_timeout(3000)
        tok = await page.evaluate("(() => { try { return localStorage.getItem('newsapp_token') || '' } catch { return '' } })()")
        print("step1 token saved:", bool(tok), "| len:", len(tok))

        # ۲) پاک‌سازی کامل کوکی‌ها — شبیه محیطی که کوکی ذخیره نمی‌کند
        await ctx.clear_cookies()
        cookies = await ctx.cookies()
        print("step2 cookies after clear:", len(cookies))

        # ۳) ورود به اپ و داشبورد ادمین — فقط با توکن هدر
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(2000)
        body = await page.inner_text("body")
        logged = "خوش آمدی" in body or "ارسال خبر" in body or "خبرنگار" in body
        await page.screenshot(path=f"{OUT}/pv-nocookie-app.png")
        print("step3 app state (no cookie):", "LOGGED-IN" if logged else "UNKNOWN")

        await page.goto(f"{BASE}/admin", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(2500)
        admin_body = await page.inner_text("body")
        admin_ok = "داشبورد" in admin_body and "کاربران" in admin_body
        print("step4 admin (no cookie):", admin_ok, "| url:", page.url)
        await page.screenshot(path=f"{OUT}/pv-nocookie-admin.png")

        await browser.close()
        print("RESULT:", "PASS" if (tok and admin_ok) else "FAIL")

asyncio.run(main())
