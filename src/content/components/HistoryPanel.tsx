import { useEffect } from 'react'
import { useStore } from '@/shared/store'

export function HistoryPanel() {
  const { history, showHistory, setShowHistory, switchConversation, deleteConv, loadHistory } = useStore()

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory])

  if (!showHistory) return null

  return (
    <div className="askit-history-overlay" onClick={() => setShowHistory(false)}>
      <div className="askit-history-panel" onClick={e => e.stopPropagation()}>
        <div className="askit-history-header">
          <span className="askit-history-title">对话历史</span>
          <button className="askit-header-btn" onClick={() => setShowHistory(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="askit-history-list">
          {history.length === 0 ? (
            <div className="askit-history-empty">暂无历史对话</div>
          ) : (
            history.map(item => (
              <div key={item.id} className="askit-history-item" onClick={() => switchConversation(item.id)}>
                <div className="askit-history-item-title">{item.title}</div>
                <div className="askit-history-item-meta">
                  <span>{item.messageCount} 条消息</span>
                  <span>{formatTime(item.updatedAt)}</span>
                </div>
                <button
                  className="askit-history-item-delete"
                  onClick={(e) => { e.stopPropagation(); deleteConv(item.id) }}
                  title="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
