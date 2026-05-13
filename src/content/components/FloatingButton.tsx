import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/shared/store'

interface Position {
  x: number
  y: number
}

export function FloatingButton() {
  const { sidebarOpen, toggleSidebar } = useStore()
  const [position, setPosition] = useState<Position>({ x: window.innerWidth - 76, y: window.innerHeight - 76 })
  const [collapsed, setCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(false)
  const startRef = useRef<{ x: number; y: number; px: number; py: number }>({ x: 0, y: 0, px: 0, py: 0 })
  const movedRef = useRef(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    try {
      chrome.storage.local.get(['askit_fab_pos', 'askit_fab_collapsed']).then(result => {
        if (result.askit_fab_pos) setPosition(result.askit_fab_pos as Position)
        if (result.askit_fab_collapsed) setCollapsed(true)
      }).catch(() => {})
    } catch {}
  }, [])

  const savePosition = useCallback((pos: Position) => {
    try { chrome.storage.local.set({ askit_fab_pos: pos }) } catch {}
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = true
    movedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }
    setDragging(true)

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - startRef.current.x
      const dy = ev.clientY - startRef.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true

      const newX = Math.max(0, Math.min(window.innerWidth - 52, startRef.current.px + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - 52, startRef.current.py + dy))
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      dragRef.current = false
      setDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (!movedRef.current) return

      setPosition(prev => {
        const snapped = snapToEdge(prev)
        savePosition(snapped)
        return snapped
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [position, savePosition])

  const handleClick = useCallback(() => {
    if (movedRef.current) return
    if (collapsed) {
      setCollapsed(false)
      try { chrome.storage.local.set({ askit_fab_collapsed: false }) } catch {}
    } else {
      toggleSidebar()
    }
  }, [collapsed, toggleSidebar])

  const handleDoubleClick = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try { chrome.storage.local.set({ askit_fab_collapsed: next }) } catch {}
      return next
    })
  }, [])

  if (sidebarOpen) return null

  return (
    <button
      ref={btnRef}
      className={`askit-fab ${collapsed ? 'askit-fab-collapsed' : ''} ${dragging ? 'askit-fab-dragging' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={collapsed ? 'Click to expand' : 'AskIt (Alt+J) · Double-click to minimize · Drag to move'}
    >
      {collapsed ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}

function snapToEdge(pos: Position): Position {
  const w = window.innerWidth
  const h = window.innerHeight
  const distLeft = pos.x
  const distRight = w - pos.x - 52
  const distTop = pos.y
  const distBottom = h - pos.y - 52

  const min = Math.min(distLeft, distRight, distTop, distBottom)
  if (min === distLeft) return { x: 8, y: pos.y }
  if (min === distRight) return { x: w - 60, y: pos.y }
  if (min === distTop) return { x: pos.x, y: 8 }
  return { x: pos.x, y: h - 60 }
}
