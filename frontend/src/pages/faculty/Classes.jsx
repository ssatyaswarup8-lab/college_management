import { useQuery } from '@tanstack/react-query'
import { facultyApi } from '../../api/faculty.api.js'
import DataTable from '../../components/common/DataTable.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import useAuth from '../../hooks/useAuth.js'
import { formatPeriodRange } from '../../utils/periods.js'

function unwrap(r){return r?.data?.data??r?.data??r}
function getClasses(r){const d=unwrap(r);return Array.isArray(d)?d:d?.classes??d?.sessions??d?.items??[]}
export default function Classes(){const {user}=useAuth();const facultyId=user?.facultyId??user?.faculty_id??user?.id??user?.userId;const query=useQuery({queryKey:['faculty','classes',facultyId],queryFn:()=>facultyApi.getMyClasses(),enabled:Boolean(facultyId)});const classes=getClasses(query.data);const columns=[{key:'course',label:'Course',render:(_,r)=>r.courseName??r.courseTitle??r.courseId??r.course_id??'—'},{key:'day',label:'Day',render:(_,r)=>r.day??'—'},{key:'time',label:'Time',render:(_,r)=>r.startPeriod?formatPeriodRange(r.startPeriod,r.duration??1):r.time??'—'},{key:'room',label:'Room',render:(_,r)=>r.roomName??r.roomId??r.room_id??'—'},{key:'groups',label:'Groups',render:(_,r)=>Array.isArray(r.groups)?r.groups.map((g)=>typeof g==='string'?g:g.name??g.id).join(', '):r.groups??'—'}];return <div className="space-y-5"><PageHeader eyebrow="Faculty workspace" title="My classes" description="Class assignments returned by the faculty classes endpoint."/>{!facultyId?<p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your account does not include a faculty ID.</p>:null}{query.isLoading?<LoadingState label="Loading your classes"/>:null}{query.isError?<ErrorState title="Unable to load your classes" message="The faculty classes service could not be reached." onRetry={()=>query.refetch()}/>:null}{query.isSuccess?<DataTable columns={columns} rows={classes} emptyTitle="No classes available" emptyDescription="The faculty service returned no class assignments."/>:null}</div>}
