import PageHeader from '../../components/common/PageHeader.jsx'
import useAuth from '../../hooks/useAuth.js'

export default function Settings(){
 const {user,role}=useAuth()
 const apiBase=import.meta.env.VITE_API_BASE_URL||'/api (Vite proxy → http://localhost:5000)'
 return <div className="space-y-5"><PageHeader eyebrow="Administration" title="Settings" description="Review the current frontend connection and signed-in administrator context."/><section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="font-semibold text-slate-900">Application connection</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="API base URL" value={apiBase}/><Info label="Current role" value={role}/><Info label="Signed-in account" value={user?.email??user?.name??user?.id}/><Info label="Environment" value={import.meta.env.MODE}/></dl><p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">Authentication, authorization, dataset rules, schedule validation, and system-wide settings are controlled by the backend. The current API contract does not expose settings update endpoints.</p></section></div>
}
function Info({label,value}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value??'—'}</dd></div>}
