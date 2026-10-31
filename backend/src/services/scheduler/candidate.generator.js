import { candidateStarts, validatePlacement } from './hard.constraints.js';

function sessionField(session, camel, snake) {
  return session[camel] ?? session[snake];
}

function roomField(room, camel, snake) {
  return room[camel] ?? room[snake];
}

export function generateCandidates(session, context) {
  const fixed = sessionField(session, 'fixedSlot', 'fixed_slot');
  const days = fixed ? [fixed.day] : context.days;
  const starts = fixed
    ? [sessionField(fixed, 'startPeriod', 'start_period')]
    : candidateStarts(session, context);
  const roomTypes = sessionField(session, 'roomTypes', 'room_types') ?? [];

  const candidates = [];
  for (const day of days) {
    for (const startPeriod of starts) {
      const rooms = [...context.rooms.values()]
        .filter((room) => roomTypes.includes(roomField(room, 'type', 'type')))
        .filter((room) => room.capacity >= session.size)
        .sort((a, b) => a.capacity - b.capacity || String(a.sourceId ?? a.id).localeCompare(String(b.sourceId ?? b.id)));

      for (const room of rooms) {
        const roomId = room.sourceId ?? room.id;
        const placement = { day, startPeriod, roomId };
        const violations = validatePlacement(context, session, placement);
        if (violations.length === 0) {
          candidates.push({ ...placement, roomSlack: room.capacity - session.size });
        }
      }
    }
  }
  return candidates;
}

export function generateNearMissCandidates(session, context, { currentPlacement, limit = 3 } = {}) {
  if (limit < 1) return [];
  const fixed = sessionField(session, 'fixedSlot', 'fixed_slot');
  const days = fixed ? [fixed.day] : context.days;
  const starts = fixed
    ? [sessionField(fixed, 'startPeriod', 'start_period')]
    : candidateStarts(session, context);
  const roomTypes = sessionField(session, 'roomTypes', 'room_types') ?? [];
  const rooms = [...context.rooms.values()].filter((room) => roomTypes.includes(roomField(room, 'type', 'type')));
  const nearMisses = [];

  for (const day of days) {
    for (const startPeriod of starts) {
      for (const room of rooms) {
        const roomId = room.sourceId ?? room.id;
        if (day === currentPlacement?.day && startPeriod === currentPlacement?.startPeriod && roomId === currentPlacement?.roomId) continue;
        const placement = { sessionId: sessionField(session, 'sourceId', 'id'), day, startPeriod, roomId };
        const violations = validatePlacement(context, session, placement);
        if (!violations.length) continue;
        const changedDimensions = Number(day !== currentPlacement?.day)
          + Number(startPeriod !== currentPlacement?.startPeriod)
          + Number(roomId !== currentPlacement?.roomId);
        nearMisses.push({
          placement,
          valid: false,
          violationCount: violations.length,
          violations,
          rankScore: violations.length * 100 + changedDimensions,
        });
      }
    }
  }

  return nearMisses.sort((left, right) => left.rankScore - right.rankScore
    || context.days.indexOf(left.placement.day) - context.days.indexOf(right.placement.day)
    || left.placement.startPeriod - right.placement.startPeriod
    || left.placement.roomId.localeCompare(right.placement.roomId))
    .slice(0, limit)
    .map(({ rankScore, ...candidate }, index) => ({
      ...candidate,
      rank: index + 1,
      rankReasons: candidate.violations.map((violation) => violation.message),
    }));
}
