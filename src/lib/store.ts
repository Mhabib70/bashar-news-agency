"use client"

import { create } from "zustand"
import type { AppState } from "@/lib/server/state"

export type Tab = "home" | "news" | "activity" | "profile" | "review"

type SubmitPayload = {
  category: string
  title: string
  content: string
  mediaType: string
  durationMin: number
  challengeId?: number | null
  draftId?: number | null
}

type Result = { ok: boolean; message?: string; pointsEarned?: number; badgesAwarded?: string[] }

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
  reviewNews: (newsId: number, action: "approve" | "reject", reason?: string, note?: string) => Promise<Result>
  resubmitNews: (newsId: number, title?: string, content?: string, category?: string) => Promise<Result>
  joinChallenge: (challengeId: number) => Promise<Result>
  saveDraft: (p: { category: string; title: string; content: string; draftId?: number | null }) => Promise<Result>
  deleteDraft: (id: number) => Promise<Result>
  saveSettings: (p: Partial<AppState["notifSettings"]>) => Promise<Result>
  register: (p: { fullName: string; phone: string; age: string; education: string; district: string; base: string }) => Promise<{ ok: boolean; userId?: string; message?: string }>
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

  reviewNews: async (newsId, action, reason, note) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/news/review", {
        method: "POST",
        body: JSON.stringify({ userId: uid, newsId, action, reason, note }),
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
      const r = await api<{ ok: boolean; userId: string; message: string }>("/api/register", {
        method: "POST",
        body: JSON.stringify(p),
      })
      return { ok: true, userId: r.userId, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },
}))
