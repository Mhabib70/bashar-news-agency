#!/usr/bin/env python3
"""تایپ رشتهٔ دلخواه در کنسول noVNC با dispatch مستقیم KeyboardEvent (پشتیبانی Shift)"""
import sys, json, subprocess

TEXT = sys.argv[1] if len(sys.argv) > 1 else ""

CODE_MAP = {}
for ch in "abcdefghijklmnopqrstuvwxyz":
    CODE_MAP[ch] = "Key" + ch.upper()
for d in "0123456789":
    CODE_MAP[d] = "Digit" + d
CODE_MAP.update({
    " ": "Space", "-": "Minus", "=": "Equal", ".": "Period",
    "/": "Slash", "\\": "Backslash", ";": "Semicolon", ",": "Comma",
    "[": "BracketLeft", "]": "BracketRight", "`": "Backquote",
    "'": "Quote",
})
# کاراکترهای نیاز به Shift + کلید پایه
SHIFT_MAP = {}
for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    SHIFT_MAP[ch] = ("Key" + ch, ch.lower())
SHIFT_MAP.update({
    "!": ("Digit1", "1"), "@": ("Digit2", "2"), "#": ("Digit3", "3"),
    "$": ("Digit4", "4"), "%": ("Digit5", "5"), "^": ("Digit6", "6"),
    "&": ("Digit7", "7"), "*": ("Digit8", "8"), "(": ("Digit9", "9"),
    ")": ("Digit0", "0"), "_": ("Minus", "-"), "+": ("Equal", "="),
    "?": ("Slash", "/"), "|": ("Backslash", "\\"), ":": ("Semicolon", ";"),
    '"': ("Quote", "'"), "<": ("Comma", ","), ">": ("Period", "."),
    "{": ("BracketLeft", "["), "}": ("BracketRight", "]"),
    "~": ("Backquote", "`"),
})

items = []
for ch in TEXT:
    if ch in SHIFT_MAP:
        code, base = SHIFT_MAP[ch]
        items.append({"key": "Shift", "code": "ShiftLeft", "special": "down"})
        items.append({"key": ch, "code": code})
        items.append({"key": "Shift", "code": "ShiftLeft", "special": "up"})
    else:
        items.append({"key": ch, "code": CODE_MAP.get(ch, "")})

js = """
(() => {
  const c = document.querySelector('canvas');
  if (!c) return 'NO_CANVAS';
  const kd = (k, code) => c.dispatchEvent(new KeyboardEvent('keydown', {key: k, code, bubbles: true}));
  const ku = (k, code) => c.dispatchEvent(new KeyboardEvent('keyup', {key: k, code, bubbles: true}));
  const seq = """ + json.dumps(json.dumps(items)) + """;
  const arr = JSON.parse(seq);
  for (const it of arr) {
    if (it.special === 'down') kd(it.key, it.code);
    else if (it.special === 'up') ku(it.key, it.code);
    else { kd(it.key, it.code); ku(it.key, it.code); }
  }
  return 'TYPED:' + arr.length;
})()
"""
r = subprocess.run(["agent-browser", "eval", js], capture_output=True, text=True, timeout=60)
print(r.stdout.strip()[-60:])

for flag in sys.argv[2:]:
    if flag == "--enter":
        je = """(() => { const c=document.querySelector('canvas');
        c.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
        c.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}));
        return 'ENTERED'; })()"""
        r = subprocess.run(["agent-browser", "eval", je], capture_output=True, text=True, timeout=60)
        print(r.stdout.strip()[-20:])
    elif flag == "--clear":
        # پاک کردن خط با ۶۰ بار Backspace
        jb = """(() => { const c=document.querySelector('canvas');
        for (let i=0;i<60;i++){
          c.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',code:'Backspace',bubbles:true}));
          c.dispatchEvent(new KeyboardEvent('keyup',{key:'Backspace',code:'Backspace',bubbles:true}));
        }
        return 'CLEARED'; })()"""
        r = subprocess.run(["agent-browser", "eval", jb], capture_output=True, text=True, timeout=60)
        print(r.stdout.strip()[-20:])
