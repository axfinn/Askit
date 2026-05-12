import { renderMarkdown } from '@/shared/markdown'
import type { Message } from '@/shared/types'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`askit-msg ${message.role}`}>
      <div className="askit-msg-bubble">
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content || '...') }} />
        )}
      </div>
    </div>
  )
}
