import type { Settings, Conversation, ConversationMeta, CustomPrompt } from './types'
import { PROVIDERS } from './providers'

const DEFAULT_SETTINGS: Settings = {
  provider: 'minimax',
  apiBase: PROVIDERS.minimax.apiBase,
  apiKey: '',
  model: PROVIDERS.minimax.models.chat,
  temperature: 0.7,
  webSearch: false,
}

function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id
  } catch {
    return false
  }
}

export async function getSettings(): Promise<Settings> {
  if (!isContextValid()) return { ...DEFAULT_SETTINGS }
  try {
    const result = await chrome.storage.sync.get(['askit_settings'])
    return { ...DEFAULT_SETTINGS, ...(result.askit_settings as Partial<Settings> | undefined) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!isContextValid()) return
  try {
    await chrome.storage.sync.set({ askit_settings: settings })
  } catch {}
}

export async function getConversation(): Promise<Conversation | null> {
  if (!isContextValid()) return null
  try {
    const result = await chrome.storage.local.get(['askit_conversation', 'askit_conversation_url'])
    const conv = (result.askit_conversation as Conversation | undefined) ?? null
    if (!conv) return null
    const savedUrl = result.askit_conversation_url as string | undefined
    if (savedUrl && savedUrl !== location.href) return null
    return conv
  } catch {
    return null
  }
}

export async function saveConversation(conv: Conversation): Promise<void> {
  if (!isContextValid()) return
  try {
    await chrome.storage.local.set({ askit_conversation: conv, askit_conversation_url: location.href })
  } catch {}
}

export async function clearConversation(): Promise<void> {
  if (!isContextValid()) return
  try {
    await chrome.storage.local.remove(['askit_conversation'])
  } catch {}
}

// --- Conversation History ---

export async function getConversationHistory(): Promise<ConversationMeta[]> {
  if (!isContextValid()) return []
  try {
    const result = await chrome.storage.local.get(['askit_history'])
    return (result.askit_history as ConversationMeta[] | undefined) ?? []
  } catch {
    return []
  }
}

export async function saveToHistory(conv: Conversation): Promise<void> {
  if (!isContextValid()) return
  try {
    const history = await getConversationHistory()
    const meta: ConversationMeta = {
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt ?? Date.now(),
      messageCount: conv.messages.length,
    }
    const idx = history.findIndex(h => h.id === conv.id)
    if (idx >= 0) history[idx] = meta
    else history.unshift(meta)
    // Keep last 100 conversations
    await chrome.storage.local.set({ askit_history: history.slice(0, 100) })
    await chrome.storage.local.set({ [`askit_conv_${conv.id}`]: conv })
  } catch {}
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  if (!isContextValid()) return null
  try {
    const result = await chrome.storage.local.get([`askit_conv_${id}`])
    return (result[`askit_conv_${id}`] as Conversation | undefined) ?? null
  } catch {
    return null
  }
}

export async function deleteConversation(id: string): Promise<void> {
  if (!isContextValid()) return
  try {
    const history = await getConversationHistory()
    const filtered = history.filter(h => h.id !== id)
    await chrome.storage.local.set({ askit_history: filtered })
    await chrome.storage.local.remove([`askit_conv_${id}`])
  } catch {}
}

// --- Custom Prompts ---

export async function getCustomPrompts(): Promise<CustomPrompt[]> {
  if (!isContextValid()) return []
  try {
    const result = await chrome.storage.sync.get(['askit_prompts'])
    return (result.askit_prompts as CustomPrompt[] | undefined) ?? []
  } catch {
    return []
  }
}

export async function saveCustomPrompts(prompts: CustomPrompt[]): Promise<void> {
  if (!isContextValid()) return
  try {
    await chrome.storage.sync.set({ askit_prompts: prompts })
  } catch {}
}
