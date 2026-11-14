"use client"

import { create } from "zustand"
import type { AppState, NewsDTO } from "@/lib/server/state"
import { applyOrgUnits } from "@/lib/domain"

export type { NewsDTO } from "@/lib/server/state"

export type Tab = "home" | "news" | "activity" | "profile" | "review"

type SubmitPayload = {
  category: string
  title: string
  content: string
  mediaType: string
  mediaUrl?: string
  durationMin: number
  /** تاریخ و ساعت تهیه خبر (ISO) */
  preparedAt?: string | null
  challengeId?: number | null
  draftId?: number | null
}

type Result = { ok: boolean; message?: string; pointsEarned?: number; badgesAwarded?: string[] }

export type UserInfo = {
  id: string; fullName: string; username: string; role: string; status: string; rejectReason: string
  district: string; base: string; phone: string; age: string; education: string
  points: number; levelKey: string; currentStreak: number; bestStreak: number; avatar: string
  lastActivityAt: string | null; createdAt: string
  /** حساب محافظت‌شدهٔ ادمین کل سامانه — از سمت سرور محاسبه می‌شود */
  isSuperAdmin?: boolean
  /** مجوز ارسال خبر به کانال ایتا (کارشناس، فقط با اجازهٔ ادمین کل) */
  canSendEitaa?: boolean
}

export type AdminUserDetail = {
  user: UserInfo
  stats: { newsTotal: number; approved: number; rejected: number; pending: number; approveRate: number; rank: number | null }
  badges: { key: string; awardedAt: string }[]
  pointsLog: { amount: number; reason: string; createdAt: string }[]
  news: { id: number; code: string; title: string; status: string; category: string; createdAt: string }[]
  participations: { challengeId: number; count: number; joinedAt: string; challengeTitle: string; challengeStatus: string }[]
}

export type TrainingItem = {
  id: number; title: string; body: string; kind: string; fileUrl: string
  category: string; level: string; minutes: number; views: number
  authorName: string; createdAt: string; readers: number; completed: boolean
}

export type TrainingFeed = {
  trainings: TrainingItem[]
  stats: { total: number; completed: number; minutes: number }
}

export type ForumTopicItem = {
  id: number; title: string; type: string; pinned: boolean; createdBy: string; creatorName: string
  createdAt: string; replies?: number; participants?: number; lastActivity?: string
  lastMessage?: { body: string; authorName: string; at: string } | null
}

export type ForumReactionGroup = {
  emoji: string; count: number; mine: boolean
  users: { id: string; name: string; avatar: string }[]
}

export type ForumMessageItem = {
  id: number; userId: string; authorName: string; authorRole: string
  body: string; fileUrl: string; createdAt: string
  replyTo?: { id: number; body: string; authorName: string } | null
  reactions: ForumReactionGroup[]
  authorAvatar?: string
  authorLevelEmoji?: string
  authorOnline?: boolean
}

export type ForumMemberItem = {
  id: string; fullName: string; avatar: string; role: string; online: boolean
  forumPoints?: number
  levelEmoji?: string
}

export type ForumPollItem = {
  id: number; question: string; options: string[]
  votes: Record<string, number>; counts: number[]; totalVotes: number
  createdBy: string; createdAt: string
}

// تخته افتخار هفته — برترین‌های فعال تالار در ۷ روز اخیر
export type ForumHonorRow = {
  id: string; fullName: string; avatar: string; role: string
  levelEmoji: string; weeklyScore: number; messages: number; badges: string[]
}

export type ForumWeeklyQuestionItem = {
  id: number; question: string; topicId: number; topicTitle: string
  creatorName: string; createdAt: string
}

export type ForumViewerStats = {
  weeklyScore: number; weeklyMessages: number
  rank: number | null; totalForumPoints: number; badges: string[]
}

export type ForumTopicsResult = {
  topics: ForumTopicItem[]
  members: ForumMemberItem[]
  viewer: { id: string; role: string }
  honorBoard?: ForumHonorRow[]
  viewerStats?: ForumViewerStats
  weeklyQuestion?: ForumWeeklyQuestionItem | null
}

export type ForumThreadResult = {
  topic: ForumTopicItem
  messages: ForumMessageItem[]
  polls: ForumPollItem[]
  members: ForumMemberItem[]
  viewer: { id: string; role: string }
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
  login: () => Promise<void>
  logout: () => Promise<void>
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
  setUserRole: (targetId: string, newRole: "reporter" | "district_manager" | "specialist" | "admin", newDistrict?: string) => Promise<Result>
  editNews: (newsId: number, p: { title: string; content: string }) => Promise<Result>
  sendToEitaa: (newsId: number) => Promise<Result>
  markNotificationsRead: () => Promise<void>
  fetchAllNews: () => Promise<NewsDTO[]>
  deleteNews: (newsId: number) => Promise<Result>
  fetchTrainings: () => Promise<TrainingFeed | null>
  createTraining: (p: { title: string; body: string; kind: string; fileUrl?: string; category: string; level: string; minutes: number }) => Promise<Result>
  deleteTraining: (id: number) => Promise<Result>
  viewTraining: (id: number) => Promise<void>
  toggleTrainingComplete: (id: number) => Promise<Result & { completed?: boolean }>
  fetchForumTopics: () => Promise<ForumTopicsResult | null>
  fetchForumMessages: (topicId: number) => Promise<ForumThreadResult | null>
  createForumTopic: (title: string, type: string) => Promise<Result & { id?: number }>
  sendForumMessage: (p: { topicId: number; body: string; fileUrl?: string; replyToId?: number | null }) => Promise<Result>
  reactForumMessage: (messageId: number, emoji: string) => Promise<Result & { active?: boolean }>
  createForumPoll: (p: { topicId: number; question: string; options: string[] }) => Promise<Result>
  voteForumPoll: (pollId: number, optionIndex: number) => Promise<Result>
  deleteForumPoll: (pollId: number) => Promise<Result>
  deleteForumTopic: (topicId: number) => Promise<Result>
  deleteForumMessage: (messageId: number) => Promise<Result>
  pinForumTopic: (topicId: number) => Promise<Result>
  setForumWeeklyQuestion: (question: string) => Promise<Result>
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
    // کوکی نشست (HttpOnly) به‌صورت خودکار همراه درخواست فرستاده می‌شود
    credentials: "same-origin",
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

  login: async () => {
    set({ loading: true })
    try {
      // هویت از نشست (کوکی) خوانده می‌شود — کلاینت نقشی در تعیین آن ندارد
      const state = await api<AppState>(`/api/state`)
      if (state.districts?.length) applyOrgUnits(state.districts)
      localStorage.setItem("newsapp_uid", state.user.id)
      set({ userId: state.user.id, state, tab: "home", booted: true })
    } catch (e) {
      // نشست نامعتبر/منقضی — پاک‌سازی و بازگشت به صفحه ورود (نه گیر کردن روی اسکلت)
      localStorage.removeItem("newsapp_uid")
      set({ userId: null, state: null, tab: "home", booted: true })
      throw e
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    // حذف کوکی نشست از سمت سرور
    await api("/api/logout", { method: "POST" }).catch(() => {})
    localStorage.removeItem("newsapp_uid")
    set({ userId: null, state: null, tab: "home", booted: true })
  },

  refresh: async () => {
    const uid = get().userId
    if (!uid) return
    try {
      const state = await api<AppState>(`/api/state`)
      if (state.districts?.length) applyOrgUnits(state.districts)
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
        body: JSON.stringify({ ...p }),
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
        body: JSON.stringify({ newsId, action, reason, note, mode }),
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
        body: JSON.stringify({ newsId, title, content, category }),
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
        body: JSON.stringify({ challengeId }),
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
        body: JSON.stringify({ ...p }),
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
        body: JSON.stringify({ challengeId }),
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
        body: JSON.stringify({ title, text }),
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
      const r = await api<{ users: UserInfo[] }>(`/api/users`)
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
        body: JSON.stringify({ targetId, action, reason }),
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
        body: JSON.stringify({ targetId, action: "set_role", newRole, newDistrict }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  editNews: async (newsId, p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/news/edit", {
        method: "POST",
        body: JSON.stringify({ newsId, title: p.title, content: p.content }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  sendToEitaa: async (newsId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/news/eitaa", {
        method: "POST",
        body: JSON.stringify({ newsId }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  markNotificationsRead: async () => {
    const uid = get().userId
    if (!uid) return
    try {
      await api("/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({}),
      })
      await get().refresh()
    } catch {
      /* silent */
    }
  },

  fetchAllNews: async () => {
    const uid = get().userId
    if (!uid) return []
    try {
      const r = await api<{ news: NewsDTO[] }>(`/api/news/all`)
      return r.news ?? []
    } catch {
      return []
    }
  },

  deleteNews: async (newsId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/news/delete", {
        method: "POST",
        body: JSON.stringify({ newsId }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  fetchTrainings: async () => {
    const uid = get().userId
    if (!uid) return null
    try {
      const r = await api<TrainingFeed>(`/api/training`)
      return { trainings: r.trainings ?? [], stats: r.stats ?? { total: 0, completed: 0, minutes: 0 } }
    } catch {
      return null
    }
  },

  createTraining: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/training", {
        method: "POST",
        body: JSON.stringify({ action: "create", ...p }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  deleteTraining: async (id) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/training", {
        method: "POST",
        body: JSON.stringify({ action: "delete", id }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  viewTraining: async (id) => {
    const uid = get().userId
    if (!uid) return
    try {
      await api("/api/training", { method: "POST", body: JSON.stringify({ action: "view", id }) })
    } catch { /* بازدید غیرحیاتی است */ }
  },

  toggleTrainingComplete: async (id) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string; completed?: boolean }>("/api/training", {
        method: "POST",
        body: JSON.stringify({ action: "complete", id }),
      })
      return { ok: true, completed: r.completed, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  fetchForumTopics: async () => {
    const uid = get().userId
    if (!uid) return null
    try {
      return await api<ForumTopicsResult>(`/api/forum`)
    } catch {
      return null
    }
  },

  fetchForumMessages: async (topicId) => {
    const uid = get().userId
    if (!uid) return null
    try {
      return await api<ForumThreadResult>(`/api/forum?topicId=${topicId}`)
    } catch {
      return null
    }
  },

  createForumTopic: async (title, type) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { id?: number; message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "topic", title, type }),
      })
      return { ok: true, id: r.id, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  sendForumMessage: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      await api("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "message", topicId: p.topicId, body: p.body, fileUrl: p.fileUrl, replyToId: p.replyToId ?? null }),
      })
      return { ok: true, message: "پیام ارسال شد" }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  reactForumMessage: async (messageId, emoji) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { active?: boolean; message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "react", messageId, emoji }),
      })
      return { ok: true, active: r.active, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  createForumPoll: async (p) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "poll_create", topicId: p.topicId, question: p.question, options: p.options }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  voteForumPoll: async (pollId, optionIndex) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "poll_vote", pollId, optionIndex }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  deleteForumPoll: async (pollId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "poll_delete", pollId }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  deleteForumTopic: async (topicId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "delete_topic", topicId }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  deleteForumMessage: async (messageId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "delete_message", messageId }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  pinForumTopic: async (topicId) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "pin", topicId }),
      })
      return { ok: true, message: r.message }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  },

  setForumWeeklyQuestion: async (question) => {
    const uid = get().userId
    if (!uid) return { ok: false }
    try {
      const r = await api<Result & { message: string }>("/api/forum", {
        method: "POST",
        body: JSON.stringify({ action: "weekly_question", question }),
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
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "same-origin" })
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
        body: JSON.stringify({ avatar: dataUrl }),
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
      const r = await api<AdminUserDetail>(`/api/users?targetId=${encodeURIComponent(targetId)}`)
      return r
    } catch {
      return null
    }
  },

  fetchAdminOverview: async () => {
    const uid = get().userId
    if (!uid) return null
    try {
      return await api<AdminOverview>(`/api/admin/overview`)
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
        body: JSON.stringify({ ...p }),
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
      const r = await api<Result & { message: string }>(`/api/drafts?id=${id}`, { method: "DELETE" })
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
        body: JSON.stringify({ ...p }),
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
