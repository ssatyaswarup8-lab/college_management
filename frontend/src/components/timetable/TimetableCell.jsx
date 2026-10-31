import { formatPeriodTime } from '../../utils/periods.js'

export default function TimetableCell({ day, period, style }) {
  return (
    <div
      aria-label={`${day}, Period ${period}, ${formatPeriodTime(period)}`}
      className="border-b border-r border-slate-100 bg-white"
      role="gridcell"
      style={style}
    />
  )
}
