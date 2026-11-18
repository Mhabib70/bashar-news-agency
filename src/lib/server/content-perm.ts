import type { User } from "@prisma/client"

// مدیریت محتوا (تالار گفتگو و آموزش) — فقط ادمین کل، یا کارشناسی که ادمین کل به او اجازه داده.
// معادل تصمیم مدیریتی: «درج موضوع و درس فقط با من؛ در صورت اجازه، کارشناس هم بتواند».
export function canManageContent(user: Pick<User, "role" | "status" | "canManageContent">): boolean {
  if (user.role === "admin" && user.status === "active") return true
  return user.role === "specialist" && user.status === "active" && !!user.canManageContent
}
