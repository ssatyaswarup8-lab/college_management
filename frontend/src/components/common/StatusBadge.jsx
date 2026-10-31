const STATUS_STYLES = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-800',
  conflict: 'border-rose-200 bg-rose-50 text-rose-800',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  alternative_offered: 'border-violet-200 bg-violet-50 text-violet-800',
  draft: 'border-slate-200 bg-white text-slate-700',
  scheduled: 'border-sky-200 bg-sky-50 text-sky-800',
}

function labelFor(status) {
  return String(status ?? 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function StatusBadge({ status, className = '' }) {
  const normalized = String(status ?? '').toLowerCase()
  const style = STATUS_STYLES[normalized] ?? 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style} ${className}`.trim()}>
      <span aria-hidden="true" className="mr-1.5">{normalized === 'approved' ? '✓' : normalized === 'rejected' ? '×' : '•'}</span>
      <span>{labelFor(status)}</span>
    </span>
  )
}
