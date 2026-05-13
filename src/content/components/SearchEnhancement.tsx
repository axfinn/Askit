import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/shared/store'
import { streamChat } from '@/shared/api'
import { renderMarkdown } from '@/shared/markdown'
import { detectPageType, getSearchQuery } from '../utils/detectPage'

interface Message { role: 'user' | 'assistant' | 'system'; content: string }

export function SearchEnhancement() {
  const { settings } = useStore()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const [history, setHistory] = useState<Message[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (detectPageType() !== 'search') return
    const q = getSearchQuery()
    if (q && q.length > 2) {
      setQuery(q)
      doSearch(q, [])
    }
  }, [])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [result])

  async function doSearch(q: string, prevHistory: Message[]) {
    if (!settings.apiKey) return
    setLoading(true)
    setResult('')

    const messages: Message[] = [
      { role: 'system', content: 'You are a helpful AI assistant. Provide a concise, informative answer to the search query. Use markdown formatting. Respond in the same language as the query.' },
      ...prevHistory,
      { role: 'user', content: q },
    ]

    let fullText = ''
    try {
      await streamChat(settings, messages, {
        onToken: (token) => { fullText += token; setResult(fullText) },
        onDone: () => {
          setHistory([...prevHistory, { role: 'user', content: q }, { role: 'assistant', content: fullText }])
        },
        onError: (err) => setResult(`Error: ${err.message}`),
      })
    } catch (err: any) {
      if (err.name !== 'AbortError') setResult(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleFollowUp() {
    const q = followUp.trim()
    if (!q || loading) return
    setFollowUp('')
    doSearch(q, history)
  }

  if (detectPageType() !== 'search' || dismissed || !query) return null

  return (
    <div className={`askit-search-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="askit-search-panel-header">
        <div className="askit-search-panel-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round"/>
          </svg>
          <span>AskIt AI</span>
        </div>
        <div className="askit-search-panel-actions">
          <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? '展开' : '收起'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? <path d="M6 9l6 6 6-6"/> : <path d="M18 15l-6-6-6 6"/>}
            </svg>
          </button>
          <button onClick={() => setDismissed(true)} title="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="askit-search-panel-body" ref={bodyRef}>
            {result ? (
              <div className="askit-search-panel-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
            ) : loading ? (
              <div className="askit-search-panel-loading">
                <div className="spinner" />
                <span>正在思考...</span>
              </div>
            ) : null}
          </div>
          <div className="askit-search-panel-input">
            <input
              ref={inputRef}
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFollowUp() } }}
              placeholder="追问..."
              disabled={loading}
            />
            <button onClick={handleFollowUp} disabled={loading || !followUp.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
