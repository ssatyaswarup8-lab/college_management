export default function EmptyState({
  title = 'Nothing here yet',
  description = 'There is no information to show right now.',
  action,
  className = '',
}) {
  return (
    <section className={`rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center ${className}`.trim()}>
      <div aria-hidden="true" className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500">
        <span className="text-lg">—</span>
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-800">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  )
}
