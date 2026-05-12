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

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (sidebarOpen) inputRef.current?.focus() }, [sidebarOpen])

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
      ? `You are a helpful AI assistant. The user is viewing a webpage. Page content:\n\n${pageContext}\n\nAnswer questions using this context when relevant.`
      : 'You are a helpful AI assistant.'

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
        onToken: (token) => { fullText += token; updateLastMessage(fullText) },
        onDone: () => {},
        onError: (err) => updateLastMessage(`Error: ${err.message}`),
      }, abort.signal)
    } catch (err: any) {
      if (err.name !== 'AbortError') updateLastMessage(`Error: ${err.message}`)
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
    setTimeout(() => handleSend(), 50)
  }

  if (!sidebarOpen) return null

  return (
    <div className="askit-sidebar">
      <div className="askit-header">
        <span className="askit-header-title">✦ AskIt</span>
        <button className="askit-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
      </div>

      <div className="askit-tools">
        <button className="askit-tool-btn" onClick={() => handleQuickAction('summarize')}>📄 总结</button>
        <button className="askit-tool-btn" onClick={() => handleQuickAction('translate')}>🌐 翻译</button>
        <button className="askit-tool-btn" onClick={() => handleQuickAction('extract')}>📝 大纲</button>
        <button className="askit-tool-btn danger" onClick={clearMessages}>🗑️</button>
      </div>

      <div className="askit-messages">
        {messages.length === 0 && (
          <div className="askit-empty">
            <div className="askit-empty-icon">✦</div>
            <div className="askit-empty-text">Ask anything about this page...</div>
            <div className="askit-empty-sub">Powered by AI</div>
          </div>
        )}
        {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
        <div ref={messagesEndRef} />
      </div>

      <div className="askit-input-area">
        <textarea
          ref={inputRef}
          className="askit-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Ask anything..."
          rows={2}
        />
        {isStreaming ? (
          <button className="askit-send-btn stop" onClick={() => { abortRef.current?.abort(); setStreaming(false) }}>■</button>
        ) : (
          <button className="askit-send-btn" onClick={handleSend}>➤</button>
        )}
      </div>
    </div>
  )
}
