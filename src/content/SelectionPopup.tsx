import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/shared/store'
import { chatCompletion } from '@/shared/api'
import { renderMarkdown } from '@/shared/markdown'

interface PopupPosition {
  x: number
  y: number
}

const ACTIONS = [
  { id: 'explain', icon: '💡', label: '解释' },
  { id: 'translate', icon: '🌐', label: '翻译' },
  { id: 'summarize', icon: '📄', label: '总结' },
  { id: 'rewrite', icon: '✍️', label: '改写' },
  { id: 'grammar', icon: '✓', label: '语法' },
] as const

export function SelectionPopup() {
  const { settings } = useStore()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<PopupPosition>({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
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
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + window.scrollY + 8,
          })
          setVisible(true)
          setShowResult(false)
          setResult('')
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

    setLoading(true)
    setShowResult(true)
    setResult('')

    const prompts: Record<string, string> = {
      explain: `请用简洁的中文解释以下内容：\n\n"${selectedText}"`,
      translate: `请翻译以下内容为中文（如果已经是中文则翻译为英文）：\n\n"${selectedText}"`,
      summarize: `请用一两句话总结以下内容：\n\n"${selectedText}"`,
      rewrite: `请改写以下内容，使其更加清晰流畅：\n\n"${selectedText}"`,
      grammar: `请检查以下文本的语法错误并给出修正：\n\n"${selectedText}"`,
    }

    try {
      const text = await chatCompletion(settings, [
        { role: 'system', content: 'You are a helpful assistant. Be concise.' },
        { role: 'user', content: prompts[actionId] ?? selectedText },
      ])
      setResult(text)
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result)
  }

  function handleClose() {
    setVisible(false)
    setShowResult(false)
    setResult('')
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
            className="askit-sel-btn"
          >
            {action.icon}
          </button>
        ))}
      </div>

      {showResult && (
        <div className="askit-inline-result">
          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <span>Thinking...</span>
            </div>
          ) : (
            <>
              <div className="content" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
              <div className="actions">
                <button className="action-btn" onClick={handleCopy}>📋 复制</button>
                <button className="action-btn" onClick={handleClose}>✕ 关闭</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
