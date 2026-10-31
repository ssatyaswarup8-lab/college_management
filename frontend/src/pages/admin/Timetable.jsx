import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { scheduleKeys, useSchedule, useScheduleActions } from '../../hooks/useSchedule.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import TimetableGrid from '../../components/timetable/TimetableGrid.jsx'
import TimetableLegend from '../../components/timetable/TimetableLegend.jsx'
import TimetableFilters from '../../components/timetable/TimetableFilters.jsx'
import ViewSwitcher from '../../components/timetable/ViewSwitcher.jsx'
import SessionDetails from '../../components/timetable/SessionDetails.jsx'
import useAuth from '../../hooks/useAuth.js'
import SessionMoveForm from '../../components/timetable/SessionMoveForm.jsx'
import { useToast } from '../../components/common/ToastProvider.jsx'
import { getFriendlyError } from '../../utils/errorHandler.js'
import ExportScheduleButton from '../../components/common/ExportScheduleButton.jsx'
import ScheduleHealthSummary from '../../components/timetable/ScheduleHealthSummary.jsx'
import { scheduleApi } from '../../api/schedule.api.js'

function getSessions(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : data?.sessions ?? data?.items ?? []
}

function isSetupConflict(error) {
  return error?.response?.status === 409
    && ['DATASET_NOT_FOUND', 'SCHEDULE_NOT_FOUND'].includes(error?.response?.data?.error?.code)
}

function generationErrorMessage(error) {
  const friendly = getFriendlyError(error, 'The scheduling service could not generate a timetable.')
  const details = friendly.details ?? {}
  const reason = details.reason
  const unscheduled = details.unscheduledSessionIds
  const violations = Array.isArray(details.violations) ? details.violations.slice(0, 3).map((item) => item.message ?? item.code).filter(Boolean) : []
  const extra = [friendly.code && friendly.code !== 'INTERNAL_SERVER_ERROR' ? `(${friendly.code})` : null, reason, Array.isArray(unscheduled) && unscheduled.length ? `Unscheduled sessions: ${unscheduled.join(', ')}` : null, ...violations]
    .filter(Boolean)
  return [friendly.message, ...extra].join(' ')
}

function optionsFrom(sessions, idKeys, labelKeys) {
  const values = new Map()
  for (const item of sessions) {
    const id = idKeys.map((key) => item?.[key]).find(Boolean)
    if (!id) continue
    const label = labelKeys.map((key) => item?.[key]).find(Boolean) ?? id
    values.set(id, { value: id, label })
  }
  return [...values.values()]
}

export default function Timetable({ canGenerate = true }) {
  const { role } = useAuth()
  const { toast } = useToast()
  const allowGeneration = canGenerate && role === 'ADMIN'
  const queryClient = useQueryClient()
  const proposals = useQuery({ queryKey: ['schedule', 'versions', 'proposed-generations'], queryFn: () => scheduleApi.getVersions({ status: 'proposed', kind: 'generation' }), enabled: role === 'ADMIN' })
  const approveProposal = useMutation({ mutationFn: scheduleApi.approveVersion, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: scheduleKeys.all }); await queryClient.invalidateQueries({ queryKey: ['schedule', 'versions'] }) } })
  const schedule = useSchedule()
  const actions = useScheduleActions()
  const [filters, setFilters] = useState({})
  const [view, setView] = useState('group')
  const [viewTarget, setViewTarget] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [moveSession, setMoveSession] = useState(null)
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  const sessions = getSessions(schedule.data)
  const scheduleNeedsSetup = schedule.isError && isSetupConflict(schedule.error)
  const filtered = useMemo(() => sessions.filter((session) => {
    const query = filters.search?.trim().toLowerCase()
    const matchesText = !query || [session.courseName, session.courseTitle, session.courseId, session.course_id, session.facultyName, session.facultyId, session.roomName, session.roomId, ...(session.groups ?? [])].some((value) => String(value ?? '').toLowerCase().includes(query))
    const day = String(session.day ?? '').toUpperCase()
    const kind = String(session.kind ?? '').toLowerCase()
    const targetId = view === 'group' ? (session.groups ?? []).some((group) => (typeof group === 'string' ? group : group.id) === viewTarget) : view === 'faculty' ? (session.facultyId ?? session.faculty_id) === viewTarget : (session.roomId ?? session.room_id) === viewTarget
    return (!viewTarget || targetId) && matchesText && (!filters.day || day === filters.day) && (!filters.kind || kind === filters.kind) && (!filters.groupId || (session.groups ?? []).some((group) => (typeof group === 'string' ? group : group.id) === filters.groupId)) && (!filters.facultyId || (session.facultyId ?? session.faculty_id) === filters.facultyId) && (!filters.roomId || (session.roomId ?? session.room_id) === filters.roomId) && (!filters.courseId || (session.courseId ?? session.course_id) === filters.courseId)
  }), [sessions, filters, view, viewTarget])
  const filterOptions = {
    groups: optionsFrom(sessions.flatMap((session) => (session.groups ?? []).map((group) => typeof group === 'string' ? { groupId: group, groupName: group } : { groupId: group.id, groupName: group.name ?? group.id })), ['groupId'], ['groupName']),
    faculty: optionsFrom(sessions, ['facultyId', 'faculty_id'], ['facultyName']),
    rooms: optionsFrom(sessions, ['roomId', 'room_id'], ['roomName']),
    courses: optionsFrom(sessions, ['courseId', 'course_id'], ['courseName', 'courseTitle']),
  }

  async function generateSchedule() {
    try {
      await actions.generate.mutateAsync({})
      setConfirmGenerate(false)
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
    } catch {
      setConfirmGenerate(false)
    }
  }

  async function applySessionMove(payload) {
    try {
      await actions.moveSession.mutateAsync(payload)
      toast('Session moved successfully.', { type: 'success' })
    } catch (error) {
      toast(getFriendlyError(error, 'Unable to move this session.').message, { type: 'error' })
      throw error
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Schedule management" title="Timetable" description="Review the active schedule by group, faculty, or room. Session placements and constraints come from the scheduling service." actions={<>{allowGeneration ? <Link className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/admin/exams">View exams</Link> : null}{allowGeneration ? <ExportScheduleButton /> : null}{allowGeneration ? <button className="inline-flex min-h-10 items-center rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-60" disabled={actions.generate.isPending} onClick={() => setConfirmGenerate(true)} type="button">{actions.generate.isPending ? 'Generating…' : 'Generate timetable'}</button> : null}</>} />
      {allowGeneration && actions.generate.isError ? <ErrorState title="Timetable generation failed" message={generationErrorMessage(actions.generate.error)} onRetry={() => actions.generate.mutate({})} /> : null}
      {allowGeneration && proposals.isError ? <ErrorState title="Unable to load generated proposals" message="Generated timetable versions could not be loaded." onRetry={() => proposals.refetch()} /> : null}
      {allowGeneration && proposals.isSuccess && (proposals.data?.data?.versions ?? []).length ? <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"><div><h2 className="font-semibold text-slate-900">Generated timetable proposals</h2><p className="mt-1 text-sm text-slate-600">Review and approve a proposal to make it the active timetable. Approval revalidates all hard constraints.</p></div>{(proposals.data?.data?.versions ?? []).map((version) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3" key={version._id}><div><p className="text-sm font-semibold text-slate-900">Version {version.versionNumber}</p><p className="text-xs text-slate-600">{version.summary?.sessionsScheduled ?? '—'} sessions · created {new Date(version.createdAt).toLocaleString()}</p></div><button className="min-h-9 rounded-lg bg-teal-900 px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={approveProposal.isPending} onClick={() => approveProposal.mutate(version._id)} type="button">Approve proposal</button></div>)}</section> : null}
      {approveProposal.isError ? <ErrorState title="Proposal approval failed" message="The backend rejected this proposal or found that the active schedule has changed." onRetry={() => approveProposal.reset()} /> : null}
      {schedule.isLoading ? <LoadingState label="Loading active timetable" /> : null}
      {scheduleNeedsSetup ? <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"><h2 className="font-semibold">{schedule.error?.response?.data?.error?.code === 'DATASET_NOT_FOUND' ? 'Activate a dataset first' : 'No active timetable yet'}</h2><p className="mt-1">{schedule.error?.response?.data?.message ?? 'Generate a timetable from the active dataset to begin.'} {schedule.error?.response?.data?.error?.code === 'SCHEDULE_NOT_FOUND' ? 'Use Generate timetable above; the first valid timetable becomes active automatically.' : 'Open Dataset management and activate a validated dataset.'}</p></section> : null}
      {schedule.isError && !scheduleNeedsSetup ? <ErrorState title="Unable to load the timetable" message={getFriendlyError(schedule.error, 'The active schedule could not be reached.').message} onRetry={() => schedule.refetch()} /> : null}
      {schedule.isSuccess ? <>
        <ScheduleHealthSummary />
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex flex-wrap items-end gap-3"><ViewSwitcher value={view} onChange={(nextView) => { setView(nextView); setViewTarget('') }} /><label className="grid gap-1 text-xs font-medium capitalize text-slate-600"><span>{view}</span><select className="min-h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setViewTarget(event.target.value)} value={viewTarget}><option value="">All {view}s</option>{(view === 'group' ? filterOptions.groups : view === 'faculty' ? filterOptions.faculty : filterOptions.rooms).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div><span className="text-xs text-slate-500">{filtered.length} of {sessions.length} sessions</span></div>
        <TimetableFilters filters={filters} onChange={setFilters} groups={filterOptions.groups} faculty={filterOptions.faculty} rooms={filterOptions.rooms} courses={filterOptions.courses} />
        <TimetableGrid sessions={filtered} onSessionSelect={setSelectedSession} />
        <TimetableLegend />
      </> : null}
      <SessionDetails session={selectedSession} onClose={() => setSelectedSession(null)} canEdit={allowGeneration} onMove={setMoveSession} onViewImpact={setMoveSession} />
      {allowGeneration ? <SessionMoveForm session={moveSession} onClose={() => setMoveSession(null)} onApply={applySessionMove} isApplying={actions.moveSession.isPending} /> : null}
      {allowGeneration ? <ConfirmDialog open={confirmGenerate} title="Generate a new timetable?" description="The scheduling service will create a candidate schedule from the active dataset. Review its result before publishing." confirmLabel="Generate timetable" isPending={actions.generate.isPending} onCancel={() => setConfirmGenerate(false)} onConfirm={generateSchedule} tone="neutral" /> : null}
    </div>
  )
}







