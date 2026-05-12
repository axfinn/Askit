import { useState } from 'react'
import type { Settings } from '@/shared/types'

interface Props {
  settings: Settings
}

const VOICES = [
  { id: 'male-qn-qingse', label: 'Female, Young' },
  { id: 'female-qn-yujie', label: 'Female, Mature' },
  { id: 'male-qn-qingyue', label: 'Male, Young' },
  { id: 'male-qn-qiankun', label: 'Male, Deep' },
]

export function TTSPage({ settings }: Props) {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState(VOICES[0].id)
  const [speed, setSpeed] = useState(1)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!text || !settings.apiKey) return
    setLoading(true)
    setError('')
    setAudioUrl('')

    try {
      const res = await fetch(`${settings.apiBase}/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: 'speech-01', input: text, voice, speed }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const blob = await res.blob()
      setAudioUrl(URL.createObjectURL(blob))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Voice</label>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 [&_option]:bg-[#1a1a2e]"
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Speed: {speed.toFixed(1)}</label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      <button
        onClick={generate}
        disabled={loading || !text}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Speech'}
      </button>
      {error && <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg">{error}</p>}
      {audioUrl && (
        <div className="space-y-2">
          <audio controls src={audioUrl} className="w-full" />
          <a href={audioUrl} download="speech.mp3" className="block text-center text-xs text-violet-400 hover:text-violet-300">
            Download MP3
          </a>
        </div>
      )}
    </div>
  )
}
