const VIEWS = [
  { value: 'group', label: 'By group' },
  { value: 'faculty', label: 'By faculty' },
  { value: 'room', label: 'By room' },
]

export default function ViewSwitcher({ value = 'group', onChange, views = VIEWS, className = '' }) {
  return (
    <div aria-label="Timetable view" className={`inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 ${className}`.trim()} role="group">
      {views.map((view) => (
        <button
          aria-pressed={value === view.value}
          className={`min-h-9 rounded-md px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 sm:text-sm ${value === view.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          key={view.value}
          onClick={() => onChange?.(view.value)}
          type="button"
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
