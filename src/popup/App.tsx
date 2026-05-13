import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '@/shared/storage'
import { PROVIDERS, getProvider } from '@/shared/providers'
import type { Settings } from '@/shared/types'

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => { getSettings().then(setSettings) }, [])

  async function handleSave() {
    if (!settings) return
    const toSave = { ...settings, providerKeys: { ...settings.providerKeys, [settings.provider]: settings.apiKey } }
    await saveSettings(toSave)
    setSettings(toSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleProviderChange(provider: string) {
    if (!settings) return
    const p = getProvider(provider)
    const providerKeys = { ...settings.providerKeys, [settings.provider]: settings.apiKey }
    const restoredKey = providerKeys[provider] || ''
    setSettings({ ...settings, provider, apiBase: p.apiBase, model: p.models.chat, apiKey: restoredKey, providerKeys })
  }

  function openSidebar() {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'ASKIT_TOGGLE_SIDEBAR' })
      } catch {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
        await new Promise(r => setTimeout(r, 150))
        await chrome.tabs.sendMessage(tabId, { type: 'ASKIT_TOGGLE_SIDEBAR' }).catch(() => {})
      }
      window.close()
    })
  }

  if (!settings) return null

  return (
    <div className="w-[420px] h-[560px] flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">AskIt</h1>
              <p className="text-[11px] text-gray-400">AI 浏览助手</p>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">v4.0</span>
        </div>
      </div>

      {/* Quick Action */}
      <div className="px-5 py-4">
        <button
          onClick={openSidebar}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-medium text-sm border-0 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm shadow-violet-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
          打开侧边栏
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2">快捷键 Alt+J 随时唤起</p>
      </div>

      {/* Settings Section */}
      <div className="flex-1 px-5 pb-5 space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="flex-1 h-px bg-gray-100"></span>
          <span>模型配置</span>
          <span className="flex-1 h-px bg-gray-100"></span>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">服务商</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(PROVIDERS).map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                  settings.provider === p.id
                    ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm'
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            API 密钥
            <span className="text-gray-400 font-normal ml-1">({getProvider(settings.provider).name})</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="输入你的 API Key"
              className="w-full px-3 py-2.5 pr-10 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer p-1"
            >
              {showKey ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* MiniMax Key for non-minimax providers */}
        {settings.provider !== 'minimax' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              MiniMax 密钥
              <span className="text-gray-400 font-normal ml-1">(多媒体功能)</span>
            </label>
            <input
              type="password"
              value={settings.providerKeys?.minimax || ''}
              onChange={(e) => setSettings({ ...settings, providerKeys: { ...settings.providerKeys, minimax: e.target.value } })}
              placeholder="图片/语音/音乐生成需要"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all"
            />
          </div>
        )}

        {/* Model & Temperature Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">模型</label>
            <input
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">温度 {settings.temperature}</label>
            <div className="h-[38px] flex items-center px-2 rounded-lg bg-gray-50 border border-gray-200">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-violet-500"
              />
            </div>
          </div>
        </div>

        {/* API Base (collapsible) */}
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors list-none flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            高级设置
          </summary>
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">API 地址</label>
            <input
              value={settings.apiBase}
              onChange={(e) => setSettings({ ...settings, apiBase: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all"
            />
          </div>
        </details>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-2.5 rounded-xl font-medium text-sm border-0 cursor-pointer transition-all ${
            saved
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {saved ? '✓ 已保存' : '保存设置'}
        </button>

        {/* Footer Tips */}
        <div className="text-center space-y-1 pt-1">
          <p className="text-[11px] text-gray-400">选中文字即可快速操作 · 支持图片/语音/音乐生成</p>
        </div>
      </div>
    </div>
  )
}
