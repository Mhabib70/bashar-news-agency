#!/usr/bin/env python3
"""اسکرین‌شات سایت لایو خبرگزاری بسیج رشت"""
from playwright.sync_api import sync_playwright

URLS = [
    ("http://80.91.208.240/", "/home/z/my-project/download/live-home.png"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="fa-IR")
    for url, path in URLS:
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(5000)
        title = page.title()
        body_len = page.evaluate("document.body ? document.body.innerText.length : 0")
        page.screenshot(path=path, full_page=False)
        print(f"{url} | title={title[:40]} | body_text={body_len} chars | saved={path}")
        page.close()
    browser.close()
