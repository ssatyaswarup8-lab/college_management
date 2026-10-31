function FilterSelect({ label, value, onChange, options = [], placeholder }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <select className="min-h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15" onChange={(event) => onChange?.(event.target.value)} value={value ?? ''}>
        <option value="">{placeholder ?? `All ${label.toLowerCase()}s`}</option>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option
          return <option key={item.value} value={item.value}>{item.label}</option>
        })}
      </select>
    </label>
  )
}

export default function TimetableFilters({
  filters = {},
  onChange,
  groups = [],
  faculty = [],
  rooms = [],
  courses = [],
  days = ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  kinds = ['lecture', 'tutorial', 'lab'],
}) {
  const set = (key) => (value) => onChange?.({ ...filters, [key]: value })
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <section aria-label="Filter timetable" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="grid min-w-48 flex-1 gap-1 text-xs font-medium text-slate-600">
        <span>Search</span>
        <input className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15" onChange={(event) => set('search')(event.target.value)} placeholder="Course, faculty, room…" type="search" value={filters.search ?? ''} />
      </label>
      <FilterSelect label="Day" options={days} value={filters.day} onChange={set('day')} placeholder="All days" />
      <FilterSelect label="Group" options={groups} value={filters.groupId} onChange={set('groupId')} placeholder="All groups" />
      <FilterSelect label="Faculty" options={faculty} value={filters.facultyId} onChange={set('facultyId')} placeholder="All faculty" />
      <FilterSelect label="Room" options={rooms} value={filters.roomId} onChange={set('roomId')} placeholder="All rooms" />
      <FilterSelect label="Course" options={courses} value={filters.courseId} onChange={set('courseId')} placeholder="All courses" />
      <FilterSelect label="Session type" options={kinds} value={filters.kind} onChange={set('kind')} placeholder="All types" />
      {hasFilters ? <button className="min-h-10 px-2 text-sm font-semibold text-teal-800 hover:text-teal-950" onClick={() => onChange?.({})} type="button">Clear filters</button> : null}
    </section>
  )
}
