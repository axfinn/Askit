import React from 'react'
import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'
import { SelectionPopup } from './SelectionPopup'
import { FloatingButton } from './components/FloatingButton'
import contentCss from './content.css?inline'

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
      <Sidebar />
      <SelectionPopup />
    </>
  )
}

init()
