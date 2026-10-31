import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { studentApi } from '../../api/student.api.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import useAuth from '../../hooks/useAuth.js'
import { formatPeriodRange } from '../../utils/periods.js'

function payload(response) {
  return response?.data?.data ?? response?.data ?? response
}

function itemFrom(response) {
  const value = payload(response)
  if (Array.isArray(value)) return value[0] ?? null
  return value?.nextClass ?? value?.next_class ?? value?.items?.[0] ?? value ?? null
}

export default function Dashboard() {
  const { user } = useAuth()
  const groupId = user?.groupId ?? user?.group_id
  const nextClass = useQuery({ queryKey: ['student', 'next-class'], queryFn: () => studentApi.getNextClass() })
  const exams = useQuery({ queryKey: ['student', 'exams'], queryFn: () => studentApi.getMyExams() })
  const events = useQuery({ queryKey: ['student', 'events'], queryFn: () => studentApi.getMyEvents() })
  const next = itemFrom(nextClass.data)
  const examList = payload(exams.data)
  const eventList = payload(events.data)
  const name = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Student workspace" title={`Good day, ${name}`} description="Your classes, exams, and campus events in one personal view." actions={<Link to="/student/timetable" className="inline-flex min-h-10 items-center rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950">My timetable</Link>} />
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Up next</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Next class</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Group schedule</span></div>
          {nextClass.isLoading ? <div className="mt-4"><LoadingState label="Loading your next class" className="min-h-32" /></div> : null}
          {nextClass.isError ? <div className="mt-4"><ErrorState title="Unable to load your next class" message="Your schedule could not be reached." onRetry={() => nextClass.refetch()} /></div> : null}
          {nextClass.isSuccess && next ? <div className="mt-5 rounded-xl bg-slate-50 p-4 sm:p-5"><p className="text-2xl font-semibold tracking-tight text-slate-900">{next.courseName ?? next.courseTitle ?? next.course ?? 'Scheduled session'}</p><p className="mt-2 text-sm text-slate-600">{next.day ?? '—'} · {next.startPeriod ? formatPeriodRange(next.startPeriod, next.duration ?? 1) : next.time ?? 'Time to be confirmed'}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700"><span>Room: <strong>{next.roomName ?? next.roomId ?? next.room_id ?? '—'}</strong></span><span>Faculty: <strong>{next.facultyName ?? next.faculty ?? '—'}</strong></span></div></div> : null}
          {nextClass.isSuccess && !next ? <div className="mt-4"><EmptyState title="No upcoming class" description="There is no next class in the schedule response." /></div> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Your group</h2>
          <p className="mt-1 text-sm text-slate-600">Personal timetable access</p>
          <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned group</p><p className="mt-1 text-xl font-semibold text-slate-900">{user?.groupName ?? groupId ?? 'Not assigned'}</p>{!groupId ? <p className="mt-2 text-xs leading-5 text-amber-800">Your account does not include a group ID. Contact the administrator if this is unexpected.</p> : null}</div>
          <Link className="mt-4 inline-flex text-sm font-semibold text-teal-800 hover:text-teal-950" to="/student/timetable">Open my timetable <span aria-hidden="true" className="ml-1">→</span></Link>
        </div>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <DashboardList title="Upcoming exams" response={exams} data={examList} label="No upcoming exams" retry={() => exams.refetch()} />
        <DashboardList title="Campus events" response={events} data={eventList} label="No campus events available" retry={() => events.refetch()} />
      </section>
    </div>
  )
}

function DashboardList({ title, response, data, label, retry }) {
  const items = Array.isArray(data) ? data : data?.items ?? []
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {response.isLoading ? <div className="mt-4"><LoadingState label={`Loading ${title.toLowerCase()}`} /></div> : null}
      {response.isError ? <div className="mt-4"><ErrorState title={`Unable to load ${title.toLowerCase()}`} message="Please try again in a moment." onRetry={retry} /></div> : null}
      {response.isSuccess && items.length === 0 ? <div className="mt-4"><EmptyState title={label} /></div> : null}
      {response.isSuccess && items.length > 0 ? <ul className="mt-4 divide-y divide-slate-100">{items.slice(0, 4).map((item, index) => <li key={item.id ?? item.examId ?? item.eventId ?? index} className="py-3"><p className="font-medium text-slate-800">{item.title ?? item.courseName ?? item.name ?? item.courseId ?? 'Scheduled item'}</p><p className="mt-1 text-xs text-slate-500">{item.day ?? item.date ?? 'Date to be confirmed'}{item.session ? ` · ${item.session}` : ''}</p></li>)}</ul> : null}
    </section>
  )
}

