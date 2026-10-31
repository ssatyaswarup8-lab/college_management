import { TEACHING_DAYS } from '../../utils/periods.js'
import SessionCard from './SessionCard.jsx'
import TimetableCell from './TimetableCell.jsx'

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function gridRowForPeriod(period) {
  return Number(period) <= 5 ? Number(period) + 1 : Number(period) + 2
}

export default function TimetableGrid({
  sessions = [],
  days = TEACHING_DAYS,
  onSessionSelect,
  emptyMessage = 'No sessions match these filters.',
  showEvents = false,
}) {
  const visibleSessions = sessions.filter((session) => {
    const start = Number(session.startPeriod ?? session.start_period)
    return Number.isFinite(start) && (showEvents || start <= 9)
  })
  const columns = `72px repeat(${days.length}, minmax(150px, 1fr))`
  const rows = '44px repeat(5, minmax(88px, auto)) 34px repeat(4, minmax(88px, auto))'

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="min-w-[900px]" role="grid" aria-label="Weekly timetable" style={{ display: 'grid', gridTemplateColumns: columns, gridTemplateRows: rows }}>
        <div className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500" style={{ gridColumn: 1, gridRow: 1 }}>Time</div>
        {days.map((day, index) => <div key={day} className="flex items-center justify-center border-b border-slate-200 bg-slate-50 px-2 text-xs font-semibold uppercase tracking-wide text-slate-700" style={{ gridColumn: index + 2, gridRow: 1 }}>{day}</div>)}

        {PERIODS.map((period) => {
          const row = gridRowForPeriod(period)
          return (
            <div key={`period-${period}`} className="contents">
              <div className="sticky left-0 z-[1] flex flex-col justify-center border-b border-r border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700" style={{ gridColumn: 1, gridRow: row }}>
                <span>P{period}</span><span className="mt-0.5 text-[10px] font-normal text-slate-500">{period === 5 ? '12:00' : period === 6 ? '14:00' : `${String(period + 8).padStart(2, '0')}:00`}</span>
              </div>
              {days.map((day, dayIndex) => <TimetableCell key={`${day}-${period}`} day={day} period={period} style={{ gridColumn: dayIndex + 2, gridRow: row }} />)}
            </div>
          )
        })}

        <div className="sticky left-0 z-[1] flex items-center justify-center border-b border-r border-slate-200 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-900" style={{ gridColumn: 1, gridRow: 7 }}>Lunch</div>
        <div className="flex items-center justify-center border-b border-amber-100 bg-amber-50/70 text-xs text-amber-900" style={{ gridColumn: `2 / span ${days.length}`, gridRow: 7 }}>13:00 – 14:00</div>

        {visibleSessions.map((session, index) => {
          const day = String(session.day ?? '').toUpperCase()
          const dayIndex = days.indexOf(day)
          const startPeriod = Number(session.startPeriod ?? session.start_period)
          const duration = Math.max(1, Number(session.duration ?? 1))
          if (dayIndex < 0 || !PERIODS.includes(startPeriod)) return null
          return (
            <div
              key={session.sessionId ?? session.session_id ?? session.id ?? index}
              className="z-[2] min-h-0 p-1"
              style={{ gridColumn: dayIndex + 2, gridRow: `${gridRowForPeriod(startPeriod)} / span ${Math.min(duration, 4)}` }}
            >
              <SessionCard session={session} onClick={onSessionSelect ? () => onSessionSelect(session) : undefined} />
            </div>
          )
        })}

        {visibleSessions.length === 0 ? <div className="z-[3] flex items-center justify-center bg-white/90 px-4 text-center text-sm text-slate-500" style={{ gridColumn: `2 / span ${days.length}`, gridRow: '2 / span 10' }}>{emptyMessage}</div> : null}
      </div>
    </div>
  )
}

