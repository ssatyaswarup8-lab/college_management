import { getVisibleNavigation } from '../../utils/permissions.js'
import NavItem from './NavItem.jsx'

export default function Sidebar({ role, open = false, onNavigate }) {
  const navigation = getVisibleNavigation(role)

  return (
    <>
      {open ? (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={onNavigate}
          type="button"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
          <img alt="" aria-hidden="true" className="h-11 w-11 object-contain" height="410" src="/cit-mark.png" width="360" />
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">CIT</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">CampusFlow</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          {navigation.map((item) => <NavItem key={`${item.path}-${item.label}`} item={item} onNavigate={onNavigate} />)}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold text-slate-700">Scheduling made clear</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">See what is planned, what changed, and what needs your attention.</p>
          </div>
        </div>
      </aside>
    </>
  )
}
