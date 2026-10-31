import StatusBadge from '../common/StatusBadge.jsx'

function entries(booking) {
  const value = booking.decisionHistory ?? booking.history ?? booking.timeline ?? booking.decisions ?? []
  return Array.isArray(value) ? value : []
}

export default function BookingTimeline({ booking }) {
  if (!booking) return null
  const timeline = entries(booking)
  return <section className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">Request timeline</h3><StatusBadge status={booking.status ?? 'pending'} /></div>
    {timeline.length ? <ol className="mt-4 space-y-3 border-l border-slate-200 pl-4">{timeline.map((item, index) => <li className="relative" key={item.id ?? `${item.status ?? 'update'}-${index}`}>
      <span aria-hidden="true" className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-700" />
      <p className="text-sm font-medium capitalize text-slate-800">{String(item.action ?? item.status ?? 'Update').replaceAll('_', ' ')}</p>
      <p className="mt-0.5 text-xs text-slate-500">{item.actor ?? item.user ?? item.decidedBy ?? ''}{item.timestamp || item.createdAt || item.decidedAt ? ` · ${item.timestamp ?? item.createdAt ?? item.decidedAt}` : ''}</p>
      {item.reason ? <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p> : null}
    </li>)}</ol> : <p className="mt-3 text-xs leading-5 text-slate-500">No previous decisions.</p>}
  </section>
}
