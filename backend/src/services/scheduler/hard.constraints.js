import { crossesLunch, validStartPeriods } from '../../utils/period.utils.js';

const idOf = (value) => value?.sourceId ?? value?.id ?? value?.sessionId;
const values = (value) => value?.toObject ? value.toObject() : value;

function field(row, camel, snake) {
  return row?.[camel] ?? row?.[snake];
}

export function buildConstraintContext({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability = [], assignments = [] }) {
  const datasetValue = values(dataset) ?? {};
  const calendar = datasetValue.calendar ?? {};
  const context = {
    days: calendar.days ?? ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    lunchAfter: calendar.lunch?.after_period ?? 5,
    labStartPeriods: calendar.lab_start_periods ?? [2, 6],
    lastTeachingPeriod: 9,
    rooms: new Map(rooms.map((row) => [idOf(row), values(row)])),
    faculty: new Map(faculty.map((row) => [idOf(row), values(row)])),
    groups: new Map(studentGroups.map((row) => [idOf(row), values(row)])),
    sessions: new Map(sessions.map((row) => [idOf(row), values(row)])),
    roomUnavailability: roomUnavailability.map((row) => values(row)),
    assignments: [],
    roomOccupancy: new Map(),
    facultyOccupancy: new Map(),
    groupOccupancy: new Map(),
    facultyDailyHours: new Map(),
    basketAssignments: new Map(),
  };
  assignments.map((row) => values(row)).forEach((assignment) => addAssignment(context, assignment));
  return context;
}

const slotKey = (entityId, day, period) => `${entityId}|${day}|${period}`;
const dayKey = (entityId, day) => `${entityId}|${day}`;

function addValue(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function deleteValue(map, key, value) {
  const values = map.get(key);
  if (!values) return;
  values.delete(value);
  if (!values.size) map.delete(key);
}

export function addAssignment(context, assignment) {
  const sessionId = field(assignment, 'sessionId', 'session_id');
  const session = context.sessions.get(sessionId);
  if (!session) return;
  const day = assignment.day;
  const startPeriod = field(assignment, 'startPeriod', 'start_period');
  const roomId = field(assignment, 'roomId', 'room_id');
  const facultyId = assignment.facultyOverrideId ?? assignment.facultyId ?? field(session, 'facultyId', 'faculty_id');
  const basketSlot = field(session, 'basketSlot', 'basket_slot');
  for (let period = startPeriod; period < startPeriod + session.duration; period += 1) {
    addValue(context.roomOccupancy, slotKey(roomId, day, period), sessionId);
    addValue(context.facultyOccupancy, slotKey(facultyId, day, period), sessionId);
    for (const groupId of session.groups ?? []) {
      const key = slotKey(groupId, day, period);
      if (!context.groupOccupancy.has(key)) context.groupOccupancy.set(key, new Map());
      const activities = context.groupOccupancy.get(key);
      const activity = basketSlot || sessionId;
      if (!activities.has(activity)) activities.set(activity, new Set());
      activities.get(activity).add(sessionId);
    }
  }
  const hoursKey = dayKey(facultyId, day);
  context.facultyDailyHours.set(hoursKey, (context.facultyDailyHours.get(hoursKey) ?? 0) + session.duration);
  if (basketSlot) {
    if (!context.basketAssignments.has(basketSlot)) context.basketAssignments.set(basketSlot, []);
    context.basketAssignments.get(basketSlot).push({ sessionId, day, startPeriod });
  }
  context.assignments.push(assignment);
}

export function removeAssignment(context, sessionId) {
  const index = context.assignments.findIndex((assignment) => field(assignment, 'sessionId', 'session_id') === sessionId);
  if (index < 0) return;
  const [assignment] = context.assignments.splice(index, 1);
  const session = context.sessions.get(sessionId);
  if (!session) return;
  const day = assignment.day;
  const startPeriod = field(assignment, 'startPeriod', 'start_period');
  const roomId = field(assignment, 'roomId', 'room_id');
  const facultyId = assignment.facultyOverrideId ?? assignment.facultyId ?? field(session, 'facultyId', 'faculty_id');
  const basketSlot = field(session, 'basketSlot', 'basket_slot');
  for (let period = startPeriod; period < startPeriod + session.duration; period += 1) {
    deleteValue(context.roomOccupancy, slotKey(roomId, day, period), sessionId);
    deleteValue(context.facultyOccupancy, slotKey(facultyId, day, period), sessionId);
    for (const groupId of session.groups ?? []) {
      const key = slotKey(groupId, day, period);
      const activities = context.groupOccupancy.get(key);
      const activity = basketSlot || sessionId;
      const members = activities?.get(activity);
      members?.delete(sessionId);
      if (members && !members.size) activities.delete(activity);
      if (activities && !activities.size) context.groupOccupancy.delete(key);
    }
  }
  const hoursKey = dayKey(facultyId, day);
  const remainingHours = (context.facultyDailyHours.get(hoursKey) ?? 0) - session.duration;
  if (remainingHours > 0) context.facultyDailyHours.set(hoursKey, remainingHours);
  else context.facultyDailyHours.delete(hoursKey);
  if (basketSlot) {
    const rows = context.basketAssignments.get(basketSlot)?.filter((row) => row.sessionId !== sessionId) ?? [];
    if (rows.length) context.basketAssignments.set(basketSlot, rows);
    else context.basketAssignments.delete(basketSlot);
  }
}

function periodsUnavailable(rows, day, occupiedPeriods) {
  return (rows ?? []).some((row) => row.day === day && (row.periods ?? []).some((period) => occupiedPeriods.includes(period)));
}

function makeViolation(code, message, details = {}) {
  return { code, message, details };
}

export function validatePlacement(context, sessionInput, placement, { excludeSessionId = null } = {}) {
  const session = values(sessionInput);
  const sessionId = idOf(session);
  const duration = session.duration;
  const { day, startPeriod, roomId } = placement;
  const violations = [];
  const add = (code, message, details) => violations.push(makeViolation(code, message, { sessionId, ...details }));

  if (!context.days.includes(day)) {
    add('INVALID_DAY', `${day} is not a teaching day.`, { day });
    return violations;
  }
  if (!Number.isInteger(startPeriod) || startPeriod < 1 || startPeriod + duration - 1 > context.lastTeachingPeriod) {
    add('INVALID_PERIOD', `Session does not fit within teaching periods P1-P${context.lastTeachingPeriod}.`, { startPeriod, duration });
    return violations;
  }

  const occupied = Array.from({ length: duration }, (_value, index) => startPeriod + index);
  if (crossesLunch(startPeriod, duration, context.lunchAfter)) {
    add('LUNCH_VIOLATION', 'Session crosses the lunch break.', { day, startPeriod, duration });
  }
  if (session.kind === 'lab' && !context.labStartPeriods.includes(startPeriod)) {
    add('LAB_SLOT_INVALID', `Lab sessions must start at ${context.labStartPeriods.map((period) => `P${period}`).join(' or ')}.`, { startPeriod });
  }
  const fixed = field(session, 'fixedSlot', 'fixed_slot');
  if (fixed && (fixed.day !== day || field(fixed, 'startPeriod', 'start_period') !== startPeriod)) {
    add('FIXED_SLOT_VIOLATION', 'Session must remain in its fixed slot.', { fixedSlot: fixed, day, startPeriod });
  }

  const room = context.rooms.get(roomId);
  if (!room) {
    add('ROOM_NOT_FOUND', `Room ${roomId} does not exist in this dataset.`, { roomId });
    return violations;
  }
  if (room.capacity < session.size) add('ROOM_CAPACITY_INSUFFICIENT', `Room capacity ${room.capacity} is below session size ${session.size}.`, { roomId, capacity: room.capacity, size: session.size });
  const roomType = field(room, 'type', 'type');
  const roomTypes = field(session, 'roomTypes', 'room_types') ?? [];
  if (!roomTypes.includes(roomType)) add('ROOM_TYPE_MISMATCH', `Room type ${roomType} is not allowed for this session.`, { roomId, roomType, allowedTypes: roomTypes });

  const facultyId = field(session, 'facultyId', 'faculty_id');
  const instructor = context.faculty.get(facultyId);
  if (!instructor) {
    add('FACULTY_NOT_FOUND', `Faculty ${facultyId} does not exist in this dataset.`, { facultyId });
    return violations;
  }
  const groupIds = session.groups ?? [];
  const sessionNeedsAccessible = field(session, 'needsAccessible', 'needs_accessible');
  const groupNeedsAccessible = groupIds.some((groupId) => context.groups.get(groupId)?.needsAccessible ?? context.groups.get(groupId)?.needs_accessible);
  const facultyNeedsAccessible = field(instructor, 'needsAccessible', 'needs_accessible');
  if ((sessionNeedsAccessible || groupNeedsAccessible || facultyNeedsAccessible) && !room.accessible) {
    add('ACCESSIBILITY_REQUIRED', `Room ${roomId} is not accessible.`, { roomId, groupNeedsAccessible, facultyNeedsAccessible });
  }

  if (periodsUnavailable(instructor.unavailable, day, occupied)) {
    add('FACULTY_UNAVAILABLE', `Faculty ${facultyId} is unavailable during this slot.`, { facultyId, day, periods: occupied });
  }
  if (periodsUnavailable(context.roomUnavailability.filter((row) => field(row, 'roomId', 'room_id') === roomId), day, occupied)) {
    add('ROOM_UNAVAILABLE', `Room ${roomId} is unavailable during this slot.`, { roomId, day, periods: occupied });
  }

  const basketSlot = field(session, 'basketSlot', 'basket_slot');
  for (const assignmentId of (basketSlot ? context.basketAssignments.get(basketSlot) ?? [] : [])) {
    if (assignmentId.sessionId === excludeSessionId || assignmentId.sessionId === sessionId) continue;
    if (assignmentId.day !== day || assignmentId.startPeriod !== startPeriod) {
      add('ELECTIVE_BASKET_MISMATCH', `Elective basket ${basketSlot} sessions must start together.`, { conflictingSessionId: assignmentId.sessionId, basketSlot });
    }
  }

  for (const period of occupied) {
    const roomIds = context.roomOccupancy.get(slotKey(roomId, day, period)) ?? [];
    for (const existingId of roomIds) {
      if (existingId !== excludeSessionId && existingId !== sessionId) add('ROOM_CONFLICT', `Room ${roomId} has an overlapping session.`, { conflictingSessionId: existingId, day, period });
    }
    const facultyIds = context.facultyOccupancy.get(slotKey(facultyId, day, period)) ?? [];
    for (const existingId of facultyIds) {
      if (existingId !== excludeSessionId && existingId !== sessionId) add('FACULTY_CONFLICT', `Faculty ${facultyId} has an overlapping session.`, { conflictingSessionId: existingId, day, period });
    }
    for (const groupId of groupIds) {
      const activities = context.groupOccupancy.get(slotKey(groupId, day, period));
      if (!activities) continue;
      for (const [activity, memberIds] of activities) {
        if ((basketSlot && activity === basketSlot) || [...memberIds].every((memberId) => memberId === excludeSessionId || memberId === sessionId)) continue;
        add('STUDENT_GROUP_CONFLICT', 'A student group has another overlapping session.', { groupId, day, period, conflictingSessionIds: [...memberIds] });
      }
    }
  }

  let facultyHours = context.facultyDailyHours.get(dayKey(facultyId, day)) ?? 0;
  const excludedAssignment = excludeSessionId
    ? context.assignments.find((assignment) => field(assignment, 'sessionId', 'session_id') === excludeSessionId)
    : null;
  const excludedSession = excludeSessionId ? context.sessions.get(excludeSessionId) : null;
  const excludedFacultyId = excludedAssignment?.facultyOverrideId ?? excludedAssignment?.facultyId ?? (excludedSession && field(excludedSession, 'facultyId', 'faculty_id'));
  if (excludedAssignment?.day === day && excludedFacultyId === facultyId) facultyHours -= duration;
  facultyHours += duration;
  const maxHours = field(instructor, 'maxHoursPerDay', 'max_hours_per_day') ?? 4;
  if (facultyHours > maxHours) add('DAILY_LIMIT_EXCEEDED', `Faculty ${facultyId} would teach ${facultyHours} hours that day (limit ${maxHours}).`, { facultyId, day, hours: facultyHours, limit: maxHours });

  return violations;
}

export function candidateStarts(session, context) {
  return validStartPeriods(session.duration, {
    lastPeriod: context.lastTeachingPeriod,
    lunchAfter: context.lunchAfter,
    labStartPeriods: session.kind === 'lab' ? context.labStartPeriods : [],
  });
}
