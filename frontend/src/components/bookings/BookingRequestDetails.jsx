function value(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return value.toString?.() ?? '—'
  return String(value)
}

function formatDate(input) {
  if (!input) return '—'
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? value(input) : date.toLocaleString()
}

function roleLabel(role) {
  return value(role).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function windowLabel(item) {
  const day = item.day ?? 'Day not specified'
  const from = item.fromPeriod ?? item.from_period
  const to = item.toPeriod ?? item.to_period
  return `${day}${from !== undefined ? ` · P${from}–P${to ?? from}` : ''}`
}

function list(values) {
  if (!Array.isArray(values) || values.length === 0) return '—'
  return values.map((item) => typeof item === 'string' ? item : item?.name ?? item?.id ?? item?.sourceId ?? value(item)).join(', ')
}

export default function BookingRequestDetails({ booking }) {
  if (!booking) return null
  const windows = booking.windows ?? []
  const requesterUser = booking.requesterUser
  const decision = booking.decision
  const history = booking.decisionHistory ?? []
  const id = booking.sourceId ?? booking.id ?? booking.requestId

  return <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request details</h4>
      <dl className="mt-2 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Source ID" value={id} />
        <Info label="Database record ID" value={booking._id} />
        <Info label="Dataset ID" value={booking.dataset} />
        <Info label="Submitted at" value={formatDate(booking.submittedAt)} />
        <Info label="Created at" value={formatDate(booking.createdAt)} />
        <Info label="Requester" value={booking.requester ?? booking.requesterName} />
        <Info label="Requester role" value={roleLabel(booking.requesterRole)} />
        <Info label="Requester account" value={requesterUser ? value(requesterUser) : 'No linked account'} />
        <Info label="Department" value={booking.department} />
        <Info label="Category" value={roleLabel(booking.requestedCategory ?? booking.category)} />
        <Info label="Attendance" value={booking.attendance} />
        <Info label="Duration" value={booking.durationPeriods ?? booking.duration_periods ? `${booking.durationPeriods ?? booking.duration_periods} periods` : '—'} />
        <Info label="Requested room" value={booking.requestedRoom ?? booking.requested_room} />
        <Info label="Room types" value={list(booking.roomTypes ?? booking.room_types)} />
        <Info label="Required features" value={list(booking.needs)} />
        <Info label="Mandatory groups" value={list(booking.mandatoryForGroups ?? booking.mandatory_for_groups)} />
        <Info label="Series ID" value={booking.seriesId ?? booking.series_id} />
        <Info label="Last updated" value={formatDate(booking.updatedAt)} />
        <div className="sm:col-span-2 lg:col-span-3"><Info label="Requested windows" value={windows.length ? windows.map(windowLabel).join('; ') : '—'} /></div>
      </dl>
    </section>

    {booking.rawText || booking.raw_text ? <section><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original request text</h4><p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{booking.rawText ?? booking.raw_text}</p></section> : null}

    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current decision</h4>
      {decision ? <dl className="mt-2 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Decision status" value={roleLabel(decision.status)} />
        <Info label="Scheduled day" value={decision.day} />
        <Info label="Scheduled period" value={decision.startPeriod ? `P${decision.startPeriod}–P${decision.endPeriod ?? decision.startPeriod}` : null} />
        <Info label="Assigned room" value={decision.roomId} />
        <Info label="Decided by" value={decision.decidedBy} />
        <Info label="Decided at" value={formatDate(decision.decidedAt)} />
        <Info label="Priority category" value={roleLabel(decision.priorityCategory)} />
        <Info label="Priority rank" value={decision.priorityRank} />
        <Info label="Priority override requests" value={list(decision.priorityOverrideRequestIds)} />
        <div className="sm:col-span-2 lg:col-span-3"><Info label="Decision reason" value={decision.reason} /></div>
        {decision.priorityOverrideReason ? <div className="sm:col-span-2 lg:col-span-3"><Info label="Priority override reason" value={decision.priorityOverrideReason} /></div> : null}
      </dl> : <p className="mt-2 text-sm text-slate-600">No decision recorded.</p>}
    </section>

    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision history</h4>
      {history.length ? <ol className="mt-2 space-y-2">{history.map((item, index) => <li className="rounded-lg bg-slate-50 p-3" key={`${item.status ?? 'decision'}-${item.decidedAt ?? index}`}><p className="text-sm font-semibold text-slate-800">{roleLabel(item.status)}</p><p className="mt-1 text-xs text-slate-600">{item.day ? `${item.day} · ` : ''}{item.startPeriod ? `P${item.startPeriod}–P${item.endPeriod ?? item.startPeriod} · ` : ''}{item.roomId ? `Room ${item.roomId} · ` : ''}{formatDate(item.decidedAt)}</p>{item.reason ? <p className="mt-1 text-sm text-slate-700">{item.reason}</p> : null}{item.priorityOverrideReason ? <p className="mt-1 text-xs text-slate-600">Priority override: {item.priorityOverrideReason}</p> : null}</li>)}</ol> : <p className="mt-2 text-sm text-slate-600">No previous decisions.</p>}
    </section>
  </div>
}

function Info({ label, value: content }) {
  return <div className="min-w-0"><dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-800">{value(content)}</dd></div>
}
