import { useStore } from '@/shared/store'

export function FloatingButton() {
  const { sidebarOpen, toggleSidebar } = useStore()

  if (sidebarOpen) return null

  return (
    <button
      onClick={toggleSidebar}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-white text-xl flex items-center justify-center shadow-lg shadow-violet-500/30 hover:scale-110 transition-all z-[99998] border-0 cursor-pointer"
      title="AskIt (Alt+J)"
    >
      ✦
    </button>
  )
}
