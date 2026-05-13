import { create } from 'zustand'
import type { Settings, Message, Conversation } from './types'
import { getSettings, saveSettings, getConversation, saveConversation, clearConversation } from './storage'

interface AppState {
  settings: Settings
  messages: Message[]
  isStreaming: boolean
  sidebarOpen: boolean
  conversationId: string

  setSettings: (s: Settings) => void
  addMessage: (msg: Message) => void
  updateLastMessage: (content: string) => void
  deleteMessage: (id: string) => void
  clearMessages: () => void
  newConversation: () => void
  setStreaming: (v: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void
  loadSettings: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debounceSave(state: AppState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const conv: Conversation = {
      id: state.conversationId,
      messages: state.messages,
      title: state.messages.find(m => m.role === 'user')?.content.substring(0, 30) || 'New Chat',
      createdAt: state.messages[0]?.timestamp || Date.now(),
    }
    saveConversation(conv)
  }, 500)
}

export const useStore = create<AppState>((set, get) => ({
  settings: {
    provider: 'minimax',
    apiBase: 'https://api.minimaxi.com/v1',
    apiKey: '',
    model: 'MiniMax-M2.7',
    temperature: 0.7,
  },
  messages: [],
  isStreaming: false,
  sidebarOpen: false,
  conversationId: crypto.randomUUID(),

  setSettings: (settings) => {
    set({ settings })
    saveSettings(settings)
  },
  addMessage: (msg) => {
    set((s) => ({ messages: [...s.messages, msg] }))
    debounceSave(get())
  },
  updateLastMessage: (content) => {
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      return { messages: msgs }
    })
    debounceSave(get())
  },
  deleteMessage: (id) => {
    set((s) => ({ messages: s.messages.filter(m => m.id !== id) }))
    debounceSave(get())
  },
  clearMessages: () => {
    set({ messages: [] })
    clearConversation()
  },
  newConversation: () => {
    const state = get()
    if (state.messages.length > 0) {
      const conv: Conversation = {
        id: state.conversationId,
        messages: state.messages,
        title: state.messages.find(m => m.role === 'user')?.content.substring(0, 30) || 'New Chat',
        createdAt: state.messages[0]?.timestamp || Date.now(),
      }
      saveConversation(conv)
    }
    set({ messages: [], conversationId: crypto.randomUUID() })
    clearConversation()
  },
  setStreaming: (isStreaming) => set({ isStreaming }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  loadSettings: async () => {
    const settings = await getSettings()
    set({ settings })
    const conv = await getConversation()
    if (conv && conv.messages.length > 0) {
      set({ messages: conv.messages, conversationId: conv.id })
    }
  },
}))
