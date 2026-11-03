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

// فشرده‌سازی عکس خبر پیش از آپلود: حداکثر ضلع ۱۶۰۰px و JPEG با کیفیت ۰.۸۵
// عکس‌های HEIC در مرورگر قابل پردازش نیستند → همان‌طور که هستند ارسال می‌شوند.
const MAX_SIDE = 1600
const UPLOAD_QUALITY = 0.85

export async function compressPhotoForUpload(file: File): Promise<File> {
  const heicLike = /hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  if (heicLike || !file.type.startsWith("image/") || file.type === "image/gif") return file
  try {
    const url = URL.createObjectURL(file)
    try {
      const img = document.createElement("img")
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error("decode"))
        img.src = url
      })
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      if (scale >= 1 && file.size < 900 * 1024) return file
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) return file
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", UPLOAD_QUALITY))
      if (!blob || blob.size >= file.size) return file
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return file
  }
}
