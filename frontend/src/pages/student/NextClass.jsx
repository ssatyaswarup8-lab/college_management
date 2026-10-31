import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { studentApi } from '../../api/student.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { formatPeriodRange } from '../../utils/periods.js'

function unwrap(r){return r?.data?.data??r?.data??r}
function getNext(r){const d=unwrap(r);if(Array.isArray(d))return d[0]??null;return d?.nextClass??d?.next_class??d?.item??d??null}
export default function NextClass(){const query=useQuery({queryKey:['student','next-class'],queryFn:()=>studentApi.getNextClass()});const item=getNext(query.data);return <div className="space-y-5"><PageHeader eyebrow="Student workspace" title="Next class" description="Your next scheduled session, as determined by the student schedule service." actions={<Link className="text-sm font-semibold text-teal-800" to="/student/timetable">Open my timetable</Link>}/>{query.isLoading?<LoadingState label="Finding your next class"/>:null}{query.isError?<ErrorState title="Unable to load your next class" message="The student schedule service could not be reached." onRetry={()=>query.refetch()}/>:null}{query.isSuccess&&item?<section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Next up</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{item.courseName??item.courseTitle??item.courseId??item.title??'Scheduled session'}</h2><p className="mt-2 text-sm text-slate-600">{item.day??item.date??'—'} · {item.startPeriod?formatPeriodRange(item.startPeriod,item.duration??1):item.time??'Time —'}</p><dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><Info label="Room" value={item.roomName??item.roomId??item.room_id}/><Info label="Faculty" value={item.facultyName??item.facultyId??item.faculty_id}/><Info label="Course" value={item.courseId??item.course_id}/><Info label="Group" value={item.groupName??item.groupId??item.group_id}/></dl></section>:null}{query.isSuccess&&!item?<EmptyState title="No upcoming class" description="The schedule service did not return a next class."/>:null}</div>}
function Info({label,value}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value??'—'}</dd></div>}
