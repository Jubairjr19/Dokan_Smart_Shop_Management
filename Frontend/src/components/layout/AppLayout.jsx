import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AmbientBackground from './AmbientBackground.jsx'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const COLLAPSE_KEY = 'dokan:sidebar-collapsed'

export default function AppLayout() {
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // Only a convenience; the sidebar simply starts expanded next time.
    }
  }, [collapsed])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh gap-3 p-3">
      <AmbientBackground />
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main key={pathname} className="min-w-0 flex-1 animate-page-in space-y-4 px-0.5 pb-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
