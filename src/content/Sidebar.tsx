import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/shared/store'
import { streamChat, chatCompletion } from '@/shared/api'
import { renderMarkdown } from '@/shared/markdown'
import { ChatMessage } from './components/ChatMessage'
import type { Message } from '@/shared/types'

type SidebarTab = 'chat' | 'tools'

function extractPageContent(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  const removeTags = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']
  removeTags.forEach((tag) => clone.querySelectorAll(tag).forEach((el) => el.remove()))
  return (clone.innerText || '').replace(/\s+/g, ' ').trim().substring(0, 4000)
}

export function Sidebar() {
  const { settings, messages, sidebarOpen, isStreaming, addMessage, updateLastMessage, setStreaming, setSidebarOpen, clearMessages, loadSettings } = useStore()
  const [input, setInput] = useState('')
  const [tab, setTab] = useState<SidebarTab>('chat')
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

  // Listen for messages from background/popup
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === 'ASKIT_TOGGLE_SIDEBAR') setSidebarOpen(!sidebarOpen)
      if (msg.type === 'ASKIT_ACTION') {
        setSidebarOpen(true)
        setTab('chat')
        handleQuickActionWithText(msg.action, msg.text)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
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

    await doStreamChat(text)
  }

  async function doStreamChat(text: string) {
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() }
    addMessage(assistantMsg)
    setStreaming(true)

    const pageContext = extractPageContent()
    const systemPrompt = pageContext
      ? `You are a helpful AI assistant. The user is viewing a webpage titled "${document.title}". Page content:\n\n${pageContext}\n\nAnswer questions using this context when relevant.`
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
      summarize: `请用中文总结以下页面内容的要点（3-5条）：\n\n${pageContent}`,
      translate: `请将以下页面内容翻译成中文：\n\n${pageContent.substring(0, 3000)}`,
      extract: `请提取以下页面内容的大纲结构：\n\n${pageContent}`,
    }
    const text = prompts[action]
    if (!text) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `📄 ${action === 'summarize' ? '总结页面' : action === 'translate' ? '翻译页面' : '提取大纲'}`, timestamp: Date.now() }
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
        <span className="askit-header-title">✦ AskIt</span>
        <button className="askit-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
      </div>

      {/* Tabs */}
      <div className="askit-tabs">
        <button className={`askit-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          💬 Chat
        </button>
        <button className={`askit-tab ${tab === 'tools' ? 'active' : ''}`} onClick={() => setTab('tools')}>
          🛠️ Tools
        </button>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <>
          {/* Quick Tools */}
          <div className="askit-tools">
            <button className="askit-tool-btn" onClick={() => handleQuickAction('summarize')}>📄 总结</button>
            <button className="askit-tool-btn" onClick={() => handleQuickAction('translate')}>🌐 翻译</button>
            <button className="askit-tool-btn" onClick={() => handleQuickAction('extract')}>📝 大纲</button>
            <button className="askit-tool-btn danger" onClick={clearMessages}>🗑️</button>
          </div>

          {/* Messages */}
          <div className="askit-messages">
            {messages.length === 0 && (
              <div className="askit-empty">
                <div className="askit-empty-icon">✦</div>
                <div className="askit-empty-text">Ask anything about this page...</div>
                <div className="askit-empty-sub">Alt+J to toggle • Select text for quick actions</div>
              </div>
            )}
            {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
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
        </>
      )}

      {/* Tools Tab */}
      {tab === 'tools' && (
        <div className="askit-tools-page">
          <ToolButton icon="📄" title="Summarize Page" desc="Get key points from this page" onClick={() => { setTab('chat'); handleQuickAction('summarize') }} />
          <ToolButton icon="🌐" title="Translate Page" desc="Translate page content to Chinese" onClick={() => { setTab('chat'); handleQuickAction('translate') }} />
          <ToolButton icon="📝" title="Extract Outline" desc="Get the structure of this page" onClick={() => { setTab('chat'); handleQuickAction('extract') }} />
          <ToolButton icon="📸" title="Analyze Screenshot" desc="Capture and analyze current view" onClick={() => {}} />
        </div>
      )}
    </div>
  )
}

function ToolButton({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button className="askit-tool-card" onClick={onClick}>
      <span className="askit-tool-card-icon">{icon}</span>
      <div>
        <div className="askit-tool-card-title">{title}</div>
        <div className="askit-tool-card-desc">{desc}</div>
      </div>
    </button>
  )
}
