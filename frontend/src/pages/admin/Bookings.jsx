import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { bookingApi } from '../../api/booking.api.js'
import BookingDecision from '../../components/bookings/BookingDecision.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { useBookingActions } from '../../hooks/useBookings.js'
import { getFriendlyError } from '../../utils/errorHandler.js'

function getBookings(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.bookings ?? data?.items ?? []
}

export default function Bookings() {
  const [status, setStatus] = useState('pending')
  const [decision, setDecision] = useState(null)
  const [reason, setReason] = useState('')
  const [alternative, setAlternative] = useState({ day: '', startPeriod: '', roomId: '' })
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const bookingsQuery = useQuery({ queryKey: ['bookings', 'admin', status], queryFn: () => bookingApi.getAll({ status }) })
  const actions = useBookingActions()
  const bookings = getBookings(bookingsQuery.data)

  function startDecision(booking, nextStatus) {
    setDecision({ booking, status: nextStatus })
    setReason('')
    setActionError('')
    setAlternative({ day: '', startPeriod: '', roomId: '' })
  }

  async function applyDecision() {
    if (!decision) return
    const bookingId = decision.booking.id ?? decision.booking.bookingId ?? decision.booking.requestId ?? decision.booking.request_id
    if (!bookingId) {
      setActionError('This request does not include an ID that can be used by the booking service.')
      return
    }
    if (!reason.trim()) {
      setActionError('Add a reason so the requester understands this decision.')
      return
    }
    if (decision.status === 'alternative_offered' && (!alternative.day || !alternative.startPeriod || !alternative.roomId.trim())) {
      setActionError('Complete the alternative day, start period, and room.')
      return
    }
    const durationPeriods = Number(decision.booking.durationPeriods ?? decision.booking.duration_periods ?? 1)
    if (decision.status === 'alternative_offered' && Number(alternative.startPeriod) + durationPeriods - 1 > 13) {
      setActionError(`This booking lasts ${durationPeriods} period(s), so it must start no later than period ${14 - durationPeriods}.`)
      return
    }

    const payload = decision.status === 'approved'
      ? { reason: reason.trim() }
      : decision.status === 'rejected'
        ? { reason: reason.trim() }
        : { reason: reason.trim(), day: alternative.day, startPeriod: Number(alternative.startPeriod), roomId: alternative.roomId.trim() }

    try {
      if (decision.status === 'approved') await actions.approve.mutateAsync({ bookingId, ...payload })
      if (decision.status === 'rejected') await actions.reject.mutateAsync({ bookingId, ...payload })
      if (decision.status === 'alternative_offered') await actions.offerAlternative.mutateAsync({ bookingId, ...payload })
      setActionSuccess(`Booking ${decision.status.replaceAll('_', ' ')}.`)
      setDecision(null)
      bookingsQuery.refetch()
    } catch (error) {
      setActionError(getFriendlyError(error, 'Unable to record this booking decision.').message)
    }
  }

  const pending = actions.approve.isPending || actions.reject.isPending || actions.offerAlternative.isPending
  const tabs = ['pending', 'approved', 'rejected', 'alternative_offered', 'cancelled']

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Operations" title="Booking requests" description="Review each request and record a decision. The backend checks room availability, priorities, and schedule conflicts." />
      {actionSuccess ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">{actionSuccess}</p> : null}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Booking status filter">{tabs.map((tab) => <button aria-selected={status === tab} className={`min-h-9 shrink-0 rounded-md px-3 text-xs font-semibold capitalize sm:text-sm ${status === tab ? 'bg-teal-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} key={tab} onClick={() => setStatus(tab)} role="tab" type="button">{tab.replaceAll('_', ' ')}</button>)}</div>
      {bookingsQuery.isLoading ? <LoadingState label="Loading booking requests" /> : null}
      {bookingsQuery.isError ? <ErrorState title="Unable to load booking requests" message="The booking service could not be reached." onRetry={() => bookingsQuery.refetch()} /> : null}
      {bookingsQuery.isSuccess && bookings.length === 0 ? <EmptyState title={`No ${status.replaceAll('_', ' ')} requests`} description="There are no booking requests in this status." /> : null}
      {bookingsQuery.isSuccess && bookings.length > 0 ? <div className="space-y-3">{bookings.map((booking, index) => <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" key={booking.id ?? booking.requestId ?? index}>
        <BookingDecision booking={booking} />
        {status === 'pending' ? <div className="flex flex-wrap justify-end gap-2"><button className="min-h-9 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50" onClick={() => startDecision(booking, 'rejected')} type="button">Reject</button><button className="min-h-9 rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50" onClick={() => startDecision(booking, 'alternative_offered')} type="button">Offer alternative</button><button className="min-h-9 rounded-lg bg-teal-900 px-3 text-sm font-semibold text-white hover:bg-teal-950" onClick={() => startDecision(booking, 'approved')} type="button">Approve</button></div> : null}
      </div>)}</div> : null}
      {decision ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section aria-labelledby="booking-decision-title" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6" role="dialog"><h2 className="text-lg font-semibold capitalize text-slate-900" id="booking-decision-title">{decision.status.replaceAll('_', ' ')}</h2><p className="mt-1 text-sm text-slate-600">Add a decision reason. The backend will make the final validity decision.</p>{decision.status === 'alternative_offered' ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-slate-700">Day<select className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" onChange={(event) => setAlternative({ ...alternative, day: event.target.value })} value={alternative.day}><option value="">Select day</option>{['MON','TUE','WED','THU','FRI','SAT'].map((day) => <option key={day}>{day}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-700">Room ID<input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" onChange={(event) => setAlternative({ ...alternative, roomId: event.target.value })} value={alternative.roomId} /></label><label className="grid gap-1 text-xs font-medium text-slate-700">Start period<input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" min="1" max={Math.max(1, 14 - Number(decision.booking.durationPeriods ?? decision.booking.duration_periods ?? 1))} onChange={(event) => setAlternative({ ...alternative, startPeriod: event.target.value })} type="number" value={alternative.startPeriod} /></label><p className="self-center text-xs text-slate-600">Duration: {decision.booking.durationPeriods ?? decision.booking.duration_periods ?? 1} period(s). End period is calculated automatically.</p></div> : null}<label className="mt-4 grid gap-1 text-xs font-medium text-slate-700"><span>Reason (required for every decision)</span><textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" onChange={(event) => setReason(event.target.value)} value={reason} /></label>{actionError ? <p className="mt-3 text-sm text-rose-700" role="alert">{actionError}</p> : null}<div className="mt-5 flex justify-end gap-2"><button className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700" disabled={pending} onClick={() => setDecision(null)} type="button">Cancel</button><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={applyDecision} type="button">{pending ? 'Submitting…' : 'Record decision'}</button></div></section></div> : null}
    </div>
  )
}
