import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/shared/store'
import { streamChat } from '@/shared/api'
import { ChatMessage } from './components/ChatMessage'
import type { Message } from '@/shared/types'

function extractPageContent(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  const removeTags = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']
  removeTags.forEach((tag) => clone.querySelectorAll(tag).forEach((el) => el.remove()))
  return (clone.innerText || '').replace(/\s+/g, ' ').trim().substring(0, 4000)
}

export function Sidebar() {
  const { settings, messages, sidebarOpen, isStreaming, addMessage, updateLastMessage, setStreaming, setSidebarOpen, clearMessages, loadSettings } = useStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (sidebarOpen) inputRef.current?.focus()
  }, [sidebarOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key === 'j') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [sidebarOpen])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    if (!settings.apiKey) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '请先在插件 Popup 中设置 API Key', timestamp: Date.now() })
      return
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() }
    addMessage(userMsg)
    setInput('')

    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() }
    addMessage(assistantMsg)
    setStreaming(true)

    const pageContext = extractPageContent()
    const systemPrompt = pageContext
      ? `You are a helpful AI assistant. The user is currently viewing a webpage. Here is the page content for context:\n\n${pageContext}\n\nAnswer the user's questions. If the question is about the page, use the context. Otherwise, answer normally.`
      : 'You are a helpful AI assistant. Keep responses concise and clear.'

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system').slice(-20).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ]

    const abort = new AbortController()
    abortRef.current = abort

    let fullText = ''
    try {
      await streamChat(settings, chatMessages, {
        onToken: (token) => {
          fullText += token
          updateLastMessage(fullText)
        },
        onDone: () => {},
        onError: (err) => updateLastMessage(`Error: ${err.message}`),
      }, abort.signal)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        updateLastMessage(`Error: ${err.message}`)
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleQuickAction(action: string) {
    const pageContent = extractPageContent()
    const prompts: Record<string, string> = {
      summarize: `请用中文总结以下内容的要点（3-5条）：\n\n${pageContent}`,
      translate: `请将以下内容翻译成中文：\n\n${pageContent}`,
      extract: `请提取以下内容的大纲结构：\n\n${pageContent}`,
    }
    setInput(prompts[action] || '')
    setTimeout(() => handleSend(), 0)
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  if (!sidebarOpen) return null

  return (
    <div className="fixed top-0 right-0 w-[400px] h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] z-[99999] flex flex-col shadow-2xl border-l border-white/10 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-500">
        <span className="text-white font-bold text-lg">✦ AskIt</span>
        <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-full bg-white/20 text-white text-lg flex items-center justify-center hover:bg-white/30 border-0 cursor-pointer">
          ×
        </button>
      </div>

      {/* Quick Tools */}
      <div className="flex gap-2 px-4 py-3 bg-black/20 border-b border-white/5">
        <button onClick={() => handleQuickAction('summarize')} className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-violet-600/30 hover:text-white border border-white/10 cursor-pointer transition-all">
          📄 总结
        </button>
        <button onClick={() => handleQuickAction('translate')} className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-violet-600/30 hover:text-white border border-white/10 cursor-pointer transition-all">
          🌐 翻译
        </button>
        <button onClick={() => handleQuickAction('extract')} className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-xs hover:bg-violet-600/30 hover:text-white border border-white/10 cursor-pointer transition-all">
          📝 大纲
        </button>
        <button onClick={clearMessages} className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-red-600/20 hover:text-red-300 border border-white/10 cursor-pointer transition-all">
          🗑️
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <div className="text-4xl mb-3">✦</div>
            <p className="text-sm">Ask anything about this page...</p>
            <p className="text-xs text-gray-600 mt-1">Powered by AI</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask anything..."
            rows={2}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500 placeholder:text-gray-500"
          />
          {isStreaming ? (
            <button onClick={handleStop} className="px-4 py-3 rounded-xl bg-red-500/80 text-white text-sm font-medium border-0 cursor-pointer hover:bg-red-500">
              ■
            </button>
          ) : (
            <button onClick={handleSend} className="px-4 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white text-lg border-0 cursor-pointer hover:shadow-lg hover:shadow-violet-500/30 transition-all">
              ➤
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
