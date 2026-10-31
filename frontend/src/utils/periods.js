export const TEACHING_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
export const EXAM_DAYS = [...TEACHING_DAYS, 'SAT']
export const LUNCH_AFTER_PERIOD = 5
export const LAB_START_PERIODS = [2, 6]
export const EVENT_ONLY_PERIODS = [10, 11, 12, 13]

const PERIOD_START_MINUTES = {
  1: 8 * 60,
  2: 9 * 60,
  3: 10 * 60,
  4: 11 * 60,
  5: 12 * 60,
  6: 14 * 60,
  7: 15 * 60,
  8: 16 * 60,
  9: 17 * 60,
  10: 18 * 60,
  11: 19 * 60,
  12: 20 * 60,
  13: 21 * 60,
}

export function formatClockTime(totalMinutes, { suffix = true } = {}) {
  const hour24 = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  const hour12 = hour24 % 12 || 12
  const clock = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  return suffix ? `${clock} ${hour24 >= 12 ? 'PM' : 'AM'}` : clock
}

export function getPeriodStartMinutes(period) {
  return PERIOD_START_MINUTES[period] ?? null
}

export function formatPeriodTime(period, options) {
  const start = getPeriodStartMinutes(Number(period))
  return start === null ? '—' : formatClockTime(start, options)
}

export function formatPeriodRange(startPeriod, duration = 1) {
  const start = getPeriodStartMinutes(Number(startPeriod))
  const endPeriod = getEndPeriod(startPeriod, duration)
  const end = endPeriod === 5
    ? 13 * 60
    : getPeriodStartMinutes(endPeriod + 1) ?? 22 * 60
  if (start === null || !Number.isFinite(end)) return '—'
  return `${formatClockTime(start)} – ${formatClockTime(end)}`
}

export function getEndPeriod(startPeriod, duration = 1) {
  return Number(startPeriod) + Number(duration) - 1
}

export function isEventPeriod(period) {
  return EVENT_ONLY_PERIODS.includes(Number(period))
}

