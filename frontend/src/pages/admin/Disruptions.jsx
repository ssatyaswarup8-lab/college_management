import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { disruptionApi } from '../../api/disruption.api.js'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { getFriendlyError } from '../../utils/errorHandler.js'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response
}

function list(value) {
  if (Array.isArray(value)) return value
  return value?.impact?.impactedSessions ?? value?.sessions ?? value?.changes ?? value?.proposedChanges ?? value?.proposed_changes ?? value?.items ?? []
}

function sessionLabel(session) {
  const name = session.details?.courseName ?? session.courseName ?? session.title ?? 'Session'
  const day = session.day ?? '—'
  const period = session.startPeriod ?? session.start_period
  const end = session.endPeriod ?? session.details?.endPeriod
  const room = session.details?.roomName ?? session.roomName ?? 'Room not listed'
  return `${name} · ${day}${period ? ` P${period}${end && end !== period ? `–P${end}` : ''}` : ''} · ${room}`
}

function sessionDetails(session) {
  return session?.details ?? session
}

function placementLabel(session) {
  if (!session) return 'New session'
  const day = session.day ?? '—'
  const start = session.startPeriod
  const end = session.endPeriod
  return `${day}${start ? ` · P${start}${end && end !== start ? `–P${end}` : ''}` : ''} · ${session.roomName ?? 'Room not listed'}`
}

export default function Disruptions() {
  const client = useQueryClient()
  const [type, setType] = useState('faculty_unavailable')
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [days, setDays] = useState([])
  const [periodsText, setPeriodsText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [repair, setRepair] = useState(null)
  const [pageError, setPageError] = useState('')
  const [confirmApply, setConfirmApply] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [success, setSuccess] = useState('')

  function toggleDay(day) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  function buildPayload() {
    const periods = periodsText.split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value >= 1 && value <= 13)
    const change = type === 'room_unavailable'
      ? { type, room_id: targetId.trim(), days, periods, reason: reason.trim() }
      : { type, faculty_id: targetId.trim(), days, periods, reason: reason.trim() }
    return { title: reason.trim() || `${type.replaceAll('_', ' ')} disruption`, description: reason.trim(), changes: [change] }
  }

  async function analyzeDisruption(event) {
    event.preventDefault()
    setPageError('')
    setSuccess('')
    setAnalysis(null)
    setRepair(null)
    setIsAnalyzing(true)
    try {
      const result = await disruptionApi.analyze(buildPayload())
      setAnalysis(unwrap(result)?.disruption ?? unwrap(result))
    } catch (error) {
      setPageError(getFriendlyError(error, 'Unable to analyze this disruption.').message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function generateRepair() {
    setPageError('')
    setIsRepairing(true)
    try {
      const result = await disruptionApi.repair({ disruptionId: analysis?.disruptionId ?? analysis?.disruption_id ?? analysis?._id ?? analysis?.id })
      setRepair(unwrap(result))
    } catch (error) {
      setPageError(getFriendlyError(error, 'Unable to generate a schedule repair.').message)
    } finally {
      setIsRepairing(false)
    }
  }

  async function applyRepair() {
    const disruptionId = repair?.disruptionId ?? repair?.disruption_id ?? repair?.disruption?._id ?? repair?.id ?? analysis?.disruptionId ?? analysis?.disruption_id ?? analysis?._id ?? analysis?.id
    if (!disruptionId) {
      setPageError('The backend response did not include a disruption ID to apply. Contact the backend team to confirm the response contract.')
      setConfirmApply(false)
      return
    }

    setPageError('')
    setIsApplying(true)
    try {
      await disruptionApi.apply(disruptionId, { confirmed: true })
      await client.invalidateQueries({ queryKey: ['schedule'] })
      setConfirmApply(false)
      setSuccess('The schedule repair was applied.')
      setAnalysis(null)
      setRepair(null)
    } catch (error) {
      setPageError(getFriendlyError(error, 'Unable to apply the schedule repair.').message)
    } finally {
      setIsApplying(false)
    }
  }

  const affected = list(analysis?.impact?.impactedSessions ?? analysis?.affectedSessions ?? analysis?.affected_sessions)
  const changes = list(repair?.proposedChanges ?? repair?.proposed_changes ?? repair?.changes)
  const movedCount = repair?.comparison?.sessionsMoved ?? repair?.sessionsMoved ?? repair?.sessions_moved ?? changes.length
  const unchangedCount = repair?.comparison?.sessionsUnchanged ?? repair?.sessionsUnchanged ?? repair?.sessions_unchanged
  const violationCount = repair?.comparison?.hardViolations ?? repair?.hardViolations ?? repair?.hard_violations
  const canApply = Boolean(repair?.proposedVersionId) && repair?.disruption?.status === 'repaired' && violationCount === 0

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Schedule resilience" title="Disruptions" description="Analyze a temporary operational change, request a schedule repair, review its impact, and apply only after approval." />
      {pageError ? <ErrorState title="Disruption action failed" message={pageError} /> : null}
      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">{success}</p> : null}

      <form className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" onSubmit={analyzeDisruption}>
        <h2 className="text-base font-semibold text-slate-900">Describe the change</h2>
        <p className="mt-1 text-sm text-slate-600">This creates a proposed analysis. The current schedule remains unchanged until an Admin applies a valid repair.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Disruption type</span><select className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setType(event.target.value)} value={type}><option value="faculty_unavailable">Faculty unavailable</option><option value="room_unavailable">Room closure</option></select></label>
          <label className="grid gap-1 text-xs font-medium text-slate-700"><span>{type === 'room_unavailable' ? 'Room ID' : 'Faculty ID'}</span><input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" onChange={(event) => setTargetId(event.target.value)} placeholder={type === 'room_unavailable' ? 'For example, LH-1' : 'For example, F19'} required value={targetId} /></label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2"><span>Reason</span><input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" onChange={(event) => setReason(event.target.value)} placeholder="Maintenance, leave, or other reason" required value={reason} /></label>
          <fieldset className="sm:col-span-2"><legend className="text-xs font-medium text-slate-700">Affected days</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${days.includes(day) ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-300 text-slate-700'}`} key={day}><input checked={days.includes(day)} className="accent-teal-800" onChange={() => toggleDay(day)} type="checkbox" value={day} />{day}</label>)}</div></fieldset>
          <label className="grid gap-1 text-xs font-medium text-slate-700 sm:col-span-2"><span>Periods (comma separated, 1–13)</span><input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm" onChange={(event) => setPeriodsText(event.target.value)} placeholder="For example, 1, 2, 3" required value={periodsText} /><span className="font-normal text-slate-500">Use periods 1–9 for teaching hours and 10–13 for event hours.</span></label>
        </div>
        <div className="mt-5 flex justify-end"><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-60" disabled={isAnalyzing || isRepairing || !days.length} type="submit">{isAnalyzing ? 'Analyzing…' : 'Analyze disruption'}</button></div>
      </form>

      {isAnalyzing ? <LoadingState label="Analyzing schedule impact" /> : null}
      {analysis ? <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Impact analysis</h2><p className="mt-1 text-sm text-slate-600">{analysis.summary ?? analysis.message ?? 'Analysis returned by the scheduling service.'}</p></div><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-60" disabled={isRepairing} onClick={generateRepair} type="button">{isRepairing ? 'Finding a repair…' : 'Generate repair'}</button></div>
        <dl className="grid gap-3 sm:grid-cols-3"><Metric label="Sessions directly affected" value={analysis.impact?.impactedCount ?? affected.length} /><Metric label="Sessions to add" value={analysis.impact?.sessionsAdded ?? 0} /><Metric label="Analysis status" value={analysis.status ?? 'analyzed'} /></dl>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><h3 className="text-sm font-semibold text-amber-950">What if this change is applied?</h3><p className="mt-1 text-sm leading-6 text-amber-900">{affected.length ? `${affected.length} scheduled session${affected.length === 1 ? '' : 's'} overlap the unavailable resource and time. Generate a repair to see where they can move. The live timetable stays unchanged until you apply the proposal.` : (analysis.impact?.sessionsAdded ?? 0) ? `${analysis.impact.sessionsAdded} new session${analysis.impact.sessionsAdded === 1 ? '' : 's'} will need a valid placement. The live timetable stays unchanged until you apply a repair.` : 'No currently scheduled session directly overlaps this change. You can still generate a repair to verify the full timetable; the live timetable stays unchanged until you apply it.'}</p></div>
        {affected.length ? <div><h3 className="text-sm font-semibold text-slate-800">Sessions that overlap the change</h3><ul className="mt-2 space-y-2">{affected.map((session, index) => { const details = sessionDetails(session); return <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700" key={index}><p className="font-semibold text-slate-900">{sessionLabel({ ...session, details })}</p><p className="mt-1">{details.sessionKind ? `${details.sessionKind} · ` : ''}{details.facultyName ?? 'Faculty not listed'}{details.groupNames?.length ? ` · ${details.groupNames.join(', ')}` : ''}{details.building ? ` · ${details.building}` : ''}</p><p className="mt-1 text-xs text-amber-800">{(session.reasons ?? []).map((item) => item.type === 'room_unavailable' ? 'Room unavailable during this period' : item.type === 'faculty_unavailable' ? 'Faculty unavailable during this period' : 'Schedule constraint affected').join('; ') || 'Overlaps with the disruption window'}</p></li> })}</ul></div> : null}
      </section> : null}

      {isRepairing ? <LoadingState label="Generating a valid repair proposal" /> : null}
      {repair ? <section className="space-y-4 rounded-xl border border-teal-200 bg-white p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Proposed schedule</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Review before applying</h2><p className="mt-1 text-sm text-slate-600">Only the backend proposal is shown. Review each change and its reported validation before applying.</p></div>
        <div className="grid gap-3 sm:grid-cols-3"><Metric label="Sessions moved" value={movedCount} /><Metric label="Sessions unchanged" value={unchangedCount ?? '—'} /><Metric label="Hard violations" value={violationCount ?? '—'} /></div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3"><h3 className="text-sm font-semibold text-teal-950">What if this repair is applied?</h3><p className="mt-1 text-sm leading-6 text-teal-900">{violationCount === 0 ? `${movedCount} session${movedCount === 1 ? '' : 's'} will move; ${unchangedCount ?? 'Other'} sessions keep their current placement. The proposed timetable has no reported hard-constraint violations. Applying it makes this version active.` : 'This proposal has not confirmed zero hard-constraint violations and cannot be applied yet.'}{Number.isFinite(repair?.comparison?.softPenaltyBefore) && Number.isFinite(repair?.comparison?.softPenaltyAfter) ? ` Preference score changes from ${repair.comparison.softPenaltyBefore} to ${repair.comparison.softPenaltyAfter} (lower is better).` : ''}</p></div>
        {changes.length ? <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-800">Proposed changes</h3>{changes.map((change, index) => { const details = change.details ?? {}; return <div className="rounded-lg border border-slate-200 p-3" key={index}><p className="font-semibold text-slate-900">{details.courseName ?? 'Session'}{details.sessionKind ? ` · ${details.sessionKind}` : ''}</p><p className="mt-1 text-xs text-slate-600">{details.facultyName ?? 'Faculty not listed'}{details.groupNames?.length ? ` · ${details.groupNames.join(', ')}` : ''}</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><p className="text-sm text-slate-700"><span className="font-medium">Before:</span> {placementLabel(change.beforeDetails)}</p><span aria-hidden="true" className="text-center text-teal-800">→</span><p className="text-sm font-medium text-slate-900"><span className="font-medium">After:</span> {placementLabel(change.afterDetails)}</p></div></div> })}</div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">The timetable needs no session moves for this repair.</p>}
        {repair.explanation || repair.reason ? <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{repair.explanation ?? repair.reason}</p> : null}
        {!canApply ? <p className="text-sm font-medium text-rose-700">This proposal reports hard violations or has not confirmed a zero-violation result. It cannot be applied from this screen.</p> : null}
        <div className="flex justify-end"><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-50" disabled={!canApply || isApplying} onClick={() => setConfirmApply(true)} type="button">Apply repair</button></div>
      </section> : null}
      {isApplying ? <LoadingState label="Applying the approved repair" /> : null}
      <ConfirmDialog open={confirmApply} title="Apply this schedule repair?" description={`The backend will apply the proposed changes and create a new schedule version. Sessions moved: ${movedCount}.`} confirmLabel="Apply repair" isPending={isApplying} onCancel={() => setConfirmApply(false)} onConfirm={applyRepair} tone="neutral" />
    </div>
  )
}

function Metric({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd></div>
}

