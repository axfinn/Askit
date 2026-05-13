import React from 'react'
import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'
import { SelectionPopup } from './SelectionPopup'
import { FloatingButton } from './components/FloatingButton'
import { Sideline } from './components/Sideline'
import { SearchEnhancement } from './components/SearchEnhancement'
import { InputAssist } from './components/InputAssist'
import { useStore } from '@/shared/store'
import contentCss from './content.css?inline'

// Suppress "Extension context invalidated" errors after extension reload
window.addEventListener('error', (e) => {
  if (e.message?.includes('Extension context invalidated')) e.preventDefault()
})
window.addEventListener('unhandledrejection', (e) => {
  if (String(e.reason).includes('Extension context invalidated')) e.preventDefault()
})

// Top-level message listener - works immediately when script loads, before React mounts
try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ASKIT_TOGGLE_SIDEBAR') {
      useStore.getState().toggleSidebar()
    }
  })
} catch {}

// Top-level hotkey listener - guaranteed to work regardless of Shadow DOM
document.addEventListener('keydown', (e) => {
  if ((e.altKey || e.metaKey) && e.key === 'j') {
    e.preventDefault()
    useStore.getState().toggleSidebar()
  }
})

function init() {
  if (document.getElementById('askit-root')) return

  const host = document.createElement('div')
  host.id = 'askit-root'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = contentCss
  shadow.appendChild(style)

  const container = document.createElement('div')
  container.id = 'askit-app'
  shadow.appendChild(container)

  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

function App() {
  return (
    <>
      <FloatingButton />
      <Sideline />
      <Sidebar />
      <SelectionPopup />
      <SearchEnhancement />
      <InputAssist />
    </>
  )
}

init()
