import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { conflictApi } from '../../api/conflict.api.js'
import { scheduleApi } from '../../api/schedule.api.js'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ConflictList from '../../components/conflicts/ConflictList.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getFriendlyError } from '../../utils/errorHandler.js'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }
function list(data, key) { const value = unwrap(data); return Array.isArray(value) ? value : value?.[key] ?? [] }

export default function Conflicts() {
  const { role } = useAuth()
  const client = useQueryClient()
  const [solutionsById, setSolutionsById] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [applyingId, setApplyingId] = useState(null)
  const [sessionId, setSessionId] = useState('')
  const [placement, setPlacement] = useState({ day: 'MON', startPeriod: '', roomId: '' })
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const query = useQuery({ queryKey: ['conflicts'], queryFn: () => conflictApi.getAll() })
  const schedule = useQuery({ queryKey: ['schedule', 'list', {}], queryFn: () => scheduleApi.getAll() })
  const conflicts = list(query.data, 'conflicts')
  const sessions = list(schedule.data, 'sessions')
  const sessionById = new Map(sessions.map((session) => [session.sessionId, session]))
  const displayConflicts = conflicts.map((conflict) => {
    const session = sessionById.get(conflict.sessionId)
    const violations = Array.isArray(conflict.violations) ? conflict.violations : []
    const placement = conflict.proposedPlacement ?? session
    return {
      ...conflict,
      sessionName: session ? `${session.courseTitle} · ${session.sessionId}` : conflict.sessionId,
      type: violations[0]?.code ?? conflict.type ?? (conflict.proposedPlacement ? 'Proposed placement' : 'Current placement review'),
      message: violations.length ? violations.map((item) => item.message ?? item.code ?? 'Schedule constraint violation').join(' ') : 'No hard constraint details were returned. This record may be a placement review without a detected violation.',
      facultyName: session?.faculty?.name,
      roomName: placement?.room?.name ?? (placement?.roomId ? placement.roomId : session?.room?.name),
      groups: session?.groups ?? [],
      currentPlacement: session ? `${session.day} P${session.startPeriod}–P${session.endPeriod}, ${session.room?.name ?? 'room not listed'}` : null,
      proposedPlacementLabel: conflict.proposedPlacement && session ? `${conflict.proposedPlacement.day} P${conflict.proposedPlacement.startPeriod}, ${session.room?.id === conflict.proposedPlacement.roomId ? session.room.name : conflict.proposedPlacement.roomId}` : null,
    }
  })

  async function analyze(event) {
    event.preventDefault()
    setPageError(''); setSuccess('')
    try {
      const proposedPlacement = placement.startPeriod && placement.roomId
        ? { day: placement.day, startPeriod: Number(placement.startPeriod), roomId: placement.roomId }
        : undefined
      await conflictApi.analyze({ sessionId, ...(proposedPlacement ? { proposedPlacement } : {}) })
      setSuccess('The backend analyzed the selected session and saved the conflict report.')
      await client.invalidateQueries({ queryKey: ['conflicts'] })
    } catch (error) { setPageError(getFriendlyError(error, 'Unable to analyze this session.').message) }
  }

  async function findSolutions(conflict) {
    const id = conflict.id ?? conflict.conflictId ?? conflict.conflict_id ?? conflict._id
    if (!id) return
    setLoadingId(id); setPageError('')
    try {
      const result = unwrap(await conflictApi.findSolutions(id, {}))
      setSolutionsById((current) => ({ ...current, [id]: { solutions: result.solutions ?? result.items ?? [], nearMisses: result.nearMisses ?? [], note: result.note ?? '' } }))
    } catch (error) {
      setSolutionsById((current) => ({ ...current, [id]: { solutions: [], error: getFriendlyError(error, 'Unable to find conflict solutions.').message } }))
    } finally { setLoadingId(null) }
  }

  async function applySolution() {
    if (!selected) return
    const conflictId = selected.conflict.id ?? selected.conflict.conflictId ?? selected.conflict.conflict_id ?? selected.conflict._id
    setApplyingId(String(selected.solutionIndex)); setPageError('')
    try {
      await conflictApi.applySolution(conflictId, { solutionIndex: selected.solutionIndex })
      setSuccess('The selected resolution was validated and saved as a schedule proposal.')
      setSelected(null); setSolutionsById({})
      await client.invalidateQueries({ queryKey: ['conflicts'] })
    } catch (error) { setPageError(getFriendlyError(error, 'Unable to apply this solution.').message) }
    finally { setApplyingId(null) }
  }

  return <div className="space-y-5">
    <PageHeader eyebrow="Schedule integrity" title="Conflicts" description="Analyze a session placement, review deterministic violations, and request valid resolution proposals." actions={<button className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => query.refetch()} type="button">Refresh</button>} />
    {pageError ? <ErrorState title="Conflict action failed" message={pageError} /> : null}
    {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">{success}</p> : null}
    <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={analyze}>
      <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Scheduled session</span><select className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setSessionId(event.target.value)} required value={sessionId}><option value="">Choose a session</option>{sessions.map((session) => <option key={session.sessionId} value={session.sessionId}>{session.courseTitle ?? session.courseId} · {session.sessionId}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Proposed day (optional)</span><select className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setPlacement({ ...placement, day: event.target.value })} value={placement.day}>{['MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => <option key={day}>{day}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Start period (optional)</span><input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" max="9" min="1" onChange={(event) => setPlacement({ ...placement, startPeriod: event.target.value })} type="number" value={placement.startPeriod} /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Room ID (optional)</span><input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" onChange={(event) => setPlacement({ ...placement, roomId: event.target.value })} value={placement.roomId} /></label>
      <div className="sm:col-span-2 lg:col-span-4 flex justify-end"><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!sessionId} type="submit">Analyze placement</button></div>
      {placement.startPeriod && !placement.roomId || !placement.startPeriod && placement.roomId ? <p className="text-xs text-amber-800 sm:col-span-2 lg:col-span-4">Enter both a start period and room to analyze a proposed placement, or leave both empty to analyze the current placement.</p> : null}
    </form>
    {schedule.isLoading || query.isLoading ? <LoadingState label="Loading schedule and conflict reports" /> : null}
    {schedule.isError ? <ErrorState title="Unable to load sessions" message="The active schedule is needed to select a session." onRetry={() => schedule.refetch()} /> : null}
    {query.isError ? <ErrorState title="Unable to load conflicts" message="The conflict service could not be reached." onRetry={() => query.refetch()} /> : null}
    {query.isSuccess ? <ConflictList conflicts={displayConflicts} solutionsById={solutionsById} loadingId={loadingId} applyingId={applyingId} canApply={role === 'ADMIN'} onFindSolutions={findSolutions} onApplySolution={(conflict, solution) => {
      const id = conflict.id ?? conflict.conflictId ?? conflict.conflict_id ?? conflict._id
      setSelected({ conflict, solution, solutionIndex: (solutionsById[id]?.solutions ?? []).indexOf(solution) })
    }} /> : null}
    <ConfirmDialog open={Boolean(selected)} title="Create this conflict resolution proposal?" description="The backend will validate the selected option and create a schedule proposal for review." confirmLabel="Create proposal" isPending={Boolean(applyingId)} onCancel={() => setSelected(null)} onConfirm={applySolution} tone="neutral" />
  </div>
}
