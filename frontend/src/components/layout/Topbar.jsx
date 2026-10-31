import { useLocation } from 'react-router-dom'
import { getVisibleNavigation } from '../../utils/permissions.js'
import UserMenu from './UserMenu.jsx'
import NotificationBell from '../notifications/NotificationBell.jsx'

export default function Topbar({ role, onMenuClick }) {
  const location = useLocation()
  const navigation = getVisibleNavigation(role)
  const current = navigation.find((item) => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`)))
  const pageTitle = current?.label ?? 'CampusFlow'

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] backdrop-blur sm:px-6 lg:px-9 xl:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 lg:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <span aria-hidden="true" className="text-lg">☰</span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight text-slate-950">{pageTitle}</p>
          <p className="hidden text-xs text-slate-500 sm:block">Smarter scheduling. Better campus management.</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NotificationBell />
        <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
