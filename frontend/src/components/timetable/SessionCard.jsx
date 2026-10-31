import SessionTypeBadge from './SessionTypeBadge.jsx'
const KIND_STYLES = {
  lecture: 'border-l-sky-500 bg-sky-50 text-sky-950',
  tutorial: 'border-l-violet-500 bg-violet-50 text-violet-950',
  lab: 'border-l-amber-500 bg-amber-50 text-amber-950',
  event: 'border-l-emerald-500 bg-emerald-50 text-emerald-950',
}

function text(value, fallback = '—') {
  return value === undefined || value === null || value === '' ? fallback : value
}

export default function SessionCard({ session, onClick }) {
  const kind = String(session.kind ?? session.sessionType ?? session.session_type ?? 'lecture').toLowerCase()
  const style = KIND_STYLES[kind] ?? KIND_STYLES.lecture
  const course = session.courseName ?? session.courseTitle ?? session.courseId ?? session.course_id ?? session.title
  const room = session.roomName ?? session.roomId ?? session.room_id
  const faculty = session.facultyName ?? session.facultyId ?? session.faculty_id
  const groups = session.groupNames ?? session.groups ?? session.groupIds ?? []
  const groupText = Array.isArray(groups) ? groups.map((group) => typeof group === 'string' ? group : group.name ?? group.id).filter(Boolean).join(', ') : groups
  const content = (
    <>
      <span className="block truncate text-xs font-semibold leading-4">{text(course, 'Scheduled session')}</span>
      <span className="mt-1 block truncate text-[10px] leading-4 opacity-80">{text(room)}</span>
      {faculty ? <span className="block truncate text-[10px] leading-4 opacity-80">{faculty}</span> : null}
      {groupText ? <span className="block truncate text-[10px] leading-4 opacity-80">{groupText}</span> : null}
      <span className="mt-1 block"><SessionTypeBadge type={kind} /></span>
    </>
  )

  if (!onClick) return <div className={`h-full overflow-hidden rounded-md border-l-[3px] px-2 py-1.5 ${style}`}>{content}</div>

  return (
    <button
      aria-label={`${text(course, 'Scheduled session')}, ${kind}, room ${text(room)}. View details.`}
      className={`h-full w-full overflow-hidden rounded-md border-l-[3px] px-2 py-1.5 text-left transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800 ${style}`}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  )
}

