import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function AppLayout() {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const { role } = useAuth()
  const closeMobileNavigation = () => setMobileNavigationOpen(false)

  return (
    <div className="app-shell min-h-screen text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar role={role} open={mobileNavigationOpen} onNavigate={closeMobileNavigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar role={role} onMenuClick={() => setMobileNavigationOpen(true)} />
          <main className="app-main w-full flex-1 px-4 py-6 sm:px-6 lg:px-9 lg:py-9 xl:px-12">
            <div className="app-content mx-auto w-full max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
