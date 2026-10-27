import { db } from "@/lib/db"

// کد چالش بعدی: CH-1001، CH-1002 و ...
export async function nextChallengeCode(): Promise<string> {
  const last = await db.challenge.findFirst({ orderBy: { id: "desc" }, select: { id: true } })
  return `CH-${1001 + (last?.id ?? 0)}`
}
