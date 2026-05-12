import { create } from 'zustand'
import type { Settings, Message } from './types'
import { getSettings } from './storage'

interface AppState {
  settings: Settings
  messages: Message[]
  isStreaming: boolean
  sidebarOpen: boolean

  setSettings: (s: Settings) => void
  addMessage: (msg: Message) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void
  setStreaming: (v: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void
  loadSettings: () => Promise<void>
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

  setSettings: (settings) => set({ settings }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content }
      return { messages: msgs }
    }),
  clearMessages: () => set({ messages: [] }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  loadSettings: async () => {
    const settings = await getSettings()
    set({ settings })
  },
}))
