export default function RoomUtilizationBar({ room, label, value, detail }) {
  const utilization = value ?? room?.utilization ?? room?.utilizationPercent ?? room?.utilization_percent
  const raw = utilization && typeof utilization === 'object'
    ? utilization.utilizationPercent ?? utilization.utilization_percent ?? utilization.percent
    : utilization
  const numeric = Number(String(raw ?? '').replace('%', ''))
  const width = Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 0
  const name = label ?? room?.name ?? room?.roomName ?? room?.roomId ?? room?.id ?? 'Room'
  const display = raw === undefined || raw === null ? '—' : String(raw).includes('%') ? String(raw) : `${raw}%`
  const explanation = detail ?? utilization?.measurement

  return <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-baseline justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-800">{name}</p><span className="shrink-0 text-sm font-semibold text-slate-700">{display}</span></div>
    <div aria-label={`${name} utilization ${display}`} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="img"><div className="h-full rounded-full bg-teal-700" style={{ width: `${width}%` }} /></div>
    {explanation ? <p className="mt-2 text-xs text-slate-500">{explanation}</p> : null}
  </div>
}
