const idOf = (value) => value?.sourceId ?? value?.id ?? value?.sessionId;
const get = (row, camel, snake) => row?.[camel] ?? row?.[snake];

export function calculateSoftPenalty({ sessions, assignments, rooms, faculty, days = ['MON', 'TUE', 'WED', 'THU', 'FRI'] }) {
  const sessionMap = new Map(sessions.map((session) => [idOf(session), session]));
  const roomMap = new Map(rooms.map((room) => [idOf(room), room]));
  const facultyMap = new Map(faculty.map((member) => [idOf(member), member]));
  const penalties = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0 };
  const groupPeriods = new Map();
  const groupHours = new Map();
  const groupCourses = new Map();
  const basketCourses = new Map();
  const countedBaskets = new Set();

  for (const assignment of assignments) {
    const sessionId = get(assignment, 'sessionId', 'session_id');
    const session = sessionMap.get(sessionId);
    const room = roomMap.get(assignment.roomId ?? assignment.room_id);
    if (!session || !room) continue;
    const start = assignment.startPeriod ?? assignment.start_period;
    const periods = Array.from({ length: session.duration }, (_value, index) => start + index);
    const facultyId = assignment.facultyOverrideId ?? assignment.faculty_override_id ?? get(session, 'facultyId', 'faculty_id');
    const member = facultyMap.get(facultyId);

    for (const preference of member?.preferences ?? []) {
      if (preference.type === 'avoid' && (preference.days ?? days).includes(assignment.day)) {
        penalties.S1 += 2 * periods.filter((period) => preference.periods?.includes(period)).length;
      }
    }
    if (room.capacity && session.size / room.capacity < 0.4) penalties.S5 += 1;
    if (periods.includes(9)) penalties.S6 += 1;

    const basketSlot = get(session, 'basketSlot', 'basket_slot');
    for (const groupId of session.groups ?? []) {
      const dayKey = `${groupId}:${assignment.day}`;
      if (!groupPeriods.has(dayKey)) groupPeriods.set(dayKey, new Set());
      periods.forEach((period) => groupPeriods.get(dayKey).add(period));

      if (!basketSlot || !countedBaskets.has(`${groupId}:${basketSlot}`)) {
        groupHours.set(dayKey, (groupHours.get(dayKey) ?? 0) + session.duration);
        if (basketSlot) countedBaskets.add(`${groupId}:${basketSlot}`);
      }

      if (session.kind === 'lecture' && !basketSlot) {
        const courseKey = `${groupId}:${assignment.day}:${get(session, 'courseId', 'course_id')}`;
        groupCourses.set(courseKey, (groupCourses.get(courseKey) ?? 0) + 1);
      }
    }

    if (basketSlot) {
      const courseKey = `${get(session, 'courseId', 'course_id')}:${assignment.day}`;
      basketCourses.set(courseKey, (basketCourses.get(courseKey) ?? 0) + 1);
    }
  }

  for (const [key, periods] of groupPeriods) {
    const ordered = [...periods].sort((a, b) => a - b);
    if (ordered.length > 1) {
      for (let period = ordered[0]; period <= ordered.at(-1); period += 1) {
        if (!periods.has(period)) penalties.S2 += 1;
      }
    }
    const hours = groupHours.get(key) ?? 0;
    if (hours > 6) penalties.S3 += 3 * (hours - 6);
  }
  for (const count of groupCourses.values()) if (count > 1) penalties.S4 += 3 * (count - 1);
  for (const count of basketCourses.values()) if (count > 1) penalties.S4 += 3 * (count - 1);

  return { penalties, total: Object.values(penalties).reduce((sum, value) => sum + value, 0) };
}
