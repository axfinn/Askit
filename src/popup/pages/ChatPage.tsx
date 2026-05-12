import { useState, useRef, useEffect } from 'react'
import type { Settings, Message } from '@/shared/types'
import { streamChat } from '@/shared/api'
import { renderMarkdown } from '@/shared/markdown'

interface Props {
  settings: Settings
}

export function ChatPage({ settings }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    if (!settings.apiKey) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() }
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    const chatMsgs = [
      { role: 'system' as const, content: 'You are a helpful AI assistant.' },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ]

    const abort = new AbortController()
    abortRef.current = abort
    let fullText = ''

    try {
      await streamChat(settings, chatMsgs, {
        onToken: (token) => {
          fullText += token
          setMessages((prev) => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: fullText }
            return copy
          })
        },
        onDone: () => {},
        onError: (err) => {
          setMessages((prev) => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: `Error: ${err.message}` }
            return copy
          })
        },
      }, abort.signal)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: `Error: ${err.message}` }
          return copy
        })
      }
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-16">
            <div className="text-3xl mb-2">✦</div>
            <p className="text-sm">Ask anything...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-500 text-white rounded-br-sm'
                  : 'bg-white/[0.06] text-gray-100 rounded-bl-sm border border-white/10'
              }`}
            >
              {msg.role === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <div
                  className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '...') }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 items-end border-t border-white/10 pt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="Ask anything..."
          rows={2}
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
        />
        <button
          onClick={streaming ? () => abortRef.current?.abort() : handleSend}
          className="px-4 py-2 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white border-0 cursor-pointer text-lg"
        >
          {streaming ? '■' : '➤'}
        </button>
      </div>
    </div>
  )
}
