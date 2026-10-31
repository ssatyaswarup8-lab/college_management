import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import TimetableGrid from '../../components/timetable/TimetableGrid.jsx'
import TimetableLegend from '../../components/timetable/TimetableLegend.jsx'
import { useScheduleByGroup } from '../../hooks/useSchedule.js'
import useAuth from '../../hooks/useAuth.js'

function getSessions(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.sessions ?? data?.items ?? []
}

export default function Timetable() {
  const { user } = useAuth()
  const groupIds = user?.studentGroupIds ?? user?.student_group_ids ?? [user?.groupId ?? user?.group_id].filter(Boolean)
  const groupId = groupIds[0]
  const [day, setDay] = useState('')
  const schedule = useScheduleByGroup(groupId)
  const sessions = getSessions(schedule.data)
  const filtered = useMemo(() => sessions.filter((session) => !day || String(session.day).toUpperCase() === day), [sessions, day])

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Student workspace" title="My timetable" description="Only sessions returned for your assigned student group are shown." actions={<Link to="/student" className="text-sm font-semibold text-teal-800 hover:text-teal-950">Back to dashboard</Link>} />
      {!groupId ? <EmptyState title="Student group is not set" description="Your account does not include a group assignment, so a personalized timetable cannot be loaded." /> : null}
      {groupId && schedule.isLoading ? <LoadingState label="Loading your group timetable" /> : null}
      {groupId && schedule.isError ? <ErrorState title="Unable to load your timetable" message="Your group schedule could not be reached." onRetry={() => schedule.refetch()} /> : null}
      {groupId && schedule.isSuccess ? <>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="grid gap-1 text-xs font-medium text-slate-600">Filter by day<select className="min-h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setDay(event.target.value)} value={day}><option value="">All weekdays</option>{['MON', 'TUE', 'WED', 'THU', 'FRI'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><span className="text-xs text-slate-500">{filtered.length} sessions · {groupIds.join(', ')}</span></div>
        {sessions.length === 0 ? <EmptyState title="No sessions in your timetable" description="The backend returned no sessions for your group." /> : <><TimetableGrid sessions={filtered} emptyMessage="No sessions on this day." /><TimetableLegend /></>}
      </> : null}
    </div>
  )
}

