const get = (row, camel, snake) => row?.[camel] ?? row?.[snake];

export function validateBooking({ request, placement, room, dataset, roomUnavailability = [], scheduledSessions = [], sessions = [], existingBookings = [], allowOutsideWindow = false }) {
  const violations = [];
  const add = (code, message, details = {}) => violations.push({ code, message, details });
  const day = placement.day;
  const start = placement.startPeriod;
  const duration = get(request, 'durationPeriods', 'duration_periods');
  const end = start + duration - 1;
  const periods = Array.from({ length: duration }, (_value, index) => start + index);
  const roomId = placement.roomId;

  if (!room) {
    add('ROOM_NOT_FOUND', `Room ${roomId} does not exist.`, { roomId });
    return violations;
  }
  if (!dataset.calendar.days.includes(day)) add('INVALID_DAY', `${day} is not a valid event day.`, { day });
  if (!Number.isInteger(start) || start < 1 || end > 13) add('INVALID_TIME', 'Booking must fit within periods P1-P13.', { day, startPeriod: start, endPeriod: end });
  if (!(room.allowedUses ?? room.allowed_uses ?? []).includes('event')) add('ROOM_CANNOT_HOST_EVENTS', `${roomId} is not available for events.`, { roomId });

  const types = get(request, 'roomTypes', 'room_types') ?? [];
  const roomType = room.type;
  if (!types.includes(roomType)) add('ROOM_TYPE_MISMATCH', `${roomId} has type ${roomType}, which was not requested.`, { roomId, roomType, allowedTypes: types });
  const attendance = get(request, 'attendance', 'attendance');
  if (room.capacity < attendance) add('ROOM_CAPACITY_INSUFFICIENT', `${roomId} seats ${room.capacity}; request needs ${attendance}.`, { roomId, capacity: room.capacity, attendance });
  const features = new Set([...(room.features ?? []), ...(room.accessible ? ['accessible'] : [])]);
  const missing = (request.needs ?? []).filter((feature) => !features.has(feature));
  if (missing.length) add('ROOM_FEATURES_MISSING', `${roomId} lacks required features.`, { roomId, missing });

  if (!allowOutsideWindow) {
    const inWindow = (request.windows ?? []).some((window) => {
      const from = get(window, 'fromPeriod', 'from_period');
      const to = get(window, 'toPeriod', 'to_period');
      return window.day === day && from <= start && end <= to;
    });
    if (!inWindow) add('OUTSIDE_REQUESTED_WINDOW', 'The proposed time is outside the requested windows; offer it as an alternative instead.', { day, startPeriod: start, endPeriod: end });
  }

  for (const unavailable of roomUnavailability) {
    if ((unavailable.roomId ?? unavailable.room_id) === roomId && unavailable.day === day && unavailable.periods.some((period) => periods.includes(period))) {
      add('ROOM_UNAVAILABLE', `${roomId} is unavailable during the requested time.`, { roomId, day });
      break;
    }
  }

  const sessionMap = new Map(sessions.map((session) => [session.sourceId ?? session.id, session]));
  for (const assignment of scheduledSessions) {
    if (assignment.day !== day) continue;
    const session = sessionMap.get(assignment.sessionId);
    if (!session) continue;
    const classStart = assignment.startPeriod;
    const classEnd = classStart + session.duration - 1;
    const overlaps = start <= classEnd && classStart <= end;
    if (!overlaps) continue;
    if (assignment.roomId === roomId) add('ROOM_CONFLICT', `${roomId} is occupied by class ${assignment.sessionId}.`, { sessionId: assignment.sessionId, day });
    const mandatoryGroups = request.mandatoryForGroups ?? request.mandatory_for_groups ?? [];
    const affected = (session.groups ?? []).filter((groupId) => mandatoryGroups.includes(groupId));
    if (affected.length) add('MANDATORY_GROUP_CONFLICT', 'Mandatory attendees have a scheduled class during the request.', { sessionId: assignment.sessionId, groups: affected, day });
  }

  for (const other of existingBookings) {
    if (String(other._id) === String(request._id) || other.status !== 'approved' || !other.decision || other.decision.day !== day) continue;
    const otherEnd = other.decision.endPeriod;
    const overlaps = start <= otherEnd && other.decision.startPeriod <= end;
    if (!overlaps) continue;
    if (other.decision.roomId === roomId) add('BOOKING_CONFLICT', `${roomId} is already reserved by another approved request.`, { requestId: String(other._id), day });
    const commonGroups = (request.mandatoryForGroups ?? request.mandatory_for_groups ?? []).filter((groupId) => other.mandatoryForGroups.includes(groupId));
    if (commonGroups.length) add('MANDATORY_GROUP_CONFLICT', 'Mandatory attendees have another approved event during the request.', { requestId: String(other._id), groups: commonGroups, day });
  }
  return violations;
}

export function effectiveCategory(data, request) {
  const order = data.priorityOrder ?? data.priority_order ?? [];
  const roleCaps = data.roleCategoryCap ?? data.role_category_cap ?? {};
  const role = request.requesterRole ?? request.role;
  const roleAliases = { ADMIN: 'admin', DEPARTMENT_COORDINATOR: 'department_coordinator', FACULTY: 'faculty', CLUB_REPRESENTATIVE: 'club' };
  const cap = roleCaps[role] ?? roleCaps[roleAliases[role]] ?? order.at(-1);
  const requested = request.requestedCategory ?? request.requested_category;
  const requestedIndex = order.indexOf(requested);
  const capIndex = order.indexOf(cap);
  return order[Math.max(requestedIndex < 0 ? order.length - 1 : requestedIndex, capIndex < 0 ? order.length - 1 : capIndex)];
}
