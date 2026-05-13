import type { PageType } from '@/shared/types'

interface Props {
  pageType: PageType
  onAction: (action: string) => void
}

export function PageBanner({ pageType, onAction }: Props) {
  if (pageType === 'normal') return null

  const config: Record<string, { icon: string; text: string; action: string; btnText: string }> = {
    youtube: { icon: '📺', text: '检测到视频页面', action: 'youtube-summary', btnText: '总结视频' },
    pdf: { icon: '📄', text: '检测到 PDF 文档', action: 'pdf-summary', btnText: '总结文档' },
    search: { icon: '🔍', text: '搜索页面', action: 'search-enhance', btnText: 'AI 回答' },
  }

  const c = config[pageType]
  if (!c) return null

  return (
    <div className="askit-page-banner">
      <span className="askit-page-banner-icon">{c.icon}</span>
      <span className="askit-page-banner-text">{c.text}</span>
      <button className="askit-page-banner-btn" onClick={() => onAction(c.action)}>
        {c.btnText}
      </button>
    </div>
  )
}
