import { Dataset } from '../../models/Dataset.js';
import { Course } from '../../models/Course.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { User } from '../../models/User.js';
import { ApiError } from '../../utils/apiError.js';
import { validateSchedule } from './schedule.validator.js';
import { compareStudentGroupGaps } from './student-gap.metrics.js';

async function loadActiveSchedule() {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'Generate an active timetable before editing sessions.');
  const [rooms, faculty, studentGroups, sessions, roomUnavailability, assignments, courses] = await Promise.all([
    Room.find({ dataset: dataset._id }).lean(),
    Faculty.find({ dataset: dataset._id }).lean(),
    StudentGroup.find({ dataset: dataset._id }).lean(),
    Session.find({ dataset: dataset._id }).lean(),
    RoomUnavailability.find({ dataset: dataset._id }).lean(),
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Course.find({ dataset: dataset._id }).lean(),
  ]);
  return { dataset, version, rooms, faculty, studentGroups, sessions, roomUnavailability, assignments, courses };
}

function assignmentShape(row) {
  return { sessionId: row.sessionId, day: row.day, startPeriod: row.startPeriod, roomId: row.roomId, ...(row.facultyOverrideId ? { facultyOverrideId: row.facultyOverrideId } : {}) };
}

function withChange(assignments, sessionId, proposal) {
  let found = false;
  const changed = assignments.map((row) => {
    if (row.sessionId !== sessionId) return assignmentShape(row);
    found = true;
    return { ...assignmentShape(row), sessionId, day: proposal.day, startPeriod: proposal.startPeriod, roomId: proposal.roomId };
  });
  if (!found) throw new ApiError(404, 'SESSION_NOT_SCHEDULED', `Session ${sessionId} is not in the active timetable.`);
  return changed;
}

function facultyHours(assignments, sessions, facultyId, day) {
  const sessionMap = new Map(sessions.map((session) => [session.sourceId, session]));
  return assignments.reduce((sum, assignment) => {
    const session = sessionMap.get(assignment.sessionId);
    const effectiveFacultyId = assignment.facultyOverrideId ?? session?.facultyId;
    return sum + (assignment.day === day && effectiveFacultyId === facultyId ? session.duration : 0);
  }, 0);
}

function setDifference(after, before) {
  const beforeSet = new Set(before.map((item) => JSON.stringify(item)));
  return after.filter((item) => !beforeSet.has(JSON.stringify(item)));
}

export async function analyzeManualChange(input, requester = {}) {
  const state = await loadActiveSchedule();
  const session = state.sessions.find((row) => row.sourceId === input.sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', `Session ${input.sessionId} was not found.`);
  if (requester.role === 'DEPARTMENT_COORDINATOR') {
    const user = await User.findById(requester.userId).select('department').lean();
    if (!user?.department) throw new ApiError(403, 'DEPARTMENT_REQUIRED', 'Coordinator account must be linked to a department.');
    const course = state.courses.find((row) => row.sourceId === session.courseId);
    if (course?.department !== user.department) throw new ApiError(403, 'FORBIDDEN', 'Coordinators may analyze changes only for sessions in their department.');
  }
  const beforeAssignment = state.assignments.find((row) => row.sessionId === input.sessionId);
  if (!beforeAssignment) throw new ApiError(404, 'SESSION_NOT_SCHEDULED', `Session ${input.sessionId} is not in the active timetable.`);
  const afterAssignments = withChange(state.assignments, input.sessionId, input);
  const beforeResult = validateSchedule({ ...state, assignments: state.assignments });
  const afterResult = validateSchedule({ ...state, assignments: afterAssignments });
  const introduced = setDifference(afterResult.hardViolations, beforeResult.hardViolations);
  const affectedRoomIds = [...new Set([beforeAssignment.roomId, input.roomId])];
  const effectiveFacultyId = beforeAssignment.facultyOverrideId ?? session.facultyId;
  const beforeHours = facultyHours(state.assignments, state.sessions, effectiveFacultyId, input.day);
  const afterHours = facultyHours(afterAssignments, state.sessions, effectiveFacultyId, input.day);
  const beforePenalty = beforeResult.softPenalties.S2 ?? 0;
  const afterPenalty = afterResult.softPenalties.S2 ?? 0;
  const affectedSessionIds = new Set([input.sessionId]);
  for (const violation of introduced) {
    const details = violation.details ?? {};
    if (details.sessionId) affectedSessionIds.add(details.sessionId);
    if (details.conflictingSessionId) affectedSessionIds.add(details.conflictingSessionId);
    (details.conflictingSessionIds ?? []).forEach((sessionId) => affectedSessionIds.add(sessionId));
  }
  const sessionMap = new Map(state.sessions.map((row) => [row.sourceId, row]));
  const courseMap = new Map(state.courses.map((row) => [row.sourceId, row]));
  const groupMap = new Map(state.studentGroups.map((row) => [row.sourceId, row]));
  const facultyMap = new Map(state.faculty.map((row) => [row.sourceId, row]));
  const beforeMap = new Map(state.assignments.map((row) => [row.sessionId, row]));
  const afterMap = new Map(afterAssignments.map((row) => [row.sessionId, row]));
  const impactedSessions = [...affectedSessionIds].map((sessionId) => {
    const impactedSession = sessionMap.get(sessionId);
    if (!impactedSession) return null;
    const assignment = afterMap.get(sessionId) ?? beforeMap.get(sessionId);
    const assignedFacultyId = assignment?.facultyOverrideId ?? impactedSession.facultyId;
    return {
      sessionId,
      courseId: impactedSession.courseId,
      courseTitle: courseMap.get(impactedSession.courseId)?.title ?? impactedSession.courseId,
      day: assignment?.day,
      startPeriod: assignment?.startPeriod,
      roomId: assignment?.roomId,
      faculty: { id: assignedFacultyId, name: facultyMap.get(assignedFacultyId)?.name ?? assignedFacultyId },
      groups: impactedSession.groups.map((groupId) => ({ id: groupId, name: groupMap.get(groupId)?.name ?? groupId })),
    };
  }).filter(Boolean);
  const impactedFaculty = [...new Map(impactedSessions.map((row) => [row.faculty.id, row.faculty])).values()];
  const impactedGroupIds = [...new Set(impactedSessions.flatMap((row) => row.groups.map((group) => group.id)))];
  const roomMap = new Map(state.rooms.map((row) => [row.sourceId, row]));
  const roomViolations = introduced.filter((violation) => [
    'ROOM_NOT_FOUND', 'ROOM_CAPACITY_INSUFFICIENT', 'ROOM_TYPE_MISMATCH',
    'ACCESSIBILITY_REQUIRED', 'ROOM_UNAVAILABLE', 'ROOM_CONFLICT',
  ].includes(violation.code));
  const affectedDays = [...new Set([beforeAssignment.day, input.day])];
  const facultyDailyLoadByDay = affectedDays.map((day) => ({
    day,
    before: facultyHours(state.assignments, state.sessions, effectiveFacultyId, day),
    after: facultyHours(afterAssignments, state.sessions, effectiveFacultyId, day),
  })).map((row) => ({ ...row, difference: row.after - row.before }));
  const studentGapChanges = compareStudentGroupGaps({
    beforeAssignments: state.assignments,
    afterAssignments,
    sessions: state.sessions,
    groups: state.studentGroups,
    groupIds: session.groups,
  });

  return {
    activeScheduleVersion: { id: String(state.version._id), versionNumber: state.version.versionNumber },
    valid: afterResult.valid,
    sessionId: input.sessionId,
    before: assignmentShape(beforeAssignment),
    after: { sessionId: input.sessionId, day: input.day, startPeriod: input.startPeriod, roomId: input.roomId },
    affectedFaculty: [effectiveFacultyId],
    affectedGroups: session.groups,
    affectedRooms: affectedRoomIds,
    impactedSessions,
    impactedFaculty,
    impactedGroups: impactedGroupIds.map((groupId) => ({ id: groupId, name: groupMap.get(groupId)?.name ?? groupId })),
    roomImpact: {
      before: { id: beforeAssignment.roomId, name: roomMap.get(beforeAssignment.roomId)?.name ?? beforeAssignment.roomId },
      after: {
        id: input.roomId,
        name: roomMap.get(input.roomId)?.name ?? input.roomId,
        building: roomMap.get(input.roomId)?.building ?? null,
        capacity: roomMap.get(input.roomId)?.capacity ?? null,
      },
      violations: roomViolations,
      validForSession: roomViolations.length === 0,
    },
    conflictsIntroduced: introduced,
    studentGapChange: afterPenalty - beforePenalty,
    studentGapChanges,
    studentGapPeriodChange: studentGapChanges.reduce((sum, row) => sum + row.difference, 0),
    facultyDailyHours: { before: beforeHours, after: afterHours, difference: afterHours - beforeHours, byDay: facultyDailyLoadByDay },
    hardViolationCount: afterResult.hardViolationCount,
    softPenalty: { before: beforeResult.softPenalty, after: afterResult.softPenalty, difference: afterResult.softPenalty - beforeResult.softPenalty },
  };
}

export async function proposeManualChange(input, createdBy) {
  const impact = await analyzeManualChange(input);
  if (!impact.valid) {
    throw new ApiError(409, 'SCHEDULE_CONFLICT', 'Manual change would create hard constraint violations.', {
      impact,
    });
  }

  const state = await loadActiveSchedule();
  if (String(state.version._id) !== impact.activeScheduleVersion.id) {
    throw new ApiError(409, 'SCHEDULE_VERSION_STALE', 'The active timetable changed while the impact was being calculated. Analyze the change again.');
  }
  const latest = await ScheduleVersion.findOne({ dataset: state.dataset._id }).sort({ versionNumber: -1 }).select('versionNumber');
  const version = await ScheduleVersion.create({
    dataset: state.dataset._id,
    versionNumber: (latest?.versionNumber ?? 0) + 1,
    baseVersion: state.version._id,
    kind: 'manual_edit',
    status: 'proposed',
    createdBy,
    reason: input.reason ?? 'Manual timetable change.',
    changes: [{ sessionId: input.sessionId, before: impact.before, after: impact.after, reason: input.reason ?? '' }],
    summary: {
      sessionsScheduled: state.sessions.length,
      hardViolations: 0,
      softPenalty: impact.softPenalty.after,
      sessionsMoved: 1,
    },
  });
  const afterAssignments = withChange(state.assignments, input.sessionId, input);
  try {
    await ScheduledSession.insertMany(afterAssignments.map((assignment) => ({
      dataset: state.dataset._id,
      scheduleVersion: version._id,
      ...assignment,
      source: 'manual',
    })));
  } catch (error) {
    await ScheduleVersion.deleteOne({ _id: version._id });
    throw error;
  }
  return { versionId: String(version._id), status: version.status, impact };
}

export async function applyManualVersion(versionId, approvedBy) {
  const version = await ScheduleVersion.findById(versionId);
  if (!version || version.kind !== 'manual_edit') throw new ApiError(404, 'SCHEDULE_VERSION_NOT_FOUND', 'Manual schedule proposal was not found.');
  if (version.status !== 'proposed') throw new ApiError(409, 'SCHEDULE_VERSION_NOT_PROPOSED', 'Only proposed versions can be applied.');
  const current = await ScheduleVersion.findOne({ dataset: version.dataset, status: 'active' });
  if (!current || String(current._id) !== String(version.baseVersion)) {
    throw new ApiError(409, 'SCHEDULE_VERSION_STALE', 'The active timetable changed after this proposal was created. Re-analyze the change.');
  }

  const [dataset, rooms, faculty, studentGroups, sessions, roomUnavailability, assignments] = await Promise.all([
    Dataset.findById(version.dataset),
    Room.find({ dataset: version.dataset }).lean(),
    Faculty.find({ dataset: version.dataset }).lean(),
    StudentGroup.find({ dataset: version.dataset }).lean(),
    Session.find({ dataset: version.dataset }).lean(),
    RoomUnavailability.find({ dataset: version.dataset }).lean(),
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
  ]);
  const validation = validateSchedule({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability, assignments });
  if (!validation.valid) throw new ApiError(409, 'SCHEDULE_CONFLICT', 'Proposal is no longer valid.', { violations: validation.hardViolations });

  current.status = 'superseded';
  await current.save();
  version.status = 'active';
  version.approvedBy = approvedBy;
  version.approvedAt = new Date();
  await version.save();
  return version;
}
