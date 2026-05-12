import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '@/shared/storage'
import { PROVIDERS, getProvider } from '@/shared/providers'
import type { Settings } from '@/shared/types'

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { getSettings().then(setSettings) }, [])

  async function handleSave() {
    if (!settings) return
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleProviderChange(provider: string) {
    if (!settings) return
    const p = getProvider(provider)
    setSettings({ ...settings, provider, apiBase: p.apiBase, model: p.models.chat })
  }

  function openSidebar() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'ASKIT_TOGGLE_SIDEBAR' })
        window.close()
      }
    })
  }

  if (!settings) return null

  return (
    <div className="w-[480px] h-[600px] bg-gradient-to-b from-[#1a1a2e] to-[#16213e] text-gray-100 flex flex-col p-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            ✦ AskIt
          </h1>
          <span className="text-[9px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-[#1a1a2e] px-1.5 py-0.5 rounded">
            PRO
          </span>
        </div>
        <span className="text-xs text-gray-500">v4.0</span>
      </div>

      {/* Open Sidebar Button */}
      <button
        onClick={openSidebar}
        className="w-full py-4 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer hover:shadow-lg hover:shadow-violet-500/30 transition-all mb-6 flex items-center justify-center gap-2"
      >
        <span className="text-lg">✦</span>
        Open Sidebar on Current Page
      </button>

      <div className="text-xs text-gray-500 mb-4 flex items-center gap-2">
        <span className="flex-1 h-px bg-white/10"></span>
        <span>Settings</span>
        <span className="flex-1 h-px bg-white/10"></span>
      </div>

      {/* Provider */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-2">Provider</label>
        <div className="flex gap-2">
          {Object.values(PROVIDERS).map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs border cursor-pointer transition-all ${
                settings.provider === p.id
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-500 border-violet-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* API Base */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">API Base URL</label>
        <input
          value={settings.apiBase}
          onChange={(e) => setSettings({ ...settings, apiBase: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">API Key</label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Model */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">Model</label>
        <input
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Temperature */}
      <div className="mb-6">
        <label className="block text-xs text-gray-400 mb-1">Temperature: {settings.temperature}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer hover:shadow-lg hover:shadow-violet-500/30 transition-all"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      {/* Shortcuts info */}
      <div className="mt-4 text-center text-xs text-gray-600">
        <p>Alt+J to toggle sidebar on any page</p>
        <p className="mt-1">Select text for quick actions</p>
      </div>
    </div>
  )
}
