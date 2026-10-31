import { Link } from 'react-router-dom'
import { useBookings } from '../../hooks/useBookings.js'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import useAuth from '../../hooks/useAuth.js'

function getBookings(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.bookings ?? data?.items ?? []
}

export default function Dashboard() {
  const { user } = useAuth()
  const bookingsQuery = useBookings({})
  const bookings = getBookings(bookingsQuery.data)
  const pending = bookings.filter((booking) => String(booking.status ?? '').toLowerCase() === 'pending')
  const name = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Club workspace" title={`Welcome, ${name}`} description="Create venue requests and track each decision from your club workspace." actions={<Link to="/club/bookings" className="inline-flex min-h-10 items-center rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950">Create venue request</Link>} />
      {bookingsQuery.isLoading ? <LoadingState label="Loading your booking requests" /> : null}
      {bookingsQuery.isError ? <ErrorState title="Unable to load your bookings" message="Your booking requests could not be reached." onRetry={() => bookingsQuery.refetch()} /> : null}
      {bookingsQuery.isSuccess ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <StatCard label="My requests" value={bookings.length} detail="Requests returned for your account" tone="teal" />
            <StatCard label="Awaiting decision" value={pending.length} detail="Pending booking requests" tone="amber" />
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Recent booking requests</h2><p className="mt-1 text-sm text-slate-600">Decisions and reasons are shown as returned by the booking service.</p></div><Link className="text-sm font-semibold text-teal-800 hover:text-teal-950" to="/club/bookings">View all</Link></div>
            {bookings.length === 0 ? <div className="mt-5"><EmptyState title="No booking requests yet" description="Create a venue request to get started." action={<Link to="/club/bookings/new" className="font-semibold text-teal-800 hover:text-teal-950">Create a request</Link>} /></div> : <ul className="mt-4 divide-y divide-slate-100">{bookings.slice(0, 5).map((booking, index) => <li key={booking.id ?? booking.bookingId ?? index} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{booking.title ?? booking.purpose ?? booking.requestId ?? 'Venue request'}</p><p className="mt-1 text-xs text-slate-500">{booking.day ?? booking.date ?? 'Date pending'}{booking.roomName || booking.roomId ? ` · ${booking.roomName ?? booking.roomId}` : ''}</p>{booking.reason ? <p className="mt-1 text-xs leading-5 text-slate-600">{booking.reason}</p> : null}</div><StatusBadge status={booking.status ?? 'pending'} /></li>)}</ul>}
          </section>
        </>
      ) : null}
    </div>
  )
}
