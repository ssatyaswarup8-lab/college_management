export function periodsFor(startPeriod, duration) {
  if (!Number.isInteger(startPeriod) || !Number.isInteger(duration) || duration < 1) return [];
  return Array.from({ length: duration }, (_value, index) => startPeriod + index);
}

export function periodsOverlap(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA;
}

export function crossesLunch(startPeriod, duration, afterPeriod = 5) {
  const endPeriod = startPeriod + duration - 1;
  return startPeriod <= afterPeriod && afterPeriod < endPeriod;
}

export function isValidDay(day, days = ['MON', 'TUE', 'WED', 'THU', 'FRI']) {
  return days.includes(day);
}

export function validStartPeriods(duration, { lastPeriod = 9, lunchAfter = 5, labStartPeriods = [] } = {}) {
  const starts = [];
  for (let start = 1; start + duration - 1 <= lastPeriod; start += 1) {
    if (!crossesLunch(start, duration, lunchAfter)) starts.push(start);
  }
  if (labStartPeriods.length) return starts.filter((start) => labStartPeriods.includes(start));
  return starts;
}

export function periodToClock(period, periods) {
  return periods.find((item) => item.id === period)?.start ?? null;
}

export function clockToPeriod(clock, periods) {
  return periods.find((item) => item.start === clock)?.id ?? null;
}
