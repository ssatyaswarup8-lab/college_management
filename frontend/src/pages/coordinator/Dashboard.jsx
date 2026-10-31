import { Link } from 'react-router-dom'
import { useBookings } from '../../hooks/useBookings.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'

function getBookings(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.bookings ?? data?.items ?? []
}

export default function Dashboard() {
  const bookingsQuery = useBookings({})
  const bookings = getBookings(bookingsQuery.data)
  const pending = bookings.filter((booking) => String(booking.status ?? '').toLowerCase() === 'pending')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Department workspace" title="Coordinator dashboard" description="Track department booking requests and schedule operations." actions={<Link className="inline-flex min-h-10 items-center rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950" to="/coordinator/timetable">Department timetable</Link>} />
      {bookingsQuery.isLoading ? <LoadingState label="Loading department requests" /> : null}
      {bookingsQuery.isError ? <ErrorState title="Unable to load department bookings" message="Department booking data could not be reached." onRetry={() => bookingsQuery.refetch()} /> : null}
      {bookingsQuery.isSuccess ? <>
        <section className="grid gap-4 sm:grid-cols-2"><StatCard label="Department requests" value={bookings.length} detail="Requests returned for your role" tone="teal" /><StatCard label="Awaiting review" value={pending.length} detail="Pending department requests" tone="amber" /></section>
        {bookings.length === 0 ? <EmptyState title="No department requests" description="There are no booking requests to review right now." /> : <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Recent requests</h2><ul className="mt-3 divide-y divide-slate-100">{bookings.slice(0, 5).map((booking, index) => <li className="flex flex-wrap justify-between gap-2 py-3" key={booking.id ?? booking.bookingId ?? index}><span className="text-sm font-medium text-slate-800">{booking.title ?? booking.purpose ?? booking.requestId ?? 'Venue request'}</span><span className="text-xs font-semibold capitalize text-slate-600">{String(booking.status ?? 'pending').replaceAll('_', ' ')}</span></li>)}</ul></section>}
      </> : null}
    </div>
  )
}

