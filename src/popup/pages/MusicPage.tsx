import { useState } from 'react'
import type { Settings } from '@/shared/types'
import { chatCompletion } from '@/shared/api'

interface Props {
  settings: Settings
}

export function MusicPage({ settings }: Props) {
  const [theme, setTheme] = useState('')
  const [style, setStyle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [showLyrics, setShowLyrics] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateLyrics() {
    if (!theme || !settings.apiKey) return
    setLyricsLoading(true)

    try {
      const text = await chatCompletion(settings, [
        { role: 'system', content: 'You are a creative songwriter. Write original song lyrics based on the theme. Include verse, chorus structure. Write in Chinese unless theme is in English.' },
        { role: 'user', content: `Write song lyrics about: ${theme}` },
      ])
      setLyrics(text)
      setShowLyrics(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLyricsLoading(false)
    }
  }

  async function generateMusic() {
    if (!settings.apiKey) return
    const musicPrompt = lyrics
      ? `${style ? style + '. ' : ''}Lyrics: ${lyrics.substring(0, 500)}`
      : `${style ? style + '. ' : ''}Theme: ${theme}`

    if (!musicPrompt.trim()) return

    setLoading(true)
    setError('')
    setAudioUrl('')

    try {
      const res = await fetch(`${settings.apiBase}/music_generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
          model: 'music-2.6',
          prompt: musicPrompt,
          lyrics: lyrics || undefined,
          audio_setting: { format: 'mp3' },
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setAudioUrl(data.data?.audio ?? '')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Theme / Topic</label>
        <textarea
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="A love story about longing and reunion..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500"
        />
      </div>

      <button
        onClick={generateLyrics}
        disabled={lyricsLoading || !theme}
        className="w-full py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10 cursor-pointer hover:bg-white/15 disabled:opacity-50"
      >
        {lyricsLoading ? 'Generating...' : '✨ Generate Lyrics First'}
      </button>

      {showLyrics && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Lyrics</label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-y focus:outline-none focus:border-violet-500"
          />
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-400 mb-1">Music Style</label>
        <textarea
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="Pop ballad, emotional, piano accompaniment..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-violet-500"
        />
      </div>

      <button
        onClick={generateMusic}
        disabled={loading || (!theme && !lyrics)}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer disabled:opacity-50"
      >
        {loading ? 'Generating...' : '🎵 Generate Music'}
      </button>

      {error && <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded-lg">{error}</p>}
      {audioUrl && (
        <div className="space-y-2">
          <audio controls src={audioUrl} className="w-full" />
          <a href={audioUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-violet-400 hover:text-violet-300">
            Open Music
          </a>
        </div>
      )}
    </div>
  )
}
