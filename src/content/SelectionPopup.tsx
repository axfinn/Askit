import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/shared/store'
import { streamChat } from '@/shared/api'
import { renderMarkdown } from '@/shared/markdown'

interface PopupPosition {
  x: number
  y: number
}

const ACTIONS = [
  { id: 'explain', label: '解释', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg> },
  { id: 'translate', label: '翻译', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1"/><path d="M22 22l-5-10-5 10M14 18h6"/></svg> },
  { id: 'summarize', label: '总结', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
  { id: 'rewrite', label: '改写', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { id: 'grammar', label: '语法', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> },
  { id: 'improve', label: '润色', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
  { id: 'actions', label: '要点', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
] as const

export function SelectionPopup() {
  const { settings } = useStore()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<PopupPosition>({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('#askit-root')) return

      setTimeout(() => {
        const sel = window.getSelection()
        const text = sel?.toString().trim() ?? ''
        if (text.length > 5) {
          setSelectedText(text)
          const range = sel!.getRangeAt(0)
          const rect = range.getBoundingClientRect()

          let x = rect.left + rect.width / 2
          let y = rect.bottom + 8

          // Viewport boundary detection
          const popupWidth = 220
          const popupHeight = 200
          x = Math.max(popupWidth / 2 + 8, Math.min(x, window.innerWidth - popupWidth / 2 - 8))
          if (y + popupHeight > window.innerHeight) {
            y = rect.top - 8
          }

          setPosition({ x, y: y + window.scrollY })
          setVisible(true)
          setShowResult(false)
          setResult('')
          setActiveAction(null)
        } else {
          setVisible(false)
          setShowResult(false)
        }
      }, 10)
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#askit-root')) {
        if (visible && !showResult) setVisible(false)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [visible, showResult])

  async function handleAction(actionId: string) {
    if (!settings.apiKey) {
      setResult('请先设置 API Key')
      setShowResult(true)
      return
    }

    if (abortRef.current) abortRef.current.abort()

    setLoading(true)
    setShowResult(true)
    setResult('')
    setActiveAction(actionId)

    const prompts: Record<string, string> = {
      explain: `请用简洁的中文解释以下内容：\n\n"${selectedText}"`,
      translate: `请翻译以下内容为中文（如果已经是中文则翻译为英文）：\n\n"${selectedText}"`,
      summarize: `请用一两句话总结以下内容：\n\n"${selectedText}"`,
      rewrite: `请改写以下内容，使其更加清晰流畅：\n\n"${selectedText}"`,
      grammar: `请检查以下文本的语法错误并给出修正：\n\n"${selectedText}"`,
      improve: `请润色以下内容，使其更加专业优雅：\n\n"${selectedText}"`,
      actions: `请从以下内容中提取关键要点和行动项：\n\n"${selectedText}"`,
    }

    const abort = new AbortController()
    abortRef.current = abort
    let fullText = ''

    try {
      await streamChat(
        settings,
        [
          { role: 'system', content: `你是一个简洁有帮助的助手。用户在页面"${document.title}"上选中了一段文字并请求操作。直接给出结果，不要废话。` },
          { role: 'user', content: prompts[actionId] ?? selectedText },
        ],
        {
          onToken: (token) => { fullText += token; setResult(fullText) },
          onDone: () => {},
          onError: (err) => setResult(`Error: ${err.message}`),
        },
        abort.signal
      )
    } catch (err: any) {
      if (err.name !== 'AbortError') setResult(`Error: ${err.message}`)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result)
  }

  function handleClose() {
    if (abortRef.current) abortRef.current.abort()
    setVisible(false)
    setShowResult(false)
    setResult('')
    setActiveAction(null)
  }

  if (!visible) return null

  return (
    <div
      ref={popupRef}
      style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, transform: 'translateX(-50%)', zIndex: 99997 }}
    >
      <div className="askit-sel-popup">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            title={action.label}
            className={`askit-sel-btn ${activeAction === action.id ? 'active' : ''}`}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {showResult && (
        <div className="askit-inline-result">
          {result ? (
            <>
              <div className="content" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
              {loading && (
                <div className="loading-indicator">
                  <div className="spinner" />
                </div>
              )}
            </>
          ) : (
            <div className="loading">
              <div className="spinner" />
              <span>Thinking...</span>
            </div>
          )}
          <div className="actions">
            <button className="action-btn" onClick={handleCopy}>📋 复制</button>
            <button className="action-btn" onClick={handleClose}>✕ 关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
