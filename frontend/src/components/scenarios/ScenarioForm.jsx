import { useState } from 'react'
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
export default function ScenarioForm({ onCreate, isPending = false }) {
  const [type, setType] = useState('room_unavailable')
  const [name, setName] = useState('')
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [days, setDays] = useState([])
  const [periods, setPeriods] = useState('')
  const [error, setError] = useState('')
  function toggleDay(day) { setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]) }
  function submit(event) {
    event.preventDefault()
    const parsed = periods.split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value >= 1 && value <= 13)
    if (!days.length || !parsed.length) { setError('Choose at least one weekday and one valid period.'); return }
    setError('')
    const change = type === 'room_unavailable' ? { type, roomId: targetId.trim(), days, periods: parsed, reason: reason.trim() } : { type, facultyId: targetId.trim(), days, periods: parsed, reason: reason.trim() }
    onCreate?.({ name: name.trim(), description: reason.trim(), changes: [change] })
  }
  return (
    <form className="rounded-xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="font-semibold text-slate-900">Create scenario</h2><p className="mt-1 text-sm text-slate-600">Temporary conditions are simulated separately from the live schedule.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Scenario name"><input className="input-base" onChange={(e) => setName(e.target.value)} required value={name} placeholder="Room maintenance check" /></Field>
        <Field label="Temporary change"><select className="input-base" onChange={(e) => { setType(e.target.value); setTargetId('') }} value={type}><option value="room_unavailable">Room unavailable</option><option value="faculty_unavailable">Faculty unavailable</option></select></Field>
        <Field label={type === 'room_unavailable' ? 'Room ID' : 'Faculty ID'}><input className="input-base" onChange={(e) => setTargetId(e.target.value)} required value={targetId} placeholder={type === 'room_unavailable' ? 'LH-1' : 'F19'} /></Field>
        <Field label="Reason"><input className="input-base" onChange={(e) => setReason(e.target.value)} required value={reason} placeholder="Maintenance or leave" /></Field>
        <fieldset className="sm:col-span-2"><legend className="text-xs font-semibold text-slate-700">Affected days</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700" key={day}><input checked={days.includes(day)} className="accent-teal-800" onChange={() => toggleDay(day)} type="checkbox" />{day}</label>)}</div></fieldset>
        <Field label="Periods, comma separated"><input className="input-base" onChange={(e) => setPeriods(e.target.value)} required value={periods} placeholder="1, 2, 3" /></Field>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p> : null}
      <div className="mt-4 flex justify-end"><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-60" disabled={isPending} type="submit">{isPending ? 'Creating…' : 'Create scenario'}</button></div>
      <style>{`.input-base{min-height:2.5rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;background:white;padding:0 .75rem;font-size:.875rem;color:#1e293b}.input-base:focus{outline:2px solid rgb(15 118 110 / .25);border-color:#0f766e}`}</style>
    </form>
  )
}
function Field({ label, children }) { return <label className="grid gap-1 text-xs font-medium text-slate-700"><span>{label}</span>{children}</label> }
