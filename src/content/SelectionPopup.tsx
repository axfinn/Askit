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
      className="absolute z-[99997]"
      style={{ left: `${position.x}px`, top: `${position.y}px`, transform: 'translateX(-50%)' }}
    >
      {/* Action buttons */}
      <div className="flex gap-1 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-violet-500/30 rounded-full px-3 py-2 shadow-xl shadow-black/40 animate-fade-in">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            title={action.label}
            className="w-8 h-8 rounded-full bg-white/10 text-sm flex items-center justify-center hover:bg-violet-600/50 hover:scale-110 transition-all border-0 cursor-pointer"
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Inline result */}
      {showResult && (
        <div className="mt-2 w-[320px] bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-violet-500/20 rounded-xl p-4 shadow-2xl shadow-black/50 animate-fade-in">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-white/10 border-t-violet-500 rounded-full animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <>
              <div
                className="text-gray-200 text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-2 [&_code]:text-xs"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
              />
              <div className="flex gap-2 mt-3 pt-2 border-t border-white/10">
                <button onClick={handleCopy} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 border border-white/10 cursor-pointer transition-all">
                  📋 复制
                </button>
                <button onClick={handleClose} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 border border-white/10 cursor-pointer transition-all">
                  ✕ 关闭
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
