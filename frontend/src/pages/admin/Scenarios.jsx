import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scenarioApi } from '../../api/scenario.api.js'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import LoadingState from '../../components/common/LoadingState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ScenarioComparison from '../../components/scenarios/ScenarioComparison.jsx'
import ScenarioForm from '../../components/scenarios/ScenarioForm.jsx'
import ScenarioList from '../../components/scenarios/ScenarioList.jsx'
import { getFriendlyError } from '../../utils/errorHandler.js'

function unwrap(response) { return response?.data?.data ?? response?.data ?? response }
function getList(response) { const data=unwrap(response); return Array.isArray(data)?data:data?.scenarios??data?.items??[] }

export default function Scenarios() {
  const client=useQueryClient()
  const [selectedId,setSelectedId]=useState('')
  const [simulatedId,setSimulatedId]=useState('')
  const [confirmApply,setConfirmApply]=useState(false)
  const [pageError,setPageError]=useState('')
  const [success,setSuccess]=useState('')
  const scenariosQuery=useQuery({queryKey:['scenarios'],queryFn:()=>scenarioApi.getAll()})
  const scenarios=getList(scenariosQuery.data)
  const selected=scenarios.find((item)=>(item.id??item.scenarioId??item.scenario_id)===selectedId)
  const create=useMutation({mutationFn:scenarioApi.create,onSuccess:()=>client.invalidateQueries({queryKey:['scenarios']})})
  const simulate=useMutation({mutationFn:({id,payload})=>scenarioApi.simulate(id,payload)})
  const apply=useMutation({mutationFn:({id,payload})=>scenarioApi.apply(id,payload),onSuccess:()=>client.invalidateQueries({queryKey:['scenarios']})})
  const compare=useQuery({queryKey:['scenarios',selectedId,'compare'],queryFn:()=>scenarioApi.compare(selectedId),enabled:Boolean(selectedId)&&simulatedId===selectedId})
  const comparison=useMemo(()=>unwrap(compare.data),[compare.data])
  const hard=comparison?.comparison?.hardViolations??comparison?.scenario?.comparison?.hardViolations??comparison?.scenario?.hardViolations??comparison?.scenario?.hard_violations??comparison?.hardViolations??comparison?.hard_violations
  const valid=(comparison?.scenario?.status==='simulated'||comparison?.valid===true||comparison?.isValid===true||comparison?.is_valid===true)&&hard===0
  const pending=create.isPending||simulate.isPending||apply.isPending

  async function createScenario(payload){setPageError('');setSuccess('');try{const result=unwrap(await create.mutateAsync(payload));const scenario=result?.scenario??result;const id=scenario?.id??scenario?._id??scenario?.scenarioId??scenario?.scenario_id;if(!id)throw new Error('The create response did not include a scenario ID.');setSelectedId(String(id));setSimulatedId('')}catch(error){setPageError(getFriendlyError(error,'Unable to create this scenario.').message)}}
  async function runSimulation(){if(!selectedId)return;setPageError('');setSuccess('');try{await simulate.mutateAsync({id:selectedId,payload:{}});setSimulatedId(selectedId);await client.invalidateQueries({queryKey:['scenarios',selectedId,'compare']})}catch(error){setPageError(getFriendlyError(error,'Unable to simulate this scenario.').message)}}
  async function applyScenario(){try{await apply.mutateAsync({id:selectedId,payload:{}});setConfirmApply(false);setSuccess('The scenario was applied and the schedule has been updated.');setSimulatedId('');await client.invalidateQueries({queryKey:['schedule']})}catch(error){setPageError(getFriendlyError(error,'Unable to apply this scenario.').message)}}

  return <div className="space-y-6"><PageHeader eyebrow="What-if planning" title="Scenario planning" description="Explore temporary changes against the current schedule without changing production until an Admin approves a valid scenario." />
    {pageError?<ErrorState title="Scenario action failed" message={pageError}/>:null}{success?<p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">{success}</p>:null}
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><div className="space-y-5"><ScenarioForm onCreate={createScenario} isPending={create.isPending}/><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">Saved scenarios</h2><button className="text-xs font-semibold text-teal-800" onClick={()=>scenariosQuery.refetch()} type="button">Refresh</button></div>{scenariosQuery.isLoading?<LoadingState label="Loading scenarios"/>:null}{scenariosQuery.isError?<ErrorState title="Unable to load scenarios" message="Saved scenarios could not be reached." onRetry={()=>scenariosQuery.refetch()}/>:null}{scenariosQuery.isSuccess?<ScenarioList scenarios={scenarios} selectedId={selectedId} onSelect={(id)=>{setSelectedId(id);setSimulatedId('');setPageError('');setSuccess('')}}/>:null}</section></div>
    <div className="space-y-4">{selected?<section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><h2 className="font-semibold text-slate-900">{selected.name??selected.title??'Selected scenario'}</h2><p className="mt-1 text-xs text-slate-500">{selected.reason??selected.status??'Temporary scenario'}</p></div><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={runSimulation} type="button">{simulate.isPending?'Simulating…':'Simulate scenario'}</button></section>:<div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Create or select a scenario to review its simulation.</div>}
    {simulatedId===selectedId&&compare.isLoading?<LoadingState label="Loading scenario comparison"/>:null}{simulatedId===selectedId&&compare.isError?<ErrorState title="Unable to load comparison" message="The scenario was simulated, but its comparison could not be retrieved." onRetry={()=>compare.refetch()}/>:null}{simulatedId===selectedId&&compare.isSuccess?<ScenarioComparison comparison={comparison} canApply={valid} isApplying={apply.isPending} onApply={()=>setConfirmApply(true)}/>:null}</div></div>
    <ConfirmDialog open={confirmApply} title="Apply this scenario?" description="This updates the production schedule. Confirm only after reviewing the comparison and backend validation." confirmLabel="Apply scenario" isPending={apply.isPending} onCancel={()=>setConfirmApply(false)} onConfirm={applyScenario} tone="neutral" />
  </div>
}
