import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { examApi } from '../../api/exam.api.js'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ExamCard from '../../components/exams/ExamCard.jsx'
import ExamDetails from '../../components/exams/ExamDetails.jsx'
import ExamFilters from '../../components/exams/ExamFilters.jsx'
import ExamTimetable from '../../components/exams/ExamTimetable.jsx'
import { getFriendlyError } from '../../utils/errorHandler.js'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }
function list(response) { const data = unwrap(response); return Array.isArray(data) ? data : data?.exams ?? data?.items ?? [] }

function generationMessage(error) {
  const friendly = getFriendlyError(error, 'The exam service could not generate a schedule.')
  if (friendly.code === 'SCHEDULE_NOT_FOUND') return 'Generate and activate the teaching timetable before generating exams.'
  if (friendly.code === 'DATASET_NOT_FOUND') return 'Activate a dataset before loading or generating exams.'
  const details = friendly.details ?? {}
  const violations = Array.isArray(details.violations) ? details.violations.slice(0, 3).map((row) => row.message ?? row.code).filter(Boolean) : []
  return [friendly.message, ...violations].join(' ')
}

export default function Exams() {
  const client = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const [filters, setFilters] = useState({})
  const [selectedExam, setSelectedExam] = useState(null)
  const query = useQuery({ queryKey: ['exams', 'admin'], queryFn: () => examApi.getAll() })
  const generate = useMutation({ mutationFn: () => examApi.generate({}), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['exams'] }) } })
  const exams = list(query.data)
  const matchesTextAndGroup = (exam) => {
    const search = filters.search?.trim().toLowerCase() ?? ''
    const courses = exam.courseNames ?? exam.courseIds ?? exam.course_ids ?? []
    const text = [exam.title, exam.examId, exam.exam_id, ...(Array.isArray(courses) ? courses : [])]
      .some((value) => String(value ?? '').toLowerCase().includes(search))
    return text && (!filters.group || (exam.groups ?? []).some((group) => (typeof group === 'string' ? group : group.id) === filters.group))
  }
  const filtered = useMemo(() => exams.filter((exam) => matchesTextAndGroup(exam)
    && (!filters.day || String(exam.day ?? '').toUpperCase() === filters.day)
    && (!filters.session || String(exam.session ?? '').toUpperCase() === filters.session)), [exams, filters])
  const unscheduled = useMemo(() => exams.filter((exam) => !exam.day || !exam.session)
    .filter(matchesTextAndGroup), [exams, filters.search, filters.group])
  const groups = [...new Set(exams.flatMap((exam) => (exam.groups ?? []).map((group) => typeof group === 'string' ? group : group.id).filter(Boolean)))]

  async function run() {
    try {
      await generate.mutateAsync()
      setConfirm(false)
    } catch {
      setConfirm(false)
    }
  }

  return <div className="space-y-5">
    <PageHeader eyebrow="Academic calendar" title="Exams" description="Review imported exam records and generate their day, session, and room allocations." actions={<button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={generate.isPending} onClick={() => setConfirm(true)} type="button">{generate.isPending ? 'Generating…' : 'Generate exams'}</button>} />
    {generate.isError ? <ErrorState title="Exam generation failed" message={generationMessage(generate.error)} onRetry={() => generate.mutate()} /> : null}
    {query.isLoading ? <LoadingState label="Loading exam records" /> : null}
    {query.isError ? <ErrorState title="Unable to load exams" message={getFriendlyError(query.error, 'The exam records could not be reached.').message} onRetry={() => query.refetch()} /> : null}
    {query.isSuccess ? <>
      <ExamFilters filters={filters} onChange={setFilters} groups={groups} />
      <p className="text-xs text-slate-500">Showing {filtered.length} of {exams.length} exam records</p>
      <ExamTimetable exams={filtered.filter((exam) => exam.day && exam.session)} />
      {unscheduled.length ? <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div><h2 className="font-semibold text-slate-900">Imported exams awaiting scheduling ({unscheduled.length})</h2><p className="mt-1 text-sm text-slate-600">These records exist in the active dataset but do not have a day and session yet. Generate the teaching timetable first, then generate exams.</p></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{unscheduled.map((exam, index) => <ExamCard exam={exam} key={exam.id ?? exam.examId ?? index} onClick={setSelectedExam} />)}</div>
      </section> : null}
    </> : null}
    <ExamDetails exam={selectedExam} onClose={() => setSelectedExam(null)} />
    <ConfirmDialog open={confirm} title="Generate exam timetable?" description="Exam generation requires an active teaching timetable and uses backend room capacity and schedule constraints." confirmLabel="Generate exams" isPending={generate.isPending} onCancel={() => setConfirm(false)} onConfirm={run} tone="neutral" />
  </div>
}
