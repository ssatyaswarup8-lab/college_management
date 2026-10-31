import StatusBadge from '../common/StatusBadge.jsx'
import BookingRequestDetails from './BookingRequestDetails.jsx'

export default function BookingDecision({ booking }) {
  if (!booking) return null
  const status = String(booking.status ?? 'pending').toLowerCase()
  const windows = booking.windows ?? []
  const requestedWindow = windows.map((window) => {
    const start = window.fromPeriod ?? window.from_period
    const end = window.toPeriod ?? window.to_period
    return `${window.day ?? 'Day'}${start ? ` · P${start}–P${end ?? start}` : ''}`
  }).join(', ')
  const requestedRoom = booking.requestedRoom ?? booking.requested_room
  const decision = booking.decision

  return <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label={`Booking request: ${status}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-slate-900">{booking.title ?? booking.purpose ?? booking.sourceId ?? booking.requestId ?? 'Venue request'}</h3><p className="mt-1 text-sm text-slate-600">{booking.requester ?? 'Unknown requester'}{booking.requesterRole ? ` · ${booking.requesterRole.replaceAll('_', ' ')}` : ''}</p></div><StatusBadge status={status} /></div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700"><span>Requested: {requestedWindow || 'Time not specified'}</span>{requestedRoom ? <span>Preferred room: {requestedRoom}</span> : null}<span>Attendance: {booking.attendance ?? '—'}</span><span>Duration: {booking.durationPeriods ?? booking.duration_periods ?? '—'} periods</span></div>
    {decision?.status === 'alternative_offered' ? <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950"><p className="font-semibold">Alternative offered</p><p className="mt-1">{decision.day ?? 'Day —'} · P{decision.startPeriod ?? '—'}–P{decision.endPeriod ?? '—'} · Room {decision.roomId ?? '—'}</p>{decision.reason ? <p className="mt-1">{decision.reason}</p> : null}</div> : null}
    <BookingRequestDetails booking={booking} />
  </section>
}
