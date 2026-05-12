import { useState } from 'react'
import type { Settings } from '@/shared/types'
import { PROVIDERS, getProvider } from '@/shared/providers'

interface Props {
  settings: Settings
  onSave: (s: Settings) => void
}

export function SettingsPage({ settings, onSave }: Props) {
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)

  function handleProviderChange(provider: string) {
    const p = getProvider(provider)
    setForm({ ...form, provider, apiBase: p.apiBase, model: p.models.chat })
  }

  function handleSave() {
    onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-2">Provider</label>
        <div className="flex gap-2">
          {Object.values(PROVIDERS).map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs border cursor-pointer transition-all ${
                form.provider === p.id
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-500 border-violet-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">API Base URL</label>
        <input
          value={form.apiBase}
          onChange={(e) => setForm({ ...form, apiBase: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">API Key</label>
        <input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Model</label>
        <input
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Temperature: {form.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer hover:shadow-lg hover:shadow-violet-500/30 transition-all"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
