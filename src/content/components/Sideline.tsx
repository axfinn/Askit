import { useState, useCallback } from 'react'
import { useStore } from '@/shared/store'
import { extractPageContent } from '../utils/extractContent'
import { detectPageType } from '../utils/detectPage'
import { extractYouTubeTranscript } from '../utils/youtube'
import type { Message } from '@/shared/types'

export function Sideline() {
  const { sidebarOpen, setSidebarOpen, addMessage } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  const handleChat = useCallback(() => {
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen, setSidebarOpen])

  const handleAction = useCallback((action: string) => {
    setSidebarOpen(true)
    const pageContent = extractPageContent()
    const prompts: Record<string, string> = {
      summarize: `请用中文总结以下页面内容的要点（3-5条）：\n\n${pageContent}`,
      translate: `请将以下页面内容翻译成中文（如果已是中文则翻译为英文）：\n\n${pageContent?.substring(0, 4000)}`,
    }
    const labels: Record<string, string> = { summarize: '总结页面', translate: '翻译页面' }
    const text = prompts[action]
    if (!text) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `📄 ${labels[action]}`, timestamp: Date.now() }
    addMessage(userMsg)
    document.dispatchEvent(new CustomEvent('askit-do-stream', { detail: { text } }))
  }, [setSidebarOpen, addMessage])

  const handleScreenshot = useCallback(() => {
    setSidebarOpen(true)
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('askit-do-screenshot'))
    }, 100)
  }, [setSidebarOpen])

  if (sidebarOpen) return null

  const pageType = detectPageType()

  return (
    <div className={`askit-sideline ${collapsed ? 'collapsed' : ''}`}>
      <button className="askit-sideline-btn" onClick={handleChat} title="对话">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
      <button className="askit-sideline-btn" onClick={() => handleAction('summarize')} title="总结页面">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
      </button>
      <button className="askit-sideline-btn" onClick={() => handleAction('translate')} title="翻译页面">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1"/>
          <path d="M22 22l-5-10-5 10M14 18h6"/>
        </svg>
      </button>
      {pageType === 'youtube' && (
        <button className="askit-sideline-btn" onClick={() => {
          setSidebarOpen(true)
          const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: '📺 总结视频', timestamp: Date.now() }
          addMessage(userMsg)
          extractYouTubeTranscript().then(transcript => {
            const text = transcript
              ? `请用中文总结以下视频内容的要点（5-8条）：\n\n${transcript.substring(0, 6000)}`
              : `请根据页面标题和描述总结这个视频的内容：${document.title}`
            document.dispatchEvent(new CustomEvent('askit-do-stream', { detail: { text } }))
          })
        }} title="总结视频">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M10 9l5 3-5 3V9z"/>
          </svg>
        </button>
      )}
      <button className="askit-sideline-btn" onClick={handleScreenshot} title="截图提问">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <div className="askit-sideline-divider" />
      <button className="askit-sideline-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? '展开' : '收起'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {collapsed ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
        </svg>
      </button>
    </div>
  )
}
