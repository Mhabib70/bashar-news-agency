// تغییر اندازه عکس پروفایل در سمت کلاینت: مربع‌سازی مرکزی + فشرده‌سازی JPEG
const SIDE = 320
const QUALITY = 0.82

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("فقط فایل تصویری مجاز است")
  const url = URL.createObjectURL(file)
  try {
    const img = document.createElement("img")
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error("خواندن عکس ناموفق بود"))
      img.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (side < 40) throw new Error("عکس خیلی کوچک است")
    const canvas = document.createElement("canvas")
    canvas.width = SIDE
    canvas.height = SIDE
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("پردازش عکس پشتیبانی نمی‌شود")
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIDE, SIDE)
    return canvas.toDataURL("image/jpeg", QUALITY)
  } finally {
    URL.revokeObjectURL(url)
  }
}
