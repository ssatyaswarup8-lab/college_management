export default function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'slate',
  className = '',
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    teal: 'bg-teal-50 text-teal-800',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    violet: 'bg-violet-50 text-violet-800',
  }

  return (
    <article className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-950">{value ?? '—'}</p>
        </div>
        {icon ? (
          <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg ${tones[tone] ?? tones.slate}`}>
            {icon}
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </article>
  )
}
