import { Dataset } from '../../models/Dataset.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { Scenario } from '../../models/Scenario.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { ApiError } from '../../utils/apiError.js';
import { buildConstraintContext, validatePlacement } from '../scheduler/hard.constraints.js';
import { solveTimetable } from '../scheduler/solver.js';
import { validateSchedule } from '../scheduler/schedule.validator.js';

async function loadState(datasetId) {
  const dataset = await Dataset.findById(datasetId);
  const version = await ScheduleVersion.findOne({ dataset: datasetId, status: 'active' });
  if (!dataset || !version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'An active dataset and timetable are required.');
  const [rooms, faculty, studentGroups, sessions, closures, assignments] = await Promise.all([
    Room.find({ dataset: datasetId }).lean(),
    Faculty.find({ dataset: datasetId }).lean(),
    StudentGroup.find({ dataset: datasetId }).lean(),
    Session.find({ dataset: datasetId }).lean(),
    RoomUnavailability.find({ dataset: datasetId }).lean(),
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
  ]);
  return { dataset, version, rooms, faculty, studentGroups, sessions, closures, assignments };
}

function applyConditions(state, changes) {
  const faculty = state.faculty.map((member) => ({ ...member, unavailable: [...(member.unavailable ?? [])] }));
  const closures = [...state.closures];
  for (const change of changes) {
    if (change.type === 'room_unavailable') {
      if (!state.rooms.some((room) => room.sourceId === change.roomId)) throw new ApiError(422, 'ROOM_NOT_FOUND', `Unknown room ${change.roomId}.`);
      for (const day of change.days) closures.push({ roomId: change.roomId, day, periods: change.periods, reason: change.reason ?? 'Scenario closure', source: 'scenario' });
    } else if (change.type === 'faculty_unavailable') {
      const member = faculty.find((item) => item.sourceId === change.facultyId);
      if (!member) throw new ApiError(422, 'FACULTY_NOT_FOUND', `Unknown faculty ${change.facultyId}.`);
      for (const day of change.days) member.unavailable.push({ day, periods: change.periods, reason: change.reason ?? 'Scenario unavailability' });
    }
  }
  return { faculty, closures };
}

function assignmentById(rows) {
  return new Map(rows.map((row) => [row.sessionId, {
    sessionId: row.sessionId, day: row.day, startPeriod: row.startPeriod, roomId: row.roomId,
    ...(row.facultyOverrideId ? { facultyOverrideId: row.facultyOverrideId } : {}),
  }]));
}

function directImpactRows(state, temporary) {
  const context = buildConstraintContext({
    dataset: state.dataset,
    rooms: state.rooms,
    faculty: temporary.faculty,
    studentGroups: state.studentGroups,
    sessions: state.sessions,
    roomUnavailability: temporary.closures,
    assignments: state.assignments,
  });
  const sessions = new Map(state.sessions.map((session) => [session.sourceId, session]));
  return state.assignments.map((assignment) => {
    const session = sessions.get(assignment.sessionId);
    if (!session) return null;
    const violations = validatePlacement(context, session, assignment, { excludeSessionId: assignment.sessionId });
    if (!violations.length) return null;
    return {
      sessionId: session.sourceId,
      courseId: session.courseId,
      kind: session.kind,
      groups: session.groups,
      facultyId: assignment.facultyOverrideId ?? session.facultyId,
      day: assignment.day,
      startPeriod: assignment.startPeriod,
      roomId: assignment.roomId,
      violations,
    };
  }).filter(Boolean);
}

function directlyAffected(state, temporary) {
  return directImpactRows(state, temporary).map((row) => row.sessionId);
}

export async function previewScenario(input) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const state = await loadState(dataset._id);
  const temporary = applyConditions(state, input.changes);
  const effectiveSessions = state.sessions.map((session) => {
    const override = state.assignments.find((assignment) => assignment.sessionId === session.sourceId)?.facultyOverrideId;
    return override ? { ...session, facultyId: override } : session;
  });
  const impactedSessions = directImpactRows({ ...state, sessions: effectiveSessions }, temporary);
  return {
    baseVersion: { id: String(state.version._id), versionNumber: state.version.versionNumber },
    temporaryChanges: input.changes,
    summary: {
      directlyAffectedSessions: impactedSessions.length,
      affectedGroups: [...new Set(impactedSessions.flatMap((row) => row.groups))],
      affectedFaculty: [...new Set(impactedSessions.map((row) => row.facultyId))],
      affectedRooms: [...new Set(impactedSessions.map((row) => row.roomId))],
    },
    impactedSessions,
  };
}

function expandMovable(movableIds, state, distance = 1) {
  const sessionMap = new Map(state.sessions.map((session) => [session.sourceId, session]));
  const movable = new Set(movableIds);
  let frontier = new Set(movableIds);
  for (let depth = 0; depth < distance; depth += 1) {
    const related = new Set();
    for (const id of frontier) {
      const source = sessionMap.get(id);
      if (!source) continue;
      for (const candidate of state.sessions) {
        if (movable.has(candidate.sourceId)) continue;
        const relatedResource = candidate.facultyId === source.facultyId
          || (candidate.groups ?? []).some((groupId) => source.groups.includes(groupId))
          || (source.basketSlot && candidate.basketSlot === source.basketSlot);
        if (relatedResource) related.add(candidate.sourceId);
      }
    }
    related.forEach((id) => movable.add(id));
    frontier = related;
    if (!frontier.size) break;
  }
  return movable;
}

function compareAssignments(beforeRows, afterRows, sessions, softPenaltyBefore, softPenaltyAfter) {
  const before = assignmentById(beforeRows);
  const after = assignmentById(afterRows);
  const changed = [];
  let timeChanged = 0;
  let roomOnlyChanged = 0;
  for (const [sessionId, previous] of before) {
    const next = after.get(sessionId);
    if (!next || (previous.day === next.day && previous.startPeriod === next.startPeriod && previous.roomId === next.roomId)) continue;
    if (previous.day !== next.day || previous.startPeriod !== next.startPeriod) timeChanged += 1;
    else roomOnlyChanged += 1;
    changed.push({ sessionId, before: previous, after: next });
  }
  const affectedSessions = new Set(changed.map((row) => row.sessionId));
  const facultyIds = new Set();
  const groupIds = new Set();
  const roomIds = new Set();
  for (const id of affectedSessions) {
    const session = sessions.find((item) => item.sourceId === id);
    if (!session) continue;
    facultyIds.add(session.facultyId);
    session.groups.forEach((groupId) => groupIds.add(groupId));
    const move = changed.find((item) => item.sessionId === id);
    roomIds.add(move.before.roomId);
    roomIds.add(move.after.roomId);
  }
  return {
    changed,
    comparison: {
      sessionsMoved: changed.length,
      timeChanged,
      roomOnlyChanged,
      hardViolations: 0,
      softPenaltyBefore,
      softPenaltyAfter,
      affectedFaculty: [...facultyIds],
      affectedGroups: [...groupIds],
      affectedRooms: [...roomIds],
    },
  };
}

export async function createScenario({ userId, input }) {
  const dataset = await Dataset.findOne({ status: 'active' });
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  const version = await ScheduleVersion.findOne({ dataset: dataset._id, status: 'active' });
  if (!version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'Generate an active timetable before creating scenarios.');
  return Scenario.create({ name: input.name, description: input.description ?? '', dataset: dataset._id, baseVersion: version._id, createdBy: userId, changes: input.changes });
}

export async function simulateScenario(scenarioId, options = {}) {
  const scenario = await Scenario.findById(scenarioId);
  if (!scenario) throw new ApiError(404, 'SCENARIO_NOT_FOUND', 'Scenario was not found.');
  if (scenario.status === 'applied') throw new ApiError(409, 'SCENARIO_ALREADY_APPLIED', 'Applied scenarios cannot be simulated again.');
  const state = await loadState(scenario.dataset);
  if (String(state.version._id) !== String(scenario.baseVersion)) throw new ApiError(409, 'SCENARIO_STALE', 'The active timetable changed; create a new scenario from the current version.');
  const temporary = applyConditions(state, scenario.changes);
  const effectiveSessions = state.sessions.map((session) => {
    const override = state.assignments.find((assignment) => assignment.sessionId === session.sourceId)?.facultyOverrideId;
    return override ? { ...session, facultyId: override } : session;
  });
  const workingState = { ...state, sessions: effectiveSessions };
  scenario.status = 'simulating';
  scenario.failure = { code: null, message: null };
  await scenario.save();

  let movableIds = new Set(directlyAffected(workingState, temporary));
  let finalAssignments = null;
  let finalValidation = null;
  for (let expansion = 0; expansion <= 4; expansion += 1) {
    const locked = state.assignments.filter((assignment) => !movableIds.has(assignment.sessionId));
    const movableSessions = effectiveSessions.filter((session) => movableIds.has(session.sourceId));
    const context = buildConstraintContext({ dataset: state.dataset, rooms: state.rooms, faculty: temporary.faculty, studentGroups: state.studentGroups, sessions: effectiveSessions, roomUnavailability: temporary.closures, assignments: locked });
    const result = movableSessions.length
      ? await solveTimetable(context, movableSessions, options)
      : { solved: true, assignments: [], nodes: 0, elapsedMs: 0 };
    if (result.solved) {
      const merged = [...locked.map((row) => ({ sessionId: row.sessionId, day: row.day, startPeriod: row.startPeriod, roomId: row.roomId, ...(row.facultyOverrideId ? { facultyOverrideId: row.facultyOverrideId } : {}) })), ...result.assignments.map((row) => {
        const override = state.assignments.find((assignment) => assignment.sessionId === row.sessionId)?.facultyOverrideId;
        return override ? { ...row, facultyOverrideId: override } : row;
      })];
      const validation = validateSchedule({ dataset: state.dataset, rooms: state.rooms, faculty: temporary.faculty, studentGroups: state.studentGroups, sessions: state.sessions, roomUnavailability: temporary.closures, assignments: merged });
      if (validation.valid) {
        finalAssignments = merged;
        finalValidation = validation;
        break;
      }
    }
    if (movableIds.size === state.sessions.length) break;
    movableIds = expansion === 3 ? new Set(state.sessions.map((session) => session.sourceId)) : expandMovable(movableIds, workingState, 1);
  }

  if (!finalAssignments) {
    scenario.status = 'failed';
    scenario.failure = { code: 'NO_VALID_SOLUTION', message: 'No valid timetable repair was found for these temporary conditions.' };
    await scenario.save();
    throw new ApiError(409, 'NO_VALID_SOLUTION', scenario.failure.message, { scenarioId: String(scenario._id) });
  }

  const beforeValidation = validateSchedule({ ...state, assignments: state.assignments });
  const comparison = compareAssignments(state.assignments, finalAssignments, state.sessions, beforeValidation.softPenalty, finalValidation.softPenalty);
  const latest = await ScheduleVersion.findOne({ dataset: state.dataset._id }).sort({ versionNumber: -1 }).select('versionNumber');
  const version = await ScheduleVersion.create({
    dataset: state.dataset._id,
    versionNumber: (latest?.versionNumber ?? 0) + 1,
    baseVersion: state.version._id,
    kind: 'scenario',
    status: 'proposed',
    createdBy: scenario.createdBy,
    reason: `Scenario: ${scenario.name}`,
    changes: comparison.changed.map((item) => ({ sessionId: item.sessionId, before: item.before, after: item.after, reason: scenario.description })),
    summary: { sessionsScheduled: finalAssignments.length, hardViolations: 0, softPenalty: finalValidation.softPenalty, sessionsMoved: comparison.comparison.sessionsMoved },
  });
  try {
    await ScheduledSession.insertMany(finalAssignments.map((assignment) => ({ dataset: state.dataset._id, scheduleVersion: version._id, ...assignment, source: 'scenario' })));
  } catch (error) {
    await ScheduleVersion.deleteOne({ _id: version._id });
    scenario.status = 'failed';
    scenario.failure = { code: error.code ?? 'SCENARIO_SAVE_FAILED', message: 'Could not save the simulated schedule proposal.' };
    await scenario.save();
    throw error;
  }

  scenario.proposedVersion = version._id;
  scenario.status = 'simulated';
  scenario.comparison = comparison.comparison;
  scenario.simulatedAt = new Date();
  await scenario.save();
  return { scenario, proposedVersionId: String(version._id), changes: comparison.changed, comparison: comparison.comparison };
}

export async function compareScenario(scenarioId) {
  const scenario = await Scenario.findById(scenarioId)
    .populate('proposedVersion', 'versionNumber status summary changes')
    .populate('baseVersion', 'versionNumber status summary');
  if (!scenario) throw new ApiError(404, 'SCENARIO_NOT_FOUND', 'Scenario was not found.');
  return {
    scenario,
    comparison: scenario.comparison,
    changes: scenario.proposedVersion?.changes ?? [],
    before: scenario.baseVersion?.summary ?? null,
    after: scenario.proposedVersion?.summary ?? null,
  };
}

export async function applyScenario(scenarioId, approvedBy) {
  const scenario = await Scenario.findById(scenarioId);
  if (!scenario || scenario.status !== 'simulated' || !scenario.proposedVersion) throw new ApiError(409, 'SCENARIO_NOT_SIMULATED', 'Simulate a scenario successfully before applying it.');
  const current = await ScheduleVersion.findOne({ dataset: scenario.dataset, status: 'active' });
  const version = await ScheduleVersion.findById(scenario.proposedVersion);
  if (!current || String(current._id) !== String(scenario.baseVersion) || !version) throw new ApiError(409, 'SCENARIO_STALE', 'The active timetable changed after this scenario was simulated.');
  const state = await loadState(scenario.dataset);
  const temporary = applyConditions(state, scenario.changes);
  const [assignments, rooms, faculty, studentGroups, sessions, closures] = await Promise.all([
    ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Room.find({ dataset: scenario.dataset }).lean(),
    Faculty.find({ dataset: scenario.dataset }).lean(),
    StudentGroup.find({ dataset: scenario.dataset }).lean(),
    Session.find({ dataset: scenario.dataset }).lean(),
    RoomUnavailability.find({ dataset: scenario.dataset }).lean(),
  ]);
  const validation = validateSchedule({ dataset: state.dataset, rooms, faculty: temporary.faculty, studentGroups, sessions, roomUnavailability: temporary.closures ?? closures, assignments });
  if (!validation.valid) throw new ApiError(409, 'SCENARIO_NO_LONGER_VALID', 'Scenario proposal no longer satisfies all hard constraints.', { violations: validation.hardViolations });
  current.status = 'superseded';
  await current.save();
  version.status = 'active';
  version.approvedBy = approvedBy;
  version.approvedAt = new Date();
  await version.save();
  scenario.status = 'applied';
  scenario.appliedBy = approvedBy;
  scenario.appliedAt = new Date();
  await scenario.save();
  return scenario;
}

export async function listScenarios(datasetId) {
  const dataset = await Dataset.findOne({ status: 'active' }).select('_id');
  if (!dataset) throw new ApiError(409, 'DATASET_NOT_FOUND', 'No active dataset exists.');
  return Scenario.find({ dataset: datasetId ?? dataset._id }).sort({ createdAt: -1 }).lean();
}
