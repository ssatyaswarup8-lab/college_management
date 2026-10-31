import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { bookingApi } from '../../api/booking.api.js'
import BookingDetails from '../../components/bookings/BookingDetails.jsx'
import BookingFilters from '../../components/bookings/BookingFilters.jsx'
import BookingTable from '../../components/bookings/BookingTable.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { useBookingActions } from '../../hooks/useBookings.js'
import { getFriendlyError } from '../../utils/errorHandler.js'
import SkeletonTable from '../../components/common/SkeletonTable.jsx'
import useDebouncedValue from '../../hooks/useDebouncedValue.js'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }
function getList(response) { const data = unwrap(response); return Array.isArray(data) ? data : data?.bookings ?? data?.items ?? [] }

export default function Bookings() {
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const query = useQuery({ queryKey: ['bookings', 'coordinator', filters.status], queryFn: () => bookingApi.getAll(filters.status ? { status: filters.status } : {}) })
  const actions = useBookingActions()
  const items = getList(query.data)
  const debouncedSearch = useDebouncedValue(filters.search ?? '', 250)
  const filtered = useMemo(() => items.filter((booking) => !debouncedSearch || [booking.title, booking.requester, booking.category, booking.requestedRoom].some((value) => String(value ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()))), [items, debouncedSearch])
  const pending = actions.approve.isPending || actions.reject.isPending

  async function submitDecision() {
    if (!reason.trim()) { setError('Add a reason for this decision.'); return }
    const booking = decision?.booking
    const bookingId = booking?.id ?? booking?.bookingId ?? booking?.requestId ?? booking?.request_id
    if (!bookingId) { setError('The booking has no ID for the decision request.'); return }
    setError('')
    try {
      if (decision.kind === 'approve') await actions.approve.mutateAsync({ bookingId, reason: reason.trim() })
      else await actions.reject.mutateAsync({ bookingId, reason: reason.trim() })
      setSuccess(`Request ${decision.kind === 'approve' ? 'approved' : 'rejected'}.`)
      setDecision(null); setSelected(null); setReason(''); query.refetch()
    } catch (requestError) { setError(getFriendlyError(requestError, 'Unable to record this booking decision.').message) }
  }

  function startDecision(kind, booking) { setDecision({ kind, booking }); setReason(''); setError('') }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Department workspace" title="Department bookings" description="Review requests returned for your department. The backend enforces department scope, booking priority, and venue constraints." />
      {error && !decision ? <ErrorState title="Booking action failed" message={error} /> : null}
      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{success}</p> : null}
      <BookingFilters value={filters} onChange={setFilters} />
      {query.isLoading ? <SkeletonTable rows={5} columns={6} /> : null}
      {query.isError ? <ErrorState title="Unable to load department bookings" message="The booking service could not be reached." onRetry={() => query.refetch()} /> : null}
      {query.isSuccess ? <BookingTable bookings={filtered} onSelect={setSelected} /> : null}
      <BookingDetails booking={selected} onClose={() => setSelected(null)} onApprove={(booking) => startDecision('approve', booking)} onReject={(booking) => startDecision('reject', booking)} />
      {decision ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4"><section aria-labelledby="coordinator-decision-title" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog"><h2 className="text-lg font-semibold capitalize text-slate-900" id="coordinator-decision-title">{decision.kind} department booking?</h2><p className="mt-1 text-sm text-slate-600">The backend checks your department authority and all booking constraints.</p><label className="mt-4 grid gap-1 text-xs font-semibold text-slate-700"><span>Decision reason (required)</span><textarea className="min-h-24 rounded-lg border border-slate-300 p-3 text-sm font-normal" onChange={(event) => setReason(event.target.value)} value={reason} /></label>{error ? <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><button className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700" disabled={pending} onClick={() => setDecision(null)} type="button">Cancel</button><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || !reason.trim()} onClick={submitDecision} type="button">{pending ? 'Submitting…' : 'Confirm decision'}</button></div></section></div> : null}
    </div>
  )
}

