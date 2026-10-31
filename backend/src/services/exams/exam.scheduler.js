import { ApiError } from '../../utils/apiError.js';

function clockMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function sessionPeriods(session, calendar) {
  const start = clockMinutes(session.start);
  const end = clockMinutes(session.end);
  return calendar.periods
    .filter((period) => clockMinutes(period.start) < end && clockMinutes(period.end) > start)
    .map((period) => period.id);
}

function makeRoomSets(exam, rooms, maxChoices = 80) {
  const eligible = rooms
    .filter((room) => (room.allowedUses ?? room.allowed_uses ?? []).includes('exam'))
    .map((room) => ({ roomId: room.sourceId ?? room.id, effectiveCapacity: Math.floor(room.capacity / 2) }))
    .sort((a, b) => a.effectiveCapacity - b.effectiveCapacity || a.roomId.localeCompare(b.roomId));
  const choices = [];

  function visit(start, chosen, seats) {
    if (seats >= exam.size) {
      choices.push({ rooms: chosen, excess: seats - exam.size });
      return;
    }
    if (chosen.length >= 6 || start >= eligible.length || choices.length >= maxChoices * 3) return;
    for (let index = start; index < eligible.length; index += 1) {
      const room = eligible[index];
      visit(index + 1, [...chosen, room.roomId], seats + room.effectiveCapacity);
      if (choices.length >= maxChoices * 3) return;
    }
  }

  visit(0, [], 0);
  return choices
    .sort((a, b) => a.excess - b.excess || a.rooms.length - b.rooms.length || a.rooms.join(',').localeCompare(b.rooms.join(',')))
    .slice(0, maxChoices);
}

function isRoomSetAvailable(roomSet, day, sessionId, slot, context) {
  const periods = sessionPeriods(slot, context.calendar);
  for (const roomId of roomSet.rooms) {
    for (const unavailable of context.roomUnavailability) {
      if (unavailable.roomId !== roomId || unavailable.day !== day) continue;
      if (unavailable.periods.some((period) => periods.includes(period))) return false;
    }
    if (context.roomUse.has(`${roomId}|${day}|${sessionId}`)) return false;
  }
  return true;
}

export function validateExamSchedule({ exams, rooms, calendar, roomUnavailability = [], assignments }) {
  const violations = [];
  const examMap = new Map(exams.map((exam) => [exam.sourceId ?? exam.id, exam]));
  const roomMap = new Map(rooms.map((room) => [room.sourceId ?? room.id, room]));
  const seen = new Set();
  const groupUse = new Map();
  const roomUse = new Map();

  for (const assignment of assignments) {
    const examId = assignment.examId ?? assignment.exam_id;
    const exam = examMap.get(examId);
    if (!exam) {
      violations.push({ code: 'UNKNOWN_EXAM', examId, message: `Unknown exam ${examId}.` });
      continue;
    }
    if (seen.has(examId)) violations.push({ code: 'DUPLICATE_EXAM', examId, message: `Exam ${examId} is scheduled more than once.` });
    seen.add(examId);
    const slot = calendar.exam_week.sessions.find((item) => item.id === assignment.session);
    if (!calendar.exam_week.days.includes(assignment.day) || !slot) {
      violations.push({ code: 'INVALID_EXAM_SLOT', examId, message: `Invalid day or exam session for ${examId}.` });
      continue;
    }

    let seats = 0;
    for (const roomId of assignment.rooms ?? []) {
      const room = roomMap.get(roomId);
      if (!room || !(room.allowedUses ?? room.allowed_uses ?? []).includes('exam')) {
        violations.push({ code: 'ROOM_CANNOT_HOST_EXAMS', examId, roomId, message: `${roomId} cannot host exams.` });
        continue;
      }
      seats += Math.floor(room.capacity / 2);
      const key = `${roomId}|${assignment.day}|${assignment.session}`;
      if (roomUse.has(key)) violations.push({ code: 'EXAM_ROOM_CONFLICT', examId, roomId, message: `${roomId} is assigned to two exams in the same slot.` });
      roomUse.set(key, examId);

      const periods = sessionPeriods(slot, calendar);
      if (roomUnavailability.some((entry) => (entry.roomId ?? entry.room_id) === roomId && entry.day === assignment.day && entry.periods.some((period) => periods.includes(period)))) {
        violations.push({ code: 'EXAM_ROOM_UNAVAILABLE', examId, roomId, message: `${roomId} is unavailable during this exam.` });
      }
    }
    if (seats < exam.size) violations.push({ code: 'EXAM_CAPACITY_INSUFFICIENT', examId, message: `${seats} effective seats for ${exam.size} students.` });
    for (const groupId of exam.groups) {
      const key = `${groupId}|${assignment.day}|${assignment.session}`;
      if (groupUse.has(key)) violations.push({ code: 'EXAM_GROUP_CONFLICT', examId, groupId, message: `${groupId} has overlapping exams.` });
      groupUse.set(key, examId);
    }
  }
  for (const examId of examMap.keys()) {
    if (!seen.has(examId)) violations.push({ code: 'EXAM_UNSCHEDULED', examId, message: `Exam ${examId} is not scheduled.` });
  }
  return { valid: violations.length === 0, violations };
}

export async function scheduleExams({ exams, rooms, calendar, roomUnavailability = [], maxNodes = 200_000, maxTimeMs = 20_000 }) {
  if (!exams.length) return { assignments: [], nodes: 0, softPenalty: 0 };
  const slots = calendar.exam_week.sessions;
  const candidatesByExam = new Map();
  const noRoom = [];
  for (const exam of exams) {
    const roomSets = makeRoomSets(exam, rooms);
    if (!roomSets.length) noRoom.push(exam.sourceId ?? exam.id);
    candidatesByExam.set(exam.sourceId ?? exam.id, roomSets);
  }
  if (noRoom.length) throw new ApiError(409, 'EXAM_CAPACITY_INSUFFICIENT', 'Some exams have no eligible combination of rooms at half capacity.', { examIds: noRoom });

  const ordered = [...exams].sort((a, b) => {
    const choiceDifference = candidatesByExam.get(a.sourceId ?? a.id).length - candidatesByExam.get(b.sourceId ?? b.id).length;
    return choiceDifference || b.size - a.size || (a.sourceId ?? a.id).localeCompare(b.sourceId ?? b.id);
  });
  const assignments = [];
  const roomUse = new Set();
  const groupUse = new Map();
  const context = { calendar, roomUnavailability, roomUse };
  let nodes = 0;
  const started = Date.now();
  let softPenalty = 0;

  async function search(index) {
    if (index === ordered.length) return true;
    if (++nodes > maxNodes || Date.now() - started > maxTimeMs) return false;
    if (nodes % 1000 === 0) await new Promise((resolve) => setImmediate(resolve));
    const exam = ordered[index];
    const examId = exam.sourceId ?? exam.id;
    const options = [];
    for (const day of calendar.exam_week.days) {
      for (const slot of slots) {
        const groups = exam.groups;
        if (groups.some((groupId) => groupUse.has(`${groupId}|${day}|${slot.id}`))) continue;
        for (const roomSet of candidatesByExam.get(examId)) {
          if (!isRoomSetAvailable(roomSet, day, slot.id, slot, context)) continue;
          const dailyPenalty = groups.filter((groupId) => [...groupUse.keys()].some((key) => key.startsWith(`${groupId}|${day}|`))).length * 5;
          options.push({ examId, day, session: slot.id, rooms: roomSet.rooms, cost: roomSet.excess + dailyPenalty });
        }
      }
    }
    options.sort((a, b) => a.cost - b.cost || a.day.localeCompare(b.day) || a.session.localeCompare(b.session) || a.rooms.join(',').localeCompare(b.rooms.join(',')));
    for (const option of options) {
      assignments.push(option);
      for (const roomId of option.rooms) roomUse.add(`${roomId}|${option.day}|${option.session}`);
      for (const groupId of exam.groups) groupUse.set(`${groupId}|${option.day}|${option.session}`, examId);
      if (await search(index + 1)) return true;
      assignments.pop();
      for (const roomId of option.rooms) roomUse.delete(`${roomId}|${option.day}|${option.session}`);
      for (const groupId of exam.groups) groupUse.delete(`${groupId}|${option.day}|${option.session}`);
    }
    return false;
  }

  const solved = await search(0);
  if (!solved) {
    throw new ApiError(409, 'NO_VALID_EXAM_SCHEDULE', 'The exam scheduler did not find a valid assignment within its search limits.', {
      examCount: exams.length,
      searchNodes: nodes,
      searchLimitReached: nodes > maxNodes || Date.now() - started > maxTimeMs,
    });
  }
  const validation = validateExamSchedule({ exams, rooms, calendar, roomUnavailability, assignments });
  if (!validation.valid) throw new ApiError(500, 'EXAM_VALIDATION_FAILED', 'The exam schedule failed deterministic validation.', { violations: validation.violations });

  const dayUse = new Map();
  for (const assignment of assignments) {
    const exam = examMapLookup(exams, assignment.examId);
    for (const groupId of exam.groups) {
      const key = `${groupId}|${assignment.day}`;
      dayUse.set(key, (dayUse.get(key) ?? 0) + 1);
    }
  }
  softPenalty = [...dayUse.values()].reduce((sum, count) => sum + Math.max(0, count - 1) * 5, 0);
  return { assignments, nodes, softPenalty };
}

function examMapLookup(exams, examId) {
  return exams.find((exam) => (exam.sourceId ?? exam.id) === examId);
}
