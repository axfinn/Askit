import { useState } from 'react'
import type { Settings } from '@/shared/types'

interface Props {
  settings: Settings
}

export function ImagePage({ settings }: Props) {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!prompt || !settings.apiKey) return
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await fetch(`${settings.apiBase}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: 'image-01', prompt, size, response_format: 'url' }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setResult(data.data?.[0]?.url ?? '')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A beautiful sunset over the ocean..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Size</label>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 [&_option]:bg-[#1a1a2e]"
        >
          <option value="1024x1024">1024 x 1024</option>
          <option value="1536x1024">1536 x 1024 (3:2)</option>
          <option value="1024x1536">1024 x 1536 (2:3)</option>
          <option value="1920x1080">1920 x 1080 (16:9)</option>
        </select>
      </div>
      <button
        onClick={generate}
        disabled={loading || !prompt}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : 'Generate Image'}
      </button>
      {error && <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg">{error}</p>}
      {result && (
        <div className="space-y-2">
          <img src={result} alt="Generated" className="w-full rounded-lg" />
          <a href={result} target="_blank" rel="noreferrer" className="block text-center text-xs text-violet-400 hover:text-violet-300">
            Open full size
          </a>
        </div>
      )}
    </div>
  )
}
