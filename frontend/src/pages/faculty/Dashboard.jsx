import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { useScheduleByFaculty } from '../../hooks/useSchedule.js'
import useAuth from '../../hooks/useAuth.js'

function getSchedule(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.sessions ?? data?.items ?? []
}

export default function Dashboard() {
  const { user } = useAuth()
  const facultyId = user?.facultyId ?? user?.faculty_id ?? user?.id ?? user?.userId
  const schedule = useScheduleByFaculty(facultyId, {})
  const sessions = getSchedule(schedule.data)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const todaysSessions = sessions.filter((session) => String(session.day ?? '').slice(0, 3).toUpperCase() === today)
  const next = todaysSessions[0]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Faculty workspace" title={`Welcome, ${user?.name ?? 'Faculty'}`} description="Your teaching schedule and the classes that need your attention." actions={<Link to="/faculty/timetable" className="inline-flex min-h-10 items-center rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950">My timetable</Link>} />
      {schedule.isLoading ? <LoadingState label="Loading your schedule" /> : null}
      {schedule.isError ? <ErrorState title="Unable to load your schedule" message="Your faculty timetable could not be reached." onRetry={() => schedule.refetch()} /> : null}
      {schedule.isSuccess ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Sessions this week" value={sessions.length} detail="From your assigned timetable" tone="teal" />
            <StatCard label="Classes today" value={todaysSessions.length} detail="Based on the current day" tone="violet" />
          </section>
          <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Next class today</h2>
              {next ? <div className="mt-4 rounded-lg bg-slate-50 p-4"><p className="text-lg font-semibold text-slate-900">{next.courseName ?? next.courseTitle ?? next.courseId ?? 'Scheduled session'}</p><p className="mt-1 text-sm text-slate-600">{next.startTime ?? next.time ?? `Period ${next.startPeriod ?? '—'}`}</p><p className="mt-3 text-sm text-slate-700">Room: <strong>{next.roomName ?? next.roomId ?? '—'}</strong></p></div> : <div className="mt-4"><EmptyState title="No classes today" description="Your schedule has no sessions for today." /></div>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Schedule changes</h2>
              <p className="mt-1 text-sm text-slate-600">Recent changes will appear here when provided by the backend.</p>
              <div className="mt-5"><EmptyState title="No recent changes available" description="There are no schedule change records in this view." /></div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
