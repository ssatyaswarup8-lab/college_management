import StatusBadge from '../common/StatusBadge.jsx'
import BookingRequestDetails from './BookingRequestDetails.jsx'

export default function BookingDetails({ booking, onClose, onApprove, onReject }) {
  if (!booking) return null
  const status = String(booking.status ?? 'pending').toLowerCase()

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
    <section aria-labelledby="booking-detail-title" aria-modal="true" className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl" role="dialog">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Venue request</p><h2 className="mt-1 text-xl font-semibold text-slate-900" id="booking-detail-title">{booking.title ?? booking.purpose ?? booking.sourceId ?? booking.id ?? 'Booking request'}</h2></div><button aria-label="Close booking details" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" onClick={onClose} type="button">×</button></header>
      <div className="flex-1 space-y-4 p-5"><StatusBadge status={status} /><BookingRequestDetails booking={booking} /></div>
      {status === 'pending' ? <footer className="flex justify-end gap-2 border-t border-slate-200 p-4"><button className="min-h-10 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-800" onClick={() => onReject?.(booking)} type="button">Reject</button><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white" onClick={() => onApprove?.(booking)} type="button">Approve</button></footer> : null}
    </section>
  </div>
}
