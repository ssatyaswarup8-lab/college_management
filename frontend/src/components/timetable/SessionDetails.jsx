import { formatPeriodRange, getEndPeriod } from '../../utils/periods.js'

function value(...items) {
  return items.find((item) => item !== undefined && item !== null && item !== '') ?? '—'
}

export default function SessionDetails({
  session,
  open = Boolean(session),
  onClose,
  onViewImpact,
  onMove,
  canEdit = false,
}) {
  if (!open || !session) return null

  const startPeriod = Number(session.startPeriod ?? session.start_period)
  const duration = Number(session.duration ?? 1)
  const endPeriod = Number.isFinite(startPeriod) ? getEndPeriod(startPeriod, duration) : null
  const course = value(session.courseName, session.courseTitle, session.courseId, session.course_id, session.title)
  const faculty = value(session.facultyName, session.facultyId, session.faculty_id)
  const room = value(session.roomName, session.roomId, session.room_id)
  const groups = session.groupNames ?? session.groups ?? session.groupIds ?? []
  const groupLabel = Array.isArray(groups)
    ? groups.map((group) => typeof group === 'string' ? group : group.name ?? group.id).filter(Boolean).join(', ') || '—'
    : groups

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section aria-labelledby="session-details-title" aria-modal="true" className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl" role="dialog">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Session details</p><h2 className="mt-1 text-xl font-semibold text-slate-900" id="session-details-title">{course}</h2></div>
          <button aria-label="Close session details" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onClose} type="button">×</button>
        </header>
        <div className="flex-1 space-y-5 px-5 py-5 sm:px-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Session" value={value(session.sessionId, session.session_id, session.id)} />
            <Detail label="Type" value={value(session.kind, session.sessionType, session.session_type)} />
            <Detail label="Day" value={value(session.day)} />
            <Detail label="Time" value={Number.isFinite(startPeriod) ? formatPeriodRange(startPeriod, duration) : value(session.time)} />
            <Detail label="Start period" value={Number.isFinite(startPeriod) ? `P${startPeriod}` : '—'} />
            <Detail label="End period" value={endPeriod ? `P${endPeriod}` : '—'} />
            <Detail label="Room" value={room} />
            <Detail label="Faculty" value={faculty} />
            <Detail label="Groups" value={groupLabel} />
            <Detail label="Duration" value={`${duration} ${duration === 1 ? 'hour' : 'hours'}`} />
            <Detail label="Session size" value={value(session.size, session.attendance)} />
            <Detail label="Room capacity" value={value(session.roomCapacity, session.room_capacity)} />
          </dl>
          {session.reason ? <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</p><p className="mt-1 text-sm leading-6 text-slate-700">{session.reason}</p></div> : null}
        </div>
        {canEdit ? <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4 sm:px-6"><button className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => onViewImpact?.(session)} type="button">View impact</button><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950" onClick={() => onMove?.(session)} type="button">Move session</button></footer> : null}
      </section>
    </div>
  )
}

function Detail({ label, value: detailValue }) {
  return <div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{detailValue}</dd></div>
}
