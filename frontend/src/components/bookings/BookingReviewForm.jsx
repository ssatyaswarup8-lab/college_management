import { useEffect, useState } from 'react'

function firstWindow(booking) {
  return booking?.windows?.[0] ?? booking?.window ?? {}
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : item.id ?? item.name).filter(Boolean).join(', ')
  return value ?? ''
}

export default function BookingReviewForm({ booking, followUp, onSubmit, onCancel, isPending = false }) {
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const window = firstWindow(booking)
    setForm({
      title: booking?.title ?? booking?.purpose ?? '',
      attendance: booking?.attendance ?? '',
      durationPeriods: booking?.durationPeriods ?? booking?.duration_periods ?? '',
      day: window.day ?? booking?.day ?? '',
      fromPeriod: window.fromPeriod ?? window.from_period ?? booking?.startPeriod ?? '',
      toPeriod: window.toPeriod ?? window.to_period ?? booking?.endPeriod ?? '',
      requestedRoom: booking?.requestedRoom ?? booking?.requested_room ?? '',
      roomTypes: splitList(booking?.roomTypes ?? booking?.room_types),
      needs: splitList(booking?.needs),
      mandatoryForGroups: splitList(booking?.mandatoryForGroups ?? booking?.mandatory_for_groups),
    })
    setFormError('')
  }, [booking])

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.day || !form.fromPeriod || !form.toPeriod) {
      setFormError('Add a day and a complete time window before submitting.')
      return
    }
    if (Number(form.toPeriod) < Number(form.fromPeriod)) {
      setFormError('The end period must be the same as or later than the start period.')
      return
    }
    setFormError('')
    onSubmit?.({
      ...(booking?.requestedCategory ? { requestedCategory: booking.requestedCategory } : {}),
      title: form.title.trim(),
      attendance: Number(form.attendance),
      durationPeriods: Number(form.durationPeriods),
      windows: [{ day: form.day.toUpperCase(), fromPeriod: Number(form.fromPeriod), toPeriod: Number(form.toPeriod) }],
      requestedRoom: form.requestedRoom.trim() || null,
      roomTypes: form.roomTypes.split(',').map((item) => item.trim()).filter(Boolean),
      needs: form.needs.split(',').map((item) => item.trim()).filter(Boolean),
      mandatoryForGroups: form.mandatoryForGroups.split(',').map((item) => item.trim()).filter(Boolean),
      rawText: booking?.rawText ?? booking?.raw_text ?? '',
    })
  }

  if (!booking) return null

  const fields = [
    ['title', 'Purpose'],
    ['attendance', 'Expected attendance', 'number'],
    ['durationPeriods', 'Duration (periods)', 'number'],
    ['requestedRoom', 'Requested room'],
    ['roomTypes', 'Acceptable room types (comma separated)'],
    ['needs', 'Equipment or accessibility needs (comma separated)'],
    ['mandatoryForGroups', 'Mandatory student groups (comma separated)'],
  ]

  return (
    <form className="rounded-xl border border-teal-200 bg-teal-50/40 p-5 sm:p-6" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Review parsed request</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Check and edit before submitting</h2></div><span className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900">Draft only</span></div>
      {followUp ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">More information needed: {followUp}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, type = 'text']) => <label className="grid gap-1 text-xs font-medium text-slate-700" key={key}><span>{label}</span><input className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15" onChange={(event) => update(key, event.target.value)} required={key === 'title' || key === 'attendance' || key === 'durationPeriods'} type={type} min={type === 'number' ? 1 : undefined} value={form[key] ?? ''} /></label>)}
        <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Day</span><select className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800" onChange={(event) => update('day', event.target.value)} required value={form.day ?? ''}><option value="">Select day</option>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-slate-700"><span>Start period</span><input className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800" max="13" min="1" onChange={(event) => update('fromPeriod', event.target.value)} required type="number" value={form.fromPeriod ?? ''} /></label>
        <label className="grid gap-1 text-xs font-medium text-slate-700"><span>End period</span><input className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800" max="13" min="1" onChange={(event) => update('toPeriod', event.target.value)} required type="number" value={form.toPeriod ?? ''} /></label>
      </div>
      {formError ? <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{formError}</p> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" disabled={isPending} onClick={onCancel} type="button">Discard draft</button><button className="min-h-10 rounded-lg bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:cursor-wait disabled:opacity-60" disabled={isPending || Boolean(followUp)} type="submit">{isPending ? 'Submitting…' : 'Submit venue request'}</button></div>
    </form>
  )
}
