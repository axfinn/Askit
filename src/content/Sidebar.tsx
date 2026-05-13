import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/shared/store'
import { streamChat } from '@/shared/api'
import { ChatMessage } from './components/ChatMessage'
import { ModelSelector } from './components/ModelSelector'
import { extractPageContent } from './utils/extractContent'
import type { Message } from '@/shared/types'

export function Sidebar() {
  const { settings, messages, sidebarOpen, isStreaming, addMessage, updateLastMessage, setStreaming, setSidebarOpen, newConversation, loadSettings } = useStore()
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

  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === 'ASKIT_TOGGLE_SIDEBAR') setSidebarOpen(!sidebarOpen)
      if (msg.type === 'ASKIT_ACTION') {
        setSidebarOpen(true)
        handleQuickActionWithText(msg.action, msg.text)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [sidebarOpen])

  // Listen for regenerate events from ChatMessage
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text
      if (text) doStreamChat(text)
    }
    document.addEventListener('askit-regenerate', handler)
    return () => document.removeEventListener('askit-regenerate', handler)
  }, [settings, messages])

  const handleInputResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [])

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
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await doStreamChat(text)
  }

  async function doStreamChat(text: string) {
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() }
    addMessage(assistantMsg)
    setStreaming(true)

    const pageContext = extractPageContent()
    const systemPrompt = pageContext
      ? `You are a helpful AI assistant. The user is browsing: "${document.title}" (${location.href}).\n\nPage content:\n${pageContext}\n\nUse this context to answer questions. Respond in the same language as the user.`
      : 'You are a helpful AI assistant. Respond in the same language as the user.'

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
      summarize: `请用中文总结以下页面内容的要点（3-5条）：\n\n${pageContent}`,
      translate: `请将以下页面内容翻译成中文：\n\n${pageContent.substring(0, 4000)}`,
      extract: `请提取以下页面内容的大纲结构：\n\n${pageContent}`,
    }
    const text = prompts[action]
    if (!text) return
    const labels: Record<string, string> = { summarize: '总结页面', translate: '翻译页面', extract: '提取大纲' }
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `📄 ${labels[action] || action}`, timestamp: Date.now() }
    addMessage(userMsg)
    doStreamChat(text)
  }

  function handleQuickActionWithText(action: string, text: string) {
    const prompts: Record<string, string> = {
      explain: `请用简洁的中文解释以下内容：\n\n"${text}"`,
      translate: `请翻译以下内容为中文（如果已经是中文则翻译为英文）：\n\n"${text}"`,
      summarize: `请用一两句话总结以下内容：\n\n"${text}"`,
    }
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `${action}: "${text.substring(0, 100)}..."`, timestamp: Date.now() }
    addMessage(userMsg)
    doStreamChat(prompts[action] || text)
  }

  if (!sidebarOpen) return null

  return (
    <div className="askit-sidebar">
      {/* Header */}
      <div className="askit-header">
        <div className="askit-header-left">
          <span className="askit-header-logo">✦</span>
          <ModelSelector />
        </div>
        <div className="askit-header-right">
          <button className="askit-header-btn" onClick={newConversation} title="New Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button className="askit-header-btn" onClick={() => setSidebarOpen(false)} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Tools */}
      <div className="askit-tools">
        <button className="askit-tool-btn" onClick={() => handleQuickAction('summarize')}>📄 总结</button>
        <button className="askit-tool-btn" onClick={() => handleQuickAction('translate')}>🌐 翻译</button>
        <button className="askit-tool-btn" onClick={() => handleQuickAction('extract')}>📝 大纲</button>
      </div>

      {/* Messages */}
      <div className="askit-messages">
        {messages.length === 0 && (
          <div className="askit-empty">
            <div className="askit-empty-icon">✦</div>
            <div className="askit-empty-text">Ask anything about this page</div>
            <div className="askit-empty-sub">Alt+J toggle · Select text for quick actions</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={msg.id} message={msg} isLast={i === messages.length - 1} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="askit-input-area">
        <textarea
          ref={inputRef}
          className="askit-input"
          value={input}
          onChange={handleInputResize}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Ask anything..."
          rows={1}
        />
        {isStreaming ? (
          <button className="askit-send-btn stop" onClick={() => { abortRef.current?.abort(); setStreaming(false) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        ) : (
          <button className="askit-send-btn" onClick={handleSend}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        )}
      </div>
      <div className="askit-input-footer">
        <span>{settings.model}</span>
        <span>Enter send · Shift+Enter newline</span>
      </div>
    </div>
  )
}
