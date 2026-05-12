import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '@/shared/storage'
import { PROVIDERS } from '@/shared/providers'
import type { Settings } from '@/shared/types'
import { ChatPage } from './pages/ChatPage'
import { ImagePage } from './pages/ImagePage'
import { VisionPage } from './pages/VisionPage'
import { TTSPage } from './pages/TTSPage'
import { MusicPage } from './pages/MusicPage'
import { SettingsPage } from './pages/SettingsPage'

type Tab = 'chat' | 'image' | 'vision' | 'tts' | 'music' | 'settings'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'image', icon: '🎨', label: 'Image' },
  { id: 'vision', icon: '👁️', label: 'Vision' },
  { id: 'tts', icon: '🎤', label: 'TTS' },
  { id: 'music', icon: '🎵', label: 'Music' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export function App() {
  const [tab, setTab] = useState<Tab>('chat')
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  async function handleSaveSettings(s: Settings) {
    await saveSettings(s)
    setSettings(s)
  }

  if (!settings) return null

  return (
    <div className="w-[480px] h-[600px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            AskIt
          </h1>
          <span className="text-[9px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-[#1a1a2e] px-1.5 py-0.5 rounded">
            PRO
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {PROVIDERS[settings.provider]?.name ?? 'Custom'}
        </span>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-white/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all border-0 cursor-pointer ${
              tab === t.id
                ? 'bg-gradient-to-br from-violet-600 to-indigo-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {tab === 'chat' && <ChatPage settings={settings} />}
        {tab === 'image' && <ImagePage settings={settings} />}
        {tab === 'vision' && <VisionPage settings={settings} />}
        {tab === 'tts' && <TTSPage settings={settings} />}
        {tab === 'music' && <MusicPage settings={settings} />}
        {tab === 'settings' && <SettingsPage settings={settings} onSave={handleSaveSettings} />}
      </main>
    </div>
  )
}
