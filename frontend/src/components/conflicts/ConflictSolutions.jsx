function placementText(placement) {
  if (!placement) return 'Placement not provided'
  return `${placement.day ?? 'Day not set'} · Period ${placement.startPeriod ?? '—'} · Room ${placement.roomName ?? placement.roomId ?? 'not set'}`
}

function violationText(violation) {
  return typeof violation === 'string' ? violation : violation?.message ?? violation?.code?.replaceAll('_', ' ') ?? 'Constraint violation'
}

export default function ConflictSolutions({ solutions = [], nearMisses = [], note = '', onApply, applyingId, disabled = false }) {
  return <div className="space-y-3">
    {solutions.length ? <ol className="space-y-2">{solutions.map((solution, index) => {
      const key = solution.id ?? solution.solutionId ?? solution.solution_id ?? index
      const valid = solution.valid !== false && Boolean(solution.placement)
      const impact = solution.impact ?? {}
      return <li className="rounded-lg border border-emerald-200 bg-white p-3" key={key}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-900">{index + 1}</span><p className="text-sm font-semibold text-slate-900">{placementText(solution.placement)}</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">Valid</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{impact.timeChanged ? 'Changes the session day or time.' : impact.roomOnlyChanged ? 'Keeps the same time and changes the room.' : 'Valid alternative placement.'}{Number.isFinite(impact.softPenaltyDifference) ? ` Preference score change: ${impact.softPenaltyDifference > 0 ? '+' : ''}${impact.softPenaltyDifference}.` : ''}{Array.isArray(impact.affectedGroups) && impact.affectedGroups.length ? ` Groups affected: ${impact.affectedGroups.join(', ')}.` : ''}</p></div><button className="min-h-9 rounded-lg bg-teal-900 px-3 text-xs font-semibold text-white hover:bg-teal-950 disabled:opacity-50" disabled={disabled || !valid} onClick={() => onApply?.(solution)} type="button">{applyingId === String(index) ? 'Applying…' : 'Use this option'}</button></div>
      </li>
    })}</ol> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">No valid alternative placement was found for this session. Review the near misses below for the constraints blocking possible times or rooms.</p>}
    {note ? <p className="text-xs text-slate-500">{note}</p> : null}
    {nearMisses.length ? <details className="rounded-lg border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer text-sm font-semibold text-amber-950">Near misses ({nearMisses.length}) — these cannot be applied</summary><ul className="mt-2 space-y-2">{nearMisses.map((item, index) => <li className="border-t border-amber-200 pt-2 text-xs text-amber-950" key={index}><p className="font-medium">{placementText(item.placement)}</p>{(item.violations ?? item.rankReasons ?? []).length ? <ul className="mt-1 list-disc space-y-1 pl-4">{(item.violations ?? item.rankReasons).map((violation, violationIndex) => <li key={violationIndex}>{violationText(violation)}</li>)}</ul> : <p className="mt-1">This option did not pass all schedule constraints.</p>}</li>)}</ul></details> : null}
  </div>
}
