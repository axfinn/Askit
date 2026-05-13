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
    chrome.storage.local.get(['askit_fab_pos', 'askit_fab_collapsed']).then(result => {
      if (result.askit_fab_pos) setPosition(result.askit_fab_pos as Position)
      if (result.askit_fab_collapsed) setCollapsed(true)
    })
  }, [])

  const savePosition = useCallback((pos: Position) => {
    chrome.storage.local.set({ askit_fab_pos: pos })
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
      chrome.storage.local.set({ askit_fab_collapsed: false })
    } else {
      toggleSidebar()
    }
  }, [collapsed, toggleSidebar])

  const handleDoubleClick = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      chrome.storage.local.set({ askit_fab_collapsed: next })
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
      {collapsed ? '›' : '✦'}
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
