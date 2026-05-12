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
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  messages: Message[]
  title: string
  createdAt: number
}

export type ActionType = 'explain' | 'translate' | 'summarize' | 'rewrite' | 'grammar' | 'chat'
