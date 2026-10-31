import { useState } from 'react'
import useAuth from '../../hooks/useAuth.js'
import { formatRole } from '../../utils/formatters.js'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const name = user?.name ?? user?.fullName ?? user?.email ?? 'Account'
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'

  async function handleLogout() {
    setOpen(false)
    try {
      await logout()
    } catch {
      // The local session is cleared even if the server logout request fails.
    }
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-left transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-900">{initials}</span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">{name}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{formatRole(user?.role)}</span>
        </span>
        <span aria-hidden="true" className="ml-1 text-xs text-slate-500">⌄</span>
      </button>

      {open ? (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close account menu" onClick={() => setOpen(false)} type="button" />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg" role="menu">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
              {user?.email ? <p className="truncate text-xs text-slate-500">{user.email}</p> : null}
            </div>
            <button className="mt-1 flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-700" onClick={handleLogout} role="menuitem" type="button">
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
