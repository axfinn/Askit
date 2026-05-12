import type { Settings, Conversation } from './types'
import { PROVIDERS } from './providers'

const DEFAULT_SETTINGS: Settings = {
  provider: 'minimax',
  apiBase: PROVIDERS.minimax.apiBase,
  apiKey: '',
  model: PROVIDERS.minimax.models.chat,
  temperature: 0.7,
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(['askit_settings'])
  return { ...DEFAULT_SETTINGS, ...(result.askit_settings as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ askit_settings: settings })
}

export async function getConversation(): Promise<Conversation | null> {
  const result = await chrome.storage.local.get(['askit_conversation'])
  return (result.askit_conversation as Conversation | undefined) ?? null
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await chrome.storage.local.set({ askit_conversation: conv })
}

export async function clearConversation(): Promise<void> {
  await chrome.storage.local.remove(['askit_conversation'])
}
