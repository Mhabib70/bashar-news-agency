"use client"

import { create } from "zustand"
import type { AppState } from "@/lib/server/state"

export type Tab = "home" | "news" | "activity" | "profile" | "review"

type SubmitPayload = {
  category: string
  title: string
  content: string
  mediaType: string
  mediaUrl?: string
  durationMin: number
  challengeId?: number | null
  draftId?: number | null
}

type Result = { ok: boolean; message?: string; pointsEarned?: number; badgesAwarded?: string[] }

export type UserInfo = {
  id: string; fullName: string; username: string; role: string; status: string; rejectReason: string
  district: string; base: string; phone: string; age: string; education: string
  points: number; levelKey: string; currentStreak: number; bestStreak: number; avatar: string
  lastActivityAt: string | null; createdAt: string
}

export type AdminUserDetail = {
  user: UserInfo
  stats: { newsTotal: number; approved: number; rejected: number; pending: number; approveRate: number; rank: number | null }
  badges: { key: string; awardedAt: string }[]
  pointsLog: { amount: number; reason: string; createdAt: string }[]
  news: { id: number; code: string; title: string; status: string; category: string; createdAt: string }[]
  participations: { challengeId: number; count: number; joinedAt: string; challengeTitle: string; challengeStatus: string }[]
}

export type AdminOverview = {
  users: { active: number; pending: number; rejected: number; reporters: number }
  news: { pendingTotal: number; stageDistrict: number; stageSpecialist: number; stageAdmin: number; approved: number; rejected: number; today: number; week: number; pointsToday: number }
  challenges: { active: number }
  recentUsers: { id: string; fullName: string; avatar: string; district: string; base: string; role: string; status: string; createdAt: string }[]
  recentNews: { id: number; code: string; title: string; status: string; reviewStage: string; createdAt: string; reporter: { fullName: string } }[]
  recentBroadcasts: { title: string; body: string; at: string; recipients: number }[]
}

type Store = {
  userId: string | null
  state: AppState | null
  loading: boolean
  tab: Tab
  booted: boolean
  setTab: (t: Tab) => void
  login: (userId: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  submitNews: (p: SubmitPayload) => Promise<Result>
  reviewNews: (newsId: number, action: "approve" | "reject", reason?: string, note?: string, mode?: "advance" | "final") => Promise<Result>
  resubmitNews: (newsId: number, title?: string, content?: string, category?: string) => Promise<Result>
  joinChallenge: (challengeId: number) => Promise<Result>
  createChallenge: (p: { title: string; description: string; reward: string; deadlineAt: string }) => Promise<Result>
  finishChallenge: (challengeId: number) => Promise<Result>
  broadcast: (title: string, text: string) => Promise<Result>
  fetchUsers: () => Promise<UserInfo[]>
  moderateUser: (targetId: string, action: "approve" | "reject", reason?: string) => Promise<Result>
  setUserRole: (targetId: string, newRole: "reporter" | "district_manager" | "specialist", newDistrict?: string) => Promise<Result>
  uploadMedia: (file: File) => Promise<{ ok: boolean; url?: string; mediaType?: string; message?: string }>
  uploadAvatar: (dataUrl: string) => Promise<Result>
  fetchUserDetail: (targetId: string) => Promise<AdminUserDetail | null>
  fetchAdminOverview: () => Promise<AdminOverview | null>
  saveDraft: (p: { category: string; title: string; content: string; draftId?: number | null }) => Promise<Result>
  deleteDraft: (id: number) => Promise<Result>
  saveSettings: (p: Partial<AppState["notifSettings"]>) => Promise<Result>
  register: (p: { fullName: string; phone: string; age: string; education: string; district: string; base: string }) => Promise<{ ok: boolean; userId?: string; status?: string; message?: string }>
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "خطای غیرمنتظره")
  return data as T
}

export const useApp = create<Store>((set, get) => ({
  userId: null,
  state: null,
  loading: false,
  tab: "home",
  booted: false,

  setTab: (t) => set({ tab: t }),

  login: async (userId) => {
    set({ loading: true })
    try {
      const state = await api<AppState>(`/api/state?userId=${encodeURIComponent(userId)}`)
      localStorage.setItem("newsapp_uid", userId)
      set({ userId, state, tab: "home", booted: true })
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem("newsapp_uid")
    set({ userId: null, state: null, tab: "home", booted: true })
  },

  refresh: async () => {
    const uid = get().userId
    if (!uid) return
    try {
      const state = await api<AppState>(`/api/state?userId=${encodeURIComponent(uid)}`)
      set({ state })
    } catch {
      /* silent */
    }
  },

  submitNews: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/news", {
        method: "POST",
        body: JSON.stringify({ userId: uid, ...p }),
      })
      await get().refresh()
      return { ok: true, message: r.message, pointsEarned: r.pointsEarned, badgesAwarded: r.badgesAwarded }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  reviewNews: async (newsId, action, reason, note, mode) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>('/api/news/review', {
        method: "POST",
        body: JSON.stringify({ userId: uid, newsId, action, reason, note, mode }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  resubmitNews: async (newsId, title, content, category) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/news/resubmit", {
        method: "POST",
        body: JSON.stringify({ userId: uid, newsId, title, content, category }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  joinChallenge: async (challengeId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/challenges/join", {
        method: "POST",
        body: JSON.stringify({ userId: uid, challengeId }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  createChallenge: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/challenges", {
        method: "POST",
        body: JSON.stringify({ userId: uid, ...p }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  finishChallenge: async (challengeId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/challenges/finish", {
        method: "POST",
        body: JSON.stringify({ userId: uid, challengeId }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  broadcast: async (title, text) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/broadcast", {
        method: "POST",
        body: JSON.stringify({ userId: uid, title, text }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  fetchUsers: async () => {
    const uid = get().userId
    if (!uid) return []
    try {
      const r = await api<{ users: UserInfo[] }>(`/api/users?userId=${encodeURIComponent(uid)}`)
      return r.users
    } catch {
      return []
    }
  },

  moderateUser: async (targetId, action, reason) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify({ userId: uid, targetId, action, reason }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  setUserRole: async (targetId, newRole, newDistrict) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify({ userId: uid, targetId, action: "set_role", newRole, newDistrict }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  uploadMedia: async (file) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const fd = new FormData()
      fd.append("userId", uid)
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "بارگذاری ناموفق بود")
      return { ok: true, url: data.url, mediaType: data.mediaType, message: data.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  uploadAvatar: async (dataUrl) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/user/avatar", {
        method: "POST",
        body: JSON.stringify({ userId: uid, avatar: dataUrl }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  fetchUserDetail: async (targetId) => {
    const uid = get().userId
    if (!uid) return null
    try {
      const r = await api<AdminUserDetail>(`/api/users?userId=${encodeURIComponent(uid)}&targetId=${encodeURIComponent(targetId)}`)
      return r
    } catch {
      return null
    }
  },

  fetchAdminOverview: async () => {
    const uid = get().userId
    if (!uid) return null
    try {
      return await api<AdminOverview>(`/api/admin/overview?userId=${encodeURIComponent(uid)}`)
    } catch {
      return null
    }
  },

  saveDraft: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/drafts", {
        method: "POST",
        body: JSON.stringify({ userId: uid, ...p }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  deleteDraft: async (id) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>(`/api/drafts?id=${id}&userId=${encodeURIComponent(uid)}`, { method: "DELETE" })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  saveSettings: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ userId: uid, ...p }),
      })
      await get().refresh()
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  register: async (p) => {
    try {
      const r = await api<{ ok: boolean; userId: string; status: string; message: string }>("/api/register", {
        method: "POST",
        body: JSON.stringify(p),
      })
      return { ok: true, userId: r.userId, status: r.status, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },
}))
