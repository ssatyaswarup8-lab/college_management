import { useMemo,useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { studentApi } from '../../api/student.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ExamFilters from '../../components/exams/ExamFilters.jsx'
import ExamTimetable from '../../components/exams/ExamTimetable.jsx'
import useAuth from '../../hooks/useAuth.js'
function unwrap(r){return r?.data?.data??r?.data??r}
function list(r){const d=unwrap(r);return Array.isArray(d)?d:d?.exams??d?.items??[]}
export default function Exams(){const{user}=useAuth();const groupIds=user?.studentGroupIds??user?.student_group_ids??[];const[filters,setFilters]=useState({});const query=useQuery({queryKey:['student','exams'],queryFn:()=>studentApi.getMyExams()});const exams=list(query.data);const filtered=useMemo(()=>exams.filter((exam)=>{const search=filters.search?.toLowerCase();const courses=exam.courseNames??exam.courseIds??exam.course_ids??[];const text=[exam.title,exam.examId,exam.exam_id,...(Array.isArray(courses)?courses:[])].some((v)=>String(v??'').toLowerCase().includes(search??''));return text&&(!filters.day||String(exam.scheduledDay??exam.day??'').toUpperCase()===filters.day)&&(!filters.session||String(exam.examSession??exam.session??'').toUpperCase()===filters.session)}),[exams,filters]);return <div className="space-y-5"><PageHeader eyebrow="Student workspace" title="My exams" description={`Exam schedule for ${groupIds.length ? groupIds.join(', ') : 'your linked student groups'}.`} actions={<Link className="text-sm font-semibold text-teal-800" to="/student">Back to dashboard</Link>}/>{query.isLoading?<LoadingState label="Loading your exam timetable"/>:null}{query.isError?<ErrorState title="Unable to load your exams" message="Your personalized exam timetable could not be reached." onRetry={()=>query.refetch()}/>:null}{query.isSuccess?<><ExamFilters filters={filters} onChange={setFilters}/><ExamTimetable exams={filtered} emptyMessage="No exams match your filters."/></>:null}</div>}
