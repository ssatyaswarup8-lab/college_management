import useScheduleExport from '../../hooks/useScheduleExport.js'
import { useToast } from './ToastProvider.jsx'
import { getFriendlyError } from '../../utils/errorHandler.js'
export default function ExportScheduleButton({className=''}){
 const exportMutation=useScheduleExport();const{toast}=useToast()
 async function download(){try{const blob=await exportMutation.mutateAsync();const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='schedule.json';document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);toast('schedule.json downloaded.',{type:'success'})}catch(error){toast(getFriendlyError(error,'Unable to export the schedule.').message,{type:'error'})}}
 return <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 ${className}`.trim()} disabled={exportMutation.isPending} onClick={download} type="button"><span aria-hidden="true">↓</span>{exportMutation.isPending?'Preparing export…':'Export schedule.json'}</button>
}
