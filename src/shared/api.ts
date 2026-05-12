import type { Settings, Message } from './types'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}

export async function streamChat(
  settings: Settings,
  messages: Pick<Message, 'role' | 'content'>[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { apiBase, apiKey, model, temperature } = settings

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
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      try {
        const data = JSON.parse(line.slice(6))
        const token = data.choices?.[0]?.delta?.content
        if (token) {
          fullText += token
          callbacks.onToken(token)
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
