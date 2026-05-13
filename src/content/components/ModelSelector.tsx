import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/shared/store'
import { PROVIDERS } from '@/shared/providers'

export function ModelSelector() {
  const { settings, setSettings } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const provider = PROVIDERS[settings.provider]
  const modelName = settings.model.length > 16 ? settings.model.substring(0, 14) + '…' : settings.model

  return (
    <div className="askit-model-selector" ref={ref}>
      <button className="askit-model-trigger" onClick={() => setOpen(!open)}>
        <span className="askit-model-name">{modelName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="askit-model-dropdown">
          {Object.values(PROVIDERS).map(p => (
            <div key={p.id} className="askit-model-group">
              <div className="askit-model-group-label">{p.name}</div>
              <button
                className={`askit-model-option ${settings.provider === p.id && settings.model === p.models.chat ? 'active' : ''}`}
                onClick={() => {
                  setSettings({ ...settings, provider: p.id, apiBase: p.apiBase, model: p.models.chat })
                  setOpen(false)
                }}
              >
                {p.models.chat}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
