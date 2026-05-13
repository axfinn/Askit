import type { Settings, Message } from './types'
import { getProvider, PROVIDERS } from './providers'

function getMediaSettings(settings: Settings, capability: 'image' | 'tts' | 'music' | 'vision'): { apiBase: string; apiKey: string; model: string; providerId: string } {
  const currentProvider = getProvider(settings.provider)
  if (currentProvider.models[capability]) {
    return { apiBase: settings.apiBase, apiKey: settings.apiKey, model: currentProvider.models[capability]!, providerId: currentProvider.id }
  }
  for (const p of Object.values(PROVIDERS)) {
    if (p.models[capability]) {
      const key = settings.providerKeys?.[p.id] || settings.apiKey
      return { apiBase: p.apiBase, apiKey: key, model: p.models[capability]!, providerId: p.id }
    }
  }
  throw new Error(`没有可用的${capability}模型`)
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}

export async function streamChat(
  settings: Settings,
  messages: Pick<Message, 'role' | 'content'>[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  options?: { webSearch?: boolean }
): Promise<void> {
  const { apiBase, apiKey, model, temperature } = settings

  if (options?.webSearch) {
    await streamChatWithWebSearch(settings, messages, callbacks, signal)
    return
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API ${response.status}: ${text}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let sseBuffer = ''
  let thinkBuffer = ''
  let inThink = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    sseBuffer += decoder.decode(value, { stream: true })
    const lines = sseBuffer.split('\n')
    sseBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      try {
        const data = JSON.parse(line.slice(6))
        const token = data.choices?.[0]?.delta?.content
        if (!token) continue

        thinkBuffer += token
        while (thinkBuffer) {
          if (inThink) {
            const endIdx = thinkBuffer.indexOf('</think>')
            if (endIdx === -1) { thinkBuffer = ''; break }
            thinkBuffer = thinkBuffer.slice(endIdx + 8)
            inThink = false
          } else {
            const startIdx = thinkBuffer.indexOf('<think>')
            if (startIdx === -1) {
              fullText += thinkBuffer
              callbacks.onToken(thinkBuffer)
              thinkBuffer = ''
            } else if (startIdx > 0) {
              const clean = thinkBuffer.slice(0, startIdx)
              fullText += clean
              callbacks.onToken(clean)
              thinkBuffer = thinkBuffer.slice(startIdx)
            } else {
              inThink = true
              thinkBuffer = thinkBuffer.slice(7)
            }
          }
        }
      } catch {}
    }
  }

  callbacks.onDone(fullText)
}

async function performWebSearch(query: string, apiKey?: string): Promise<string> {
  try {
    const resp = await new Promise<any>((resolve) => {
      chrome.runtime.sendMessage({ type: 'ASKIT_WEB_SEARCH', query, apiKey }, resolve)
    })
    if (resp?.results) return resp.results
  } catch {}
  return `搜索"${query}"的结果暂时无法获取，请基于已有知识回答。`
}

/** Image understanding via MiniMax coding_plan/vlm API */
export async function understandImage(
  settings: Settings,
  prompt: string,
  imageDataUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const key = settings.providerKeys?.minimax || settings.apiKey
  const response = await fetch('https://api.minimaxi.com/v1/coding_plan/vlm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ prompt, image_url: imageDataUrl }),
    signal,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`VLM API ${response.status}: ${text}`)
  }
  const data = await response.json()
  if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '图片理解失败')
  return data.content || '无法识别图片内容'
}

async function streamChatWithWebSearch(
  settings: Settings,
  messages: Pick<Message, 'role' | 'content'>[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { apiBase, apiKey, model, temperature } = settings
  const today = new Date().toISOString().slice(0, 10)

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const searchQuery = lastUserMsg.length > 60 ? lastUserMsg.substring(0, 60) : lastUserMsg

  callbacks.onToken('🔍 正在搜索...\n\n')
  const searchResults = await performWebSearch(searchQuery, settings.providerKeys?.minimax || settings.apiKey)

  const searchContext = `以下是关于用户问题的网络搜索结果（搜索日期: ${today}）：\n\n${searchResults}\n\n请基于以上搜索结果回答用户的问题。如果搜索结果中有相关信息，请引用并整理。如果没有相关信息，请说明。`

  const chatMessages = [
    ...messages.slice(0, -1),
    { role: 'user' as const, content: `${lastUserMsg}\n\n---\n${searchContext}` },
  ]

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: chatMessages, temperature, stream: true }),
    signal,
  })

  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`)

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let fullText = '🔍 正在搜索...\n\n'
  let sseBuffer = ''
  let thinkBuffer = ''
  let inThink = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    sseBuffer += decoder.decode(value, { stream: true })
    const lines = sseBuffer.split('\n')
    sseBuffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      try {
        const data = JSON.parse(line.slice(6))
        const token = data.choices?.[0]?.delta?.content
        if (!token) continue

        thinkBuffer += token
        while (thinkBuffer) {
          if (inThink) {
            const endIdx = thinkBuffer.indexOf('</think>')
            if (endIdx === -1) { thinkBuffer = ''; break }
            thinkBuffer = thinkBuffer.slice(endIdx + 8)
            inThink = false
          } else {
            const startIdx = thinkBuffer.indexOf('<think>')
            if (startIdx === -1) {
              fullText += thinkBuffer
              callbacks.onToken(thinkBuffer)
              thinkBuffer = ''
            } else if (startIdx > 0) {
              const clean = thinkBuffer.slice(0, startIdx)
              fullText += clean
              callbacks.onToken(clean)
              thinkBuffer = thinkBuffer.slice(startIdx)
            } else {
              inThink = true
              thinkBuffer = thinkBuffer.slice(7)
            }
          }
        }
      } catch {}
    }
  }

  callbacks.onDone(fullText)
}

export async function chatCompletion(
  settings: Settings,
  messages: Pick<Message, 'role' | 'content'>[]
): Promise<string> {
  const { apiBase, apiKey, model, temperature } = settings

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/** Generate image via MiniMax or OpenAI image API */
export async function generateImage(
  settings: Settings,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const { apiBase, apiKey, model, providerId } = getMediaSettings(settings, 'image')

  const isMiniMax = providerId === 'minimax'
  const endpoint = isMiniMax ? `${apiBase}/image_generation` : `${apiBase}/images/generations`
  const body = isMiniMax
    ? { model, prompt, aspect_ratio: '1:1', n: 1, prompt_optimizer: true }
    : { model, prompt, n: 1, size: '1024x1024' }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Image API ${response.status}: ${text}`)
  }

  const data = await response.json()
  if (isMiniMax) {
    if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '图片生成失败')
    return data.data?.image_urls?.[0] ?? ''
  }
  return data.data?.[0]?.url ?? data.data?.[0]?.b64_json ?? ''
}

/** Text-to-Speech via MiniMax or OpenAI TTS API */
export async function textToSpeech(
  settings: Settings,
  text: string,
  signal?: AbortSignal
): Promise<string> {
  const { apiBase, apiKey, model, providerId } = getMediaSettings(settings, 'tts')

  const isMiniMax = providerId === 'minimax'
  const endpoint = isMiniMax ? `${apiBase}/t2a_v2` : `${apiBase}/audio/speech`
  const body = isMiniMax
    ? {
        model,
        text,
        voice_setting: { voice_id: 'female-shaonv', speed: 1.0 },
        audio_setting: { format: 'mp3', sample_rate: 32000 },
        output_format: 'url',
      }
    : { model, input: text, voice: 'alloy' }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`TTS API ${response.status}: ${errText}`)
  }

  if (isMiniMax) {
    const data = await response.json()
    if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '语音合成失败')
    const audioUrl = data.data?.audio
    if (!audioUrl) throw new Error('TTS 返回为空')
    return audioUrl
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/** Generate lyrics via MiniMax lyrics API */
export async function generateLyrics(
  settings: Settings,
  prompt: string,
  signal?: AbortSignal
): Promise<{ lyrics: string; title: string; tags: string }> {
  const { apiBase, apiKey } = getMediaSettings(settings, 'music')

  const response = await fetch(`${apiBase}/lyrics_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ mode: 'write_full_song', prompt }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Lyrics API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '歌词生成失败')
  return { lyrics: data.lyrics ?? '', title: data.song_title ?? '', tags: data.style_tags ?? '' }
}

/** Generate music via MiniMax music API */
export async function generateMusic(
  settings: Settings,
  prompt: string,
  lyrics?: string,
  signal?: AbortSignal
): Promise<string> {
  const { apiBase, apiKey, model } = getMediaSettings(settings, 'music')

  const body: Record<string, unknown> = {
    model,
    prompt,
    audio_setting: { format: 'mp3', sample_rate: 44100, bitrate: 256000 },
    output_format: 'url',
  }
  if (lyrics) body.lyrics = lyrics

  const response = await fetch(`${apiBase}/music_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Music API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '音乐生成失败')
  return data.data?.audio ?? ''
}

/** Preprocess audio for music cover - extracts vocal features and lyrics */
export async function musicCoverPreprocess(
  settings: Settings,
  audioUrl: string,
  signal?: AbortSignal
): Promise<{ coverFeatureId: string; formattedLyrics: string }> {
  const { apiBase, apiKey } = getMediaSettings(settings, 'music')

  const response = await fetch(`${apiBase}/music_cover_preprocess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: 'music-cover', audio_url: audioUrl }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Cover Preprocess API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '翻唱预处理失败')
  return {
    coverFeatureId: data.cover_feature_id ?? '',
    formattedLyrics: data.formatted_lyrics ?? '',
  }
}

/** Generate music cover from preprocessed audio */
export async function generateMusicCover(
  settings: Settings,
  coverFeatureId: string,
  lyrics: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const { apiBase, apiKey } = getMediaSettings(settings, 'music')

  const response = await fetch(`${apiBase}/music_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'music-cover',
      cover_feature_id: coverFeatureId,
      lyrics,
      prompt,
      audio_setting: { format: 'mp3', sample_rate: 44100, bitrate: 256000 },
      output_format: 'url',
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Cover API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  if (data.base_resp?.status_code !== 0) throw new Error(data.base_resp?.status_msg || '翻唱生成失败')
  return data.data?.audio ?? ''
}
