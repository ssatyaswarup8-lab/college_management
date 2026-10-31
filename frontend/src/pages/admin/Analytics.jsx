import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api/analytics.api.js'
import DataTable from '../../components/common/DataTable.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import AnalyticsInsightCard from '../../components/analytics/AnalyticsInsightCard.jsx'
import UtilizationChart from '../../components/analytics/UtilizationChart.jsx'
import WorkloadChart from '../../components/analytics/WorkloadChart.jsx'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }
function list(response, key) { const data = unwrap(response); return Array.isArray(data) ? data : data?.[key] ?? data?.items ?? [] }
function value(data, ...keys) { return keys.map((key) => data?.[key]).find((item) => item !== undefined && item !== null) ?? '—' }

export default function Analytics() {
  const overview = useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => analyticsApi.getOverview() })
  const rooms = useQuery({ queryKey: ['analytics', 'rooms'], queryFn: () => analyticsApi.getRooms() })
  const faculty = useQuery({ queryKey: ['analytics', 'faculty'], queryFn: () => analyticsApi.getFaculty() })
  const utilization = useQuery({ queryKey: ['analytics', 'utilization'], queryFn: () => analyticsApi.getUtilization() })
  const wasted = useQuery({ queryKey: ['analytics', 'wasted-capacity'], queryFn: () => analyticsApi.getWastedCapacity() })
  const overviewData = unwrap(overview.data) ?? {}
  const facultyData = unwrap(faculty.data) ?? {}
  const roomRows = list(rooms.data, 'rooms')
  const facultyRows = list(faculty.data, 'faculty')
  const utilizationRows = list(utilization.data, 'rooms')
  const wasteRows = list(wasted.data, 'rooms')
  const scheduleUnavailable = overviewData.scheduleUnavailable || facultyData.scheduleUnavailable

  const roomColumns = [
    { key: 'room', label: 'Room', render: (_, row) => row.name ?? row.roomName ?? row.roomId ?? '—' },
    { key: 'util', label: 'Utilization', render: (_, row) => row.utilizationPercent ?? row.utilization ?? row.utilization_percent ?? '—' },
    { key: 'capacity', label: 'Capacity', render: (_, row) => row.capacity ?? '—' },
  ]
  const facultyColumns = [
    { key: 'name', label: 'Faculty', render: (_, row) => `${row.facultyName ?? row.name ?? row.facultyId ?? '—'}${row.day ? ` · ${row.day}` : ''}` },
    { key: 'hours', label: 'Scheduled periods', render: (_, row) => row.periods ?? row.scheduledHours ?? row.scheduled_hours ?? '—' },
    { key: 'limit', label: 'Daily limit', render: (_, row) => row.dailyLimit ?? row.daily_limit ?? row.maxHoursPerDay ?? '—' },
  ]

  return <div className="space-y-6">
    <PageHeader eyebrow="Campus insights" title="Analytics" description="Room utilization and faculty daily teaching loads from backend analytics." />
    {scheduleUnavailable ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><p className="font-semibold">Faculty workload metrics need an active timetable.</p><p className="mt-1">Room utilization is still available from the active dataset. Generate and activate a teaching timetable to populate faculty workloads.</p></div> : null}
    {overview.isLoading ? <LoadingState label="Loading analytics overview" /> : null}
    {overview.isError ? <ErrorState title="Unable to load analytics overview" message="The analytics service could not be reached." onRetry={() => overview.refetch()} /> : null}
    {overview.isSuccess ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnalyticsInsightCard title="Sessions scheduled" value={value(overviewData, 'sessionsScheduled')} source="Active schedule" />
      <AnalyticsInsightCard title="Pending bookings" value={value(overviewData, 'pendingBookings')} source="Booking service" />
      <AnalyticsInsightCard title="Average room utilization" value={value(overviewData, 'roomUtilization')} source="Room utilization service" />
    </section> : null}
    <section className="grid gap-5 xl:grid-cols-2">
      {utilization.isLoading ? <LoadingState label="Loading utilization" /> : null}
      {utilization.isError ? <ErrorState title="Unable to load room utilization" message="Room utilization could not be reached." onRetry={() => utilization.refetch()} /> : null}
      {utilization.isSuccess ? <UtilizationChart rooms={utilizationRows} /> : null}
      {faculty.isLoading ? <LoadingState label="Loading faculty workload" /> : null}
      {faculty.isError ? <ErrorState title="Unable to load faculty workload" message="Faculty workload could not be reached." onRetry={() => faculty.refetch()} /> : null}
      {faculty.isSuccess ? <WorkloadChart faculty={facultyRows} /> : null}
    </section>
    <section className="grid gap-5 xl:grid-cols-2">
      <DataTable columns={roomColumns} rows={roomRows} emptyTitle="No room analytics" emptyDescription="The backend returned no room records." />
      <DataTable columns={facultyColumns} rows={facultyRows} emptyTitle="No faculty analytics" emptyDescription="The backend returned no faculty records." />
    </section>
    {wasted.isError ? <ErrorState title="Unable to load underused rooms" message="Room utilization data could not be reached." onRetry={() => wasted.refetch()} /> : null}
    {wasted.isSuccess ? <DataTable columns={roomColumns} rows={wasteRows} emptyTitle="No underused rooms" emptyDescription="No rooms are currently below the utilization threshold." /> : null}
  </div>
}
