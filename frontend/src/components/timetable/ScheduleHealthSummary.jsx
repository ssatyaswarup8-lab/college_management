import useScheduleStatistics from '../../hooks/useScheduleStatistics.js'
import ErrorState from '../common/ErrorState.jsx'
import LoadingState from '../common/LoadingState.jsx'
import StatCard from '../common/StatCard.jsx'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }

export default function ScheduleHealthSummary({ params = {} }) {
  const query = useScheduleStatistics(params)
  const data = unwrap(query.data) ?? {}
  if (query.isLoading) return <LoadingState label="Loading schedule health" className="min-h-28" />
  if (query.isError) return <ErrorState title="Unable to load schedule health" message="Schedule analytics could not be reached." onRetry={() => query.refetch()} />
  return <section aria-label="Schedule health" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Scheduled sessions" value={data.summary?.sessionsScheduled ?? '—'} />
    <StatCard label="Student gap periods" value={data.summary?.totalStudentGapPeriods ?? '—'} tone="violet" />
    <StatCard label="Faculty days over limit" value={data.summary?.facultyDaysOverDailyLimit ?? '—'} tone="amber" />
    <StatCard label="Schedule version" value={data.scheduleVersion?.id ?? '—'} tone="teal" />
  </section>
}
