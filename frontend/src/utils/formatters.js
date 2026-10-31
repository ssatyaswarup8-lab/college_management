const DAY_LABELS = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
}

export function formatDay(day, { short = false } = {}) {
  const normalized = String(day ?? '').toUpperCase()
  const label = DAY_LABELS[normalized]
  if (!label) return day || '—'
  return short ? label.slice(0, 3) : label
}

export function formatRole(role) {
  return String(role ?? '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ') || '—'
}

export function formatNumber(value, options = {}) {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, options).format(number)
    : '—'
}

export function formatPercent(value, fractionDigits = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fractionDigits }).format(number)}%`
}

export function formatDateTime(value, options = {}) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date)
}

export function getInitials(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '—'
}
