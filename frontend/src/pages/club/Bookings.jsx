import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { bookingApi } from '../../api/booking.api.js'
import BookingDecision from '../../components/bookings/BookingDecision.jsx'
import BookingRequestForm from '../../components/bookings/BookingRequestForm.jsx'
import BookingReviewForm from '../../components/bookings/BookingReviewForm.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import useAuth from '../../hooks/useAuth.js'
import { useBookingActions } from '../../hooks/useBookings.js'
import { getFriendlyError } from '../../utils/errorHandler.js'

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response
}

function getBookings(response) {
  const data = unwrap(response)
  return Array.isArray(data) ? data : data?.bookings ?? data?.items ?? []
}

export default function Bookings() {
  const { user } = useAuth()
  const [draft, setDraft] = useState(null)
  const [parseError, setParseError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const actions = useBookingActions()
  const bookingsQuery = useQuery({ queryKey: ['bookings', 'club'], queryFn: () => bookingApi.getAll() })
  const bookings = getBookings(bookingsQuery.data)

  async function understandRequest(rawText) {
    setParseError('')
    setSubmitError('')
    setSuccessMessage('')
    try {
      const response = await actions.parse.mutateAsync({ text: rawText })
      const parsed = unwrap(response)
      const draft = parsed?.draft ?? parsed?.booking ?? parsed?.structuredBooking ?? parsed
      setDraft({ ...draft, rawText })
      if (!draft?.windows && !draft?.title) {
        setParseError(draft?.followUp ?? draft?.follow_up ?? 'The request could not be structured yet. Add more details and try again.')
      }
    } catch (error) {
      setParseError(getFriendlyError(error, 'Unable to understand the request. You can try again or contact the coordinator.').message)
    }
  }

  async function submitBooking(payload) {
    setSubmitError('')
    setSuccessMessage('')
    try {
      await actions.create.mutateAsync(payload)
      setDraft(null)
      setSuccessMessage('Your venue request was submitted. You can track its status below.')
      bookingsQuery.refetch()
    } catch (error) {
      setSubmitError(getFriendlyError(error, 'Unable to submit the venue request. Review the details and try again.').message)
    }
  }

  const isFaculty = user?.role === 'FACULTY'

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={isFaculty ? 'Faculty workspace' : 'Club workspace'} title="Venue bookings" description="Describe your request, review the structured draft, and submit it for a decision. Requests are not reserved until the backend confirms the decision." />
      <BookingRequestForm onSubmit={understandRequest} isPending={actions.parse.isPending} error={parseError} />
      {draft ? <><BookingReviewForm booking={draft} followUp={draft.followUp ?? draft.follow_up} onSubmit={submitBooking} onCancel={() => setDraft(null)} isPending={actions.create.isPending} />{submitError ? <ErrorState title="Request was not submitted" message={submitError} /> : null}</> : null}
      {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">{successMessage}</p> : null}
      <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-900">My requests</h2><p className="mt-1 text-sm text-slate-600">Status and decision reasons come from the booking service.</p></div>
        {bookingsQuery.isLoading ? <LoadingState label="Loading your requests" /> : null}
        {bookingsQuery.isError ? <ErrorState title="Unable to load your requests" message="Your booking list could not be reached." onRetry={() => bookingsQuery.refetch()} /> : null}
        {bookingsQuery.isSuccess && bookings.length === 0 ? <EmptyState title="No booking requests yet" description="Your submitted requests will appear here." /> : null}
        {bookingsQuery.isSuccess && bookings.length > 0 ? <div className="space-y-3">{bookings.map((booking, index) => <BookingDecision booking={booking} key={booking.id ?? booking.requestId ?? index} />)}</div> : null}
      </section>
    </div>
  )
}
