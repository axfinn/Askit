import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/shared/store'
import { chatCompletion } from '@/shared/api'

interface Position { top: number; left: number }

const ACTIONS = [
  { id: 'compose', icon: '✍️', label: '帮我写' },
  { id: 'rewrite', icon: '✨', label: '改写' },
  { id: 'translate', icon: '🌐', label: '翻译' },
  { id: 'expand', icon: '📝', label: '扩写' },
  { id: 'shorten', icon: '✂️', label: '精简' },
]

export function InputAssist() {
  const { settings } = useStore()
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 })
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const targetRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<number>(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isEditable = (el: HTMLElement) => {
      if (el.tagName === 'TEXTAREA') return true
      if (el.tagName === 'INPUT' && ['text', 'search', 'email', 'url', ''].includes((el as HTMLInputElement).type)) return true
      if (el.isContentEditable) return true
      return false
    }

    const show = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      setPos({ top: rect.top - 30, left: rect.right - 30 })
      setVisible(true)
      setExpanded(false)
      targetRef.current = el
    }

    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      if (!el || !isEditable(el)) return
      if (el.closest('#askit-root')) return
      clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => show(el), 300)
    }

    const handleFocusOut = (e: FocusEvent) => {
      clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        setVisible(false)
        setExpanded(false)
      }, 300)
    }

    // Keep panel open when interacting with it
    const handlePanelInteraction = () => {
      clearTimeout(timerRef.current)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    // Listen on the shadow root for our panel interactions
    const shadowRoot = document.getElementById('askit-root')?.shadowRoot
    shadowRoot?.addEventListener('mousedown', handlePanelInteraction)
    shadowRoot?.addEventListener('focusin', handlePanelInteraction)
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      shadowRoot?.removeEventListener('mousedown', handlePanelInteraction)
      shadowRoot?.removeEventListener('focusin', handlePanelInteraction)
      clearTimeout(timerRef.current)
    }
  }, [])

  function getInputValue(el: HTMLElement): string {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return (el as HTMLInputElement).value
    return el.innerText || ''
  }

  function insertAtCursor(el: HTMLElement, value: string) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const input = el as HTMLInputElement | HTMLTextAreaElement
      const start = input.selectionStart ?? input.value.length
      const end = input.selectionEnd ?? input.value.length
      const newValue = input.value.slice(0, start) + value + input.value.slice(end)
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      if (nativeSetter) {
        nativeSetter.call(input, newValue)
      } else {
        input.value = newValue
      }
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      // Restore cursor position after inserted text
      const newPos = start + value.length
      input.setSelectionRange(newPos, newPos)
    } else {
      // contenteditable: insert at cursor
      el.focus()
      document.execCommand('insertText', false, value)
    }
  }

  function replaceInputValue(el: HTMLElement, value: string) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const input = el as HTMLInputElement | HTMLTextAreaElement
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      if (nativeSetter) {
        nativeSetter.call(input, value)
      } else {
        input.value = value
      }
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      el.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      sel?.removeAllRanges()
      sel?.addRange(range)
      document.execCommand('insertText', false, value)
    }
  }

  async function handleAction(actionId: string) {
    if (!targetRef.current || !settings.apiKey) return
    const currentText = getInputValue(targetRef.current)
    setLoading(true)
    setExpanded(false)

    const prompts: Record<string, string> = {
      compose: `用户在输入框中，请帮他写一段合适的内容。输入框当前内容："${currentText}"。如果为空，写一段通用的专业回复。只输出内容本身，不要解释。`,
      rewrite: `改写以下内容，使其更专业流畅，保持原意。只输出改写结果：\n\n${currentText}`,
      translate: `将以下内容翻译（中文翻英文，英文翻中文）。只输出翻译结果：\n\n${currentText}`,
      expand: `扩写以下内容，增加细节和深度，保持原意。只输出扩写结果：\n\n${currentText}`,
      shorten: `精简以下内容，保留核心信息，使其更简洁。只输出精简结果：\n\n${currentText}`,
    }

    try {
      const result = await chatCompletion(settings, [{ role: 'user', content: prompts[actionId] }])
      const cleaned = result.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
      if (cleaned && targetRef.current) {
        if (actionId === 'compose') {
          insertAtCursor(targetRef.current, cleaned)
        } else {
          replaceInputValue(targetRef.current, cleaned)
        }
        targetRef.current.focus()
      }
    } catch {}
    setLoading(false)
  }

  async function handleCustomPrompt() {
    if (!targetRef.current || !settings.apiKey || !customPrompt.trim()) return
    const currentText = getInputValue(targetRef.current)
    setLoading(true)
    setExpanded(false)

    const fullPrompt = currentText
      ? `用户指令："${customPrompt}"\n\n输入框当前内容：\n${currentText}\n\n请根据用户指令处理内容，只输出结果，不要解释。`
      : `用户指令："${customPrompt}"\n\n请根据指令生成内容，只输出结果，不要解释。`

    try {
      const result = await chatCompletion(settings, [{ role: 'user', content: fullPrompt }])
      const cleaned = result.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
      if (cleaned && targetRef.current) {
        insertAtCursor(targetRef.current, cleaned)
        targetRef.current.focus()
      }
    } catch {}
    setLoading(false)
    setCustomPrompt('')
  }

  if (!visible) return null

  return (
    <div
      ref={panelRef}
      className="askit-input-assist"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault() }}
    >
      {loading ? (
        <div className="askit-input-assist-loading">
          <span className="askit-input-assist-spinner" />
        </div>
      ) : expanded ? (
        <div className="askit-input-assist-menu">
          <div className="askit-input-assist-prompt-row">
            <input
              className="askit-input-assist-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomPrompt() } }}
              placeholder="输入指令，如：写一封感谢信..."
              autoFocus
            />
            <button className="askit-input-assist-go" onClick={handleCustomPrompt}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
          <div className="askit-input-assist-actions">
            {ACTIONS.map(a => (
              <button key={a.id} className="askit-input-assist-action" onClick={() => handleAction(a.id)}>
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button className="askit-input-assist-trigger" onClick={() => setExpanded(true)} title="AskIt AI 写作助手">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M12 2L9 12l3 4 3-4-3-10z"/><path d="M5 17l3-2M19 17l-3-2"/><path d="M12 22v-6"/>
          </svg>
        </button>
      )}
    </div>
  )
}
