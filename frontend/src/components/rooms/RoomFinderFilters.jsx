export default function RoomFinderFilters({ value = {}, onChange }) {
  const set = (key, next) => onChange?.({ ...value, [key]: next })
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <Field label="Minimum capacity"><input className="room-field" min="1" onChange={(event) => set('capacity', event.target.value)} type="number" value={value.capacity ?? ''} /></Field>
    <Field label="Day"><select className="room-field" onChange={(event) => set('day', event.target.value)} required value={value.day ?? ''}><option value="">Choose day</option>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <option key={day}>{day}</option>)}</select></Field>
    <Field label="Start period"><input className="room-field" max="13" min="1" onChange={(event) => set('period', event.target.value)} required type="number" value={value.period ?? ''} /></Field>
    <Field label="Duration (periods)"><input className="room-field" max="13" min="1" onChange={(event) => set('duration', event.target.value)} required type="number" value={value.duration ?? '1'} /></Field>
    <Field label="Room type"><input className="room-field" onChange={(event) => set('roomType', event.target.value)} placeholder="lecture_hall" value={value.roomType ?? ''} /></Field>
    <Field label="Features"><input className="room-field" onChange={(event) => set('features', event.target.value)} placeholder="projector, pa_system" value={value.features ?? ''} /></Field>
    <label className="flex min-h-10 items-center gap-2 self-end text-sm text-slate-700"><input checked={Boolean(value.accessible)} className="accent-teal-800" onChange={(event) => set('accessible', event.target.checked)} type="checkbox" />Accessible room required</label>
    <style>{`.room-field{min-height:2.5rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;background:white;padding:0 .75rem;font-size:.875rem;color:#1e293b}`}</style>
  </div>
}

function Field({ label, children }) { return <label className="grid gap-1 text-xs font-medium text-slate-700"><span>{label}</span>{children}</label> }
