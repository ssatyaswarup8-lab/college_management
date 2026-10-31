import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/student.api.js'
import DataTable from '../../components/common/DataTable.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { formatDateTime } from '../../utils/formatters.js'

function unwrap(r){return r?.data?.data??r?.data??r}
function getEvents(r){const d=unwrap(r);return Array.isArray(d)?d:d?.events??d?.items??[]}
const columns=[{key:'event',label:'Event',render:(_,r)=>r.title??r.name??r.eventName??'—'},{key:'date',label:'Date and time',render:(_,r)=>formatDateTime(r.startAt??r.start_at??r.date??r.day)},{key:'venue',label:'Venue',render:(_,r)=>r.roomName??r.roomId??r.venue??'—'},{key:'description',label:'Details',render:(_,r)=>r.description??r.purpose??'—'}]
export default function Events(){const query=useQuery({queryKey:['student','events'],queryFn:()=>studentApi.getMyEvents()});const events=getEvents(query.data);return <div className="space-y-5"><PageHeader eyebrow="Student workspace" title="Campus events" description="Events relevant to your account, returned by the student events service."/>{query.isLoading?<LoadingState label="Loading campus events"/>:null}{query.isError?<ErrorState title="Unable to load campus events" message="The events service could not be reached." onRetry={()=>query.refetch()}/>:null}{query.isSuccess?<DataTable columns={columns} rows={events} emptyTitle="No events available" emptyDescription="The backend returned no events for your account."/>:null}</div>}
