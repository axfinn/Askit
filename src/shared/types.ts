export interface Provider {
  id: string
  name: string
  apiBase: string
  models: { chat: string; image?: string; tts?: string; music?: string; vision?: string }
}

export interface Settings {
  provider: string
  apiBase: string
  apiKey: string
  model: string
  temperature: number
  webSearch?: boolean
  providerKeys?: Record<string, string>
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  imageUrl?: string
}

export interface Conversation {
  id: string
  messages: Message[]
  title: string
  createdAt: number
  updatedAt?: number
}

export interface ConversationMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface WritingTemplate {
  id: string
  icon: string
  title: string
  category: string
  prompt: string
}

export interface CustomPrompt {
  id: string
  title: string
  prompt: string
  createdAt: number
}

export type ActionType = 'explain' | 'translate' | 'summarize' | 'rewrite' | 'grammar' | 'chat'

export type PageType = 'normal' | 'youtube' | 'pdf' | 'search'
