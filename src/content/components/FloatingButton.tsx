import { useStore } from '@/shared/store'

export function FloatingButton() {
  const { sidebarOpen, toggleSidebar } = useStore()

  if (sidebarOpen) return null

  return (
    <button onClick={toggleSidebar} className="askit-fab" title="AskIt (Alt+J)">
      ✦
    </button>
  )
}
