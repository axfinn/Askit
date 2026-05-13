import { useCallback } from 'react'
import { renderMarkdown } from '@/shared/markdown'
import { useStore } from '@/shared/store'
import type { Message } from '@/shared/types'

interface Props {
  message: Message
  isLast?: boolean
}

export function ChatMessage({ message, isLast }: Props) {
  const { isStreaming, deleteMessage, messages } = useStore()
  const isUser = message.role === 'user'
  const isTyping = !isUser && isLast && isStreaming && !message.content

  const handleBubbleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const copyBtn = target.closest('.askit-code-copy') as HTMLElement | null
    if (copyBtn) {
      const code = copyBtn.getAttribute('data-code')
        ?.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      if (code) {
        navigator.clipboard.writeText(code)
        copyBtn.textContent = 'Copied!'
        setTimeout(() => { copyBtn.textContent = 'Copy' }, 1500)
      }
    }
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
  }, [message.content])

  const handleRegenerate = useCallback(() => {
    const idx = messages.findIndex(m => m.id === message.id)
    if (idx > 0) {
      const userMsg = messages[idx - 1]
      if (userMsg.role === 'user') {
        deleteMessage(message.id)
        const event = new CustomEvent('askit-regenerate', { detail: { text: userMsg.content } })
        document.dispatchEvent(event)
      }
    }
  }, [message.id, messages, deleteMessage])

  const handleDelete = useCallback(() => {
    deleteMessage(message.id)
  }, [message.id, deleteMessage])

  return (
    <div className={`askit-msg-row ${message.role}`}>
      <div className="askit-msg-avatar">
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
          </svg>
        ) : (
          <span>✦</span>
        )}
      </div>
      <div className="askit-msg-content">
        <div className="askit-msg-bubble" onClick={handleBubbleClick}>
          {isTyping ? (
            <div className="askit-typing">
              <span className="askit-typing-dot"></span>
              <span className="askit-typing-dot"></span>
              <span className="askit-typing-dot"></span>
            </div>
          ) : isUser ? (
            <>
              {message.imageUrl && (
                <img src={message.imageUrl} alt="" className="askit-msg-image" />
              )}
              <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
            </>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content || '...') }} />
          )}
        </div>
        {!isTyping && message.content && (
          <div className="askit-msg-actions">
            <button onClick={handleCopy} title="Copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
            {!isUser && (
              <button onClick={handleRegenerate} title="Regenerate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                </svg>
              </button>
            )}
            <button onClick={handleDelete} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
