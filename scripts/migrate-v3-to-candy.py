#!/usr/bin/env python3
"""مهاجرت سیستماتیک کلاس‌های تم قدیمی v3-* به توکن‌های Candy در همهٔ فایل‌های اپ.
ترتیب مهم است: الگوهای بلندتر/ترکیبی قبل از ساده‌ها جایگزین می‌شوند."""
import re, sys
from pathlib import Path

BASE = Path("/home/z/my-project/src")

# ---------- نگاشت‌های به‌ترتیب (old, new) ----------
REPL = [
    # --- فاز A: ترکیبی‌های دقیق (قبل از ساده‌ها) ---
    # دکمهٔ اصلی v3-btn با شکل‌های مختلف
    ("v3-btn-amber", "candy-btn-amber"),  # موقت تا بعداً بازنویسی دستی
    ("v3-btn-ghost", "candy-btn-ghost"),
    # گرادیان‌های تایل
    ("v3-tile-blue", "candy-tile-red"),
    ("v3-tile-amber", "candy-tile-amber"),
    # هاورهای ترکیبی
    ("hover:bg-[var(--v3-azure)]/20", "hover:bg-primary-fixed/55"),
    ("hover:bg-[var(--v3-azure)]/10", "hover:bg-primary-fixed/30"),
    ("hover:border-[var(--v3-azure)]/40", "hover:border-primary/40"),
    ("hover:border-[var(--v3-azure)]", "hover:border-primary/40"),
    ("hover:bg-[var(--v3-card-2)]", "hover:bg-surface-container"),
    ("hover:bg-[var(--v3-card)]", "hover:bg-surface-container"),
    ("bg-[var(--v3-azure-soft)]/60", "bg-primary-fixed/25"),
    ("bg-[var(--v3-azure-soft)]/50", "bg-primary-fixed/25"),
    ("bg-[var(--v3-azure-soft)]/30", "bg-primary-fixed/20"),
    ("bg-[var(--v3-azure-soft)]", "bg-primary-fixed/40"),
    ("bg-[var(--v3-amber-soft)]", "bg-warn/15"),
    ("bg-[var(--v3-card-2)]", "bg-surface-container-low"),
    ("bg-[var(--v3-card)]", "bg-surface-container-lowest"),
    ("bg-[var(--v3-azure)]", "bg-primary"),
    ("border-[var(--v3-azure)]/30", "border-primary/30"),
    ("border-[var(--v3-azure)]/35", "border-primary/35"),
    ("border-[var(--v3-azure)]", "border-primary/40"),
    ("border-[var(--v3-line)]", "border-outline-variant/50"),
    ("text-[var(--v3-azure-deep)]", "text-primary"),
    ("text-[var(--v3-azure-2)]", "text-primary"),
    ("text-[var(--v3-azure)]", "text-primary"),
    ("text-[var(--v3-amber)]", "text-warn"),
    ("text-[var(--v3-ink-2)]", "text-on-surface-variant"),
    ("text-[var(--v3-ink)]/70", "text-on-surface-variant/80"),
    ("text-[var(--v3-ink)]/80", "text-on-surface-variant/85"),
    ("text-[var(--v3-ink)]", "text-on-surface"),
    ("bg-[var(--v3-ink)]", "bg-on-surface"),

    # --- فاز B: رفرنس‌های var داخل style={{...}} و کلاس‌های باقیمانده ---
    ("var(--v3-azure-deep)", "var(--primary-deep, #7c2923)"),
    ("var(--v3-azure-2)", "var(--primary)"),
    ("var(--v3-azure-soft)", "var(--primary-fixed)"),
    ("var(--v3-azure)", "var(--primary)"),
    ("var(--v3-amber-soft)", "rgba(180, 83, 9, 0.12)"),
    ("var(--v3-amber)", "var(--warn)"),
    ("var(--v3-card-2)", "var(--surface-ctnr-low)"),
    ("var(--v3-card)", "var(--surface-ctnr-lowest)"),
    ("var(--v3-ink-2)", "var(--on-surface-variant)"),
    ("var(--v3-ink)", "var(--on-surface)"),
    ("var(--v3-line)", "var(--outline-variant)"),
    ("var(--v3-navy-deep)", "var(--primary-deep, #7c2923)"),
    ("var(--v3-navy-2)", "var(--primary-container)"),
    ("var(--v3-navy)", "var(--primary)"),
    ("var(--v3-navy-ink)", "var(--on-primary)"),
    ("var(--v3-navy-muted)", "var(--primary-fixed-dim)"),
    ("var(--v3-shadow-sm)", "0 8px 24px -4px rgba(83, 37, 23, 0.08)"),
    ("var(--v3-shadow)", "0 16px 40px -16px rgba(83, 37, 23, 0.16)"),
    ("var(--v3-page)", "var(--surface)"),

    # --- فاز C: کلاس‌های کمکی v3 → فرم Candy ---
    # v3-card: سفید گرد ۲۴ با شِدو Candy (مثل کارت‌های rounded-3xl JSX)
    ("v3-card-flat", "rounded-2xl border border-outline-variant/40 bg-surface-container-lowest"),
    ("v3-card", "rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-[0_8px_24px_-4px_rgba(83,37,23,0.05)]"),
    # چیپ‌ها
    ("v3-chip-amber", "rounded-full bg-warn/15 px-2.5 py-1 text-[10.5px] font-bold text-warn"),
    ("v3-chip", "rounded-full bg-primary-fixed/40 px-2.5 py-1 text-[10.5px] font-bold text-on-primary-fixed"),
    # نمایشگر عدد
    ("v3-num", "font-black tracking-tight"),
    # حلقه
    ("v3-ring", "ring-anim"),
]

def process(path: Path) -> tuple[int, int]:
    src = path.read_text(encoding="utf-8")
    orig = src
    count = 0
    for old, new in REPL:
        n = src.count(old)
        if n:
            src = src.replace(old, new)
            count += n
    if src != orig:
        path.write_text(src, encoding="utf-8")
    return count, src.count("v3-")

def main():
    files = sorted(BASE.rglob("*.tsx")) + sorted(BASE.rglob("*.ts"))
    total = 0
    print("فایل | جایگزینی | باقیمانده v3")
    for f in files:
        n, rest = process(f)
        if n or rest:
            print(f"{f.relative_to(BASE.parent)}: {n} replaced, {rest} remaining")
            total += n
    print(f"\nجمع جایگزینی: {total}")

if __name__ == "__main__":
    main()
