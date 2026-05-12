import type { Provider } from './types'

export const PROVIDERS: Record<string, Provider> = {
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    apiBase: 'https://api.minimaxi.com/v1',
    models: {
      chat: 'MiniMax-M2.7',
      image: 'image-01',
      tts: 'speech-01',
      music: 'music-2.6',
      vision: 'MiniMax-VL-01',
    },
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiBase: 'https://api.deepseek.com/v1',
    models: { chat: 'deepseek-chat' },
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiBase: 'https://api.openai.com/v1',
    models: {
      chat: 'gpt-4o',
      image: 'dall-e-3',
      tts: 'tts-1',
      vision: 'gpt-4o',
    },
  },
}

export function getProvider(id: string): Provider {
  return PROVIDERS[id] ?? PROVIDERS.minimax
}
