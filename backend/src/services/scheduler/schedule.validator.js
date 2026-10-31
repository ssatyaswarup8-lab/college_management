import { buildConstraintContext, validatePlacement } from './hard.constraints.js';
import { calculateSoftPenalty } from './soft.constraints.js';

const idOf = (value) => value?.sourceId ?? value?.id ?? value?.sessionId;

export function validateSchedule({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability = [], assignments }) {
  const violations = [];
  const sessionMap = new Map(sessions.map((session) => [idOf(session), session]));
  const assignmentsById = new Map();

  for (const assignment of assignments) {
    const sessionId = assignment.sessionId ?? assignment.session_id;
    if (!sessionMap.has(sessionId)) {
      violations.push({ code: 'UNKNOWN_SESSION', message: `Unknown session ${sessionId}.`, details: { sessionId } });
      continue;
    }
    if (assignmentsById.has(sessionId)) {
      violations.push({ code: 'DUPLICATE_SESSION', message: `Session ${sessionId} appears more than once.`, details: { sessionId } });
    }
    assignmentsById.set(sessionId, assignment);
  }
  for (const sessionId of sessionMap.keys()) {
    if (!assignmentsById.has(sessionId)) violations.push({ code: 'SESSION_UNSCHEDULED', message: `Session ${sessionId} is not scheduled.`, details: { sessionId } });
  }

  const normalizedAssignments = [...assignmentsById.entries()].map(([sessionId, assignment]) => ({
    sessionId,
    day: assignment.day,
    startPeriod: assignment.startPeriod ?? assignment.start_period,
    roomId: assignment.roomId ?? assignment.room_id,
    facultyOverrideId: assignment.facultyOverrideId ?? assignment.faculty_override_id ?? null,
  }));
  const context = buildConstraintContext({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability, assignments: normalizedAssignments });
  for (const assignment of normalizedAssignments) {
    const sourceSession = sessionMap.get(assignment.sessionId);
    const session = assignment.facultyOverrideId ? { ...sourceSession, facultyId: assignment.facultyOverrideId } : sourceSession;
    violations.push(...validatePlacement(context, session, assignment, { excludeSessionId: assignment.sessionId }));
  }

  const soft = calculateSoftPenalty({ sessions, assignments: normalizedAssignments, rooms, faculty, days: context.days });
  return {
    valid: violations.length === 0,
    hardViolations: violations,
    hardViolationCount: violations.length,
    softPenalties: soft.penalties,
    softPenalty: soft.total,
    sessionsScheduled: normalizedAssignments.length,
  };
}
