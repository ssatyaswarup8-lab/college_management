import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api/analytics.api.js'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'

function overviewPayload(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function pick(data, keys) {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], data)
    if (value !== undefined && value !== null) return value
  }
  return '—'
}

export default function Dashboard() {
  const overview = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.getOverview(),
  })
  const data = overviewPayload(overview.data)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations overview"
        title="Good day, Admin"
        description="Review campus scheduling health and the actions that need attention. Metrics are provided by the active schedule and backend analytics."
        actions={<Link className="inline-flex min-h-10 items-center rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950" to="/admin/timetable">View timetable</Link>}
      />
      {overview.isLoading ? <LoadingState label="Loading campus overview" /> : null}
      {overview.isError ? <ErrorState title="Unable to load the admin overview" message="Analytics are temporarily unavailable." onRetry={() => overview.refetch()} /> : null}
      {overview.isSuccess ? (
        <>
          {data.scheduleUnavailable ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><p className="font-semibold">No active timetable yet</p><p className="mt-1">Your dataset is active. Generate a timetable and approve its proposal to populate schedule metrics.</p><Link className="mt-2 inline-flex font-semibold underline" to="/admin/timetable">Generate timetable</Link></div> : null}
          <section aria-label="Campus scheduling metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Sessions scheduled" value={pick(data, ['sessionsScheduled', 'sessions_scheduled', 'scheduledSessions', 'schedule.sessionsScheduled'])} detail="From the active schedule" tone="teal" />
            <StatCard label="Hard violations" value={pick(data, ['hardViolations', 'hard_violations', 'schedule.hardViolations'])} detail="Reported by schedule validation" tone="emerald" />
            <StatCard label="Pending bookings" value={pick(data, ['pendingBookings', 'pending_bookings', 'bookings.pending'])} detail="Awaiting a decision" tone="amber" />
            <StatCard label="Room utilization" value={pick(data, ['roomUtilization', 'room_utilization', 'rooms.utilization'])} detail="For the active schedule" tone="violet" />
          </section>
          <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Schedule health</h2>
              <p className="mt-1 text-sm text-slate-600">A snapshot of the latest backend overview.</p>
              <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Soft penalty</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{pick(data, ['softPenalty', 'soft_penalty', 'schedule.softPenalty'])}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Faculty utilization</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{pick(data, ['facultyUtilization', 'faculty_utilization', 'faculty.utilization'])}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Active conflicts</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{pick(data, ['activeConflicts', 'active_conflicts', 'conflicts.count'])}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Schedule version</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{pick(data, ['scheduleVersionId', 'schedule_version_id', 'schedule.version'])}</dd></div>
              </dl>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
              <p className="mt-1 text-sm text-slate-600">Go to a campus operations workflow.</p>
              <div className="mt-5 grid gap-2">
                {[
                  ['Generate timetable', '/admin/timetable'],
                  ['Review bookings', '/admin/bookings'],
                  ['Analyze disruptions', '/admin/disruptions'],
                  ['Plan a scenario', '/admin/scenarios'],
                  ['Review conflicts', '/admin/conflicts'],
                ].map(([label, path]) => <Link className="flex min-h-11 items-center justify-between rounded-lg border border-slate-200 px-3.5 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900" key={path} to={path}><span>{label}</span><span aria-hidden="true">→</span></Link>)}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

