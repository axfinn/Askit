import { renderMarkdown } from '@/shared/markdown'
import type { Message } from '@/shared/types'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-violet-600 to-indigo-500 text-white rounded-br-sm'
            : 'bg-white/[0.06] text-gray-100 rounded-bl-sm border border-white/10'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-xs [&_p]:my-1.5 [&_ul]:my-1 [&_ol]:my-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content || '...') }}
          />
        )}
      </div>
    </div>
  )
}
