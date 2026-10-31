import { NavLink } from 'react-router-dom'

export default function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      end={item.path === '/admin' || item.path === '/coordinator' || item.path === '/faculty' || item.path === '/club' || item.path === '/student'}
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-teal-900 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-xs font-bold">
        {item.icon ?? item.label.slice(0, 1)}
      </span>
      <span>{item.label}</span>
    </NavLink>
  )
}
