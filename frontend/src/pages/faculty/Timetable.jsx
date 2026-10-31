import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import TimetableGrid from '../../components/timetable/TimetableGrid.jsx'
import TimetableFilters from '../../components/timetable/TimetableFilters.jsx'
import SessionDetails from '../../components/timetable/SessionDetails.jsx'
import { useScheduleByFaculty } from '../../hooks/useSchedule.js'
import useAuth from '../../hooks/useAuth.js'

function getSchedule(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.sessions ?? data?.items ?? []
}

export default function Timetable() {
  const { user } = useAuth()
  const facultyId = user?.facultyId ?? user?.faculty_id ?? user?.id ?? user?.userId
  const [filters, setFilters] = useState({})
  const [selectedSession, setSelectedSession] = useState(null)
  const schedule = useScheduleByFaculty(facultyId)
  const sessions = getSchedule(schedule.data)
  const filtered = useMemo(() => sessions.filter((session) => {
    const query = filters.search?.trim().toLowerCase()
    return (!filters.day || String(session.day).toUpperCase() === filters.day) && (!query || [session.courseName, session.courseTitle, session.courseId, session.course_id, session.roomName, session.roomId].some((value) => String(value ?? '').toLowerCase().includes(query)))
  }), [sessions, filters])
  const rooms = [...new Set(sessions.map((session) => session.roomId ?? session.room_id).filter(Boolean))]

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Faculty workspace" title="My timetable" description="Your weekly teaching schedule from the active timetable." actions={<Link to="/faculty" className="text-sm font-semibold text-teal-800 hover:text-teal-950">Back to dashboard</Link>} />
      {schedule.isLoading ? <LoadingState label="Loading your timetable" /> : null}
      {schedule.isError ? <ErrorState title="Unable to load your timetable" message="Your faculty schedule could not be reached." onRetry={() => schedule.refetch()} /> : null}
      {schedule.isSuccess ? <>
        <div className="flex justify-end text-xs text-slate-500">{filtered.length} sessions</div>
        <TimetableFilters filters={filters} onChange={setFilters} rooms={rooms} groups={[]} faculty={[]} courses={[]} />
        <TimetableGrid sessions={filtered} onSessionSelect={setSelectedSession} />
        <SessionDetails session={selectedSession} onClose={() => setSelectedSession(null)} />
      </> : null}
    </div>
  )
}
