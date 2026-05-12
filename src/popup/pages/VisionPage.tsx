import { useState } from 'react'
import type { Settings } from '@/shared/types'

interface Props {
  settings: Settings
}

export function VisionPage({ settings }: Props) {
  const [imageData, setImageData] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageData(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!imageData || !settings.apiKey) return
    setLoading(true)
    setResult('')

    const q = question || '请描述这张图片的内容'

    try {
      if (settings.provider === 'minimax') {
        const res = await fetch(`${settings.apiBase}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
          body: JSON.stringify({
            model: 'MiniMax-VL-01',
            messages: [{ role: 'user', content: [{ type: 'text', text: q }, { type: 'image_url', image_url: { url: imageData } }] }],
          }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        setResult(data.choices?.[0]?.message?.content ?? 'No response')
      } else {
        const res = await fetch(`${settings.apiBase}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
          body: JSON.stringify({
            model: settings.model,
            messages: [{ role: 'user', content: [{ type: 'text', text: q }, { type: 'image_url', image_url: { url: imageData } }] }],
          }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        setResult(data.choices?.[0]?.message?.content ?? 'No response')
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Upload Image</label>
        <input type="file" accept="image/*" onChange={handleFile} className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-600/20 file:text-violet-300 file:cursor-pointer" />
      </div>
      {imageData && <img src={imageData} alt="Preview" className="w-full max-h-40 object-contain rounded-lg" />}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What is in this image?"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500"
        />
      </div>
      <button
        onClick={analyze}
        disabled={loading || !imageData}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze Image'}
      </button>
      {result && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  )
}
