import { Dataset } from '../../models/Dataset.js';
import { Disruption } from '../../models/Disruption.js';
import { Faculty } from '../../models/Faculty.js';
import { Room } from '../../models/Room.js';
import { RoomUnavailability } from '../../models/RoomUnavailability.js';
import { ScheduledSession } from '../../models/ScheduledSession.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';
import { Session } from '../../models/Session.js';
import { StudentGroup } from '../../models/StudentGroup.js';
import { Course } from '../../models/Course.js';
import { ApiError } from '../../utils/apiError.js';
import { buildConstraintContext, validatePlacement } from '../scheduler/hard.constraints.js';
import { solveTimetable } from '../scheduler/solver.js';
import { validateSchedule } from '../scheduler/schedule.validator.js';

async function loadState(datasetId) {
  const dataset = await Dataset.findById(datasetId);
  const version = await ScheduleVersion.findOne({ dataset: datasetId, status: 'active' });
  if (!dataset || !version) throw new ApiError(409, 'SCHEDULE_NOT_FOUND', 'An active dataset and timetable are required.');
  const [rooms, faculty, studentGroups, sessions, closures, assignments, courses] = await Promise.all([
    Room.find({ dataset: datasetId }).lean(), Faculty.find({ dataset: datasetId }).lean(),
    StudentGroup.find({ dataset: datasetId }).lean(), Session.find({ dataset: datasetId }).lean(),
    RoomUnavailability.find({ dataset: datasetId }).lean(), ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    Course.find({ dataset: datasetId }).lean(),
  ]);
  return { dataset, version, rooms, faculty, studentGroups, sessions, closures, assignments, courses };
}

function applyChanges(state, changes) {
  const faculty = state.faculty.map((row) => ({ ...row, unavailable: [...(row.unavailable ?? [])] }));
  const closures = [...state.closures];
  const addedSessions = [];
  const knownSessionIds = new Set(state.sessions.map((row) => row.sourceId));
  const facultyIds = new Set(faculty.map((row) => row.sourceId));
  const roomIds = new Set(state.rooms.map((row) => row.sourceId));
  const groupIds = new Set(state.studentGroups.map((row) => row.sourceId));
  const courseIds = new Set(state.courses.map((row) => row.sourceId));

  for (const change of changes) {
    if (change.type === 'faculty_unavailable') {
      const member = faculty.find((row) => row.sourceId === change.faculty_id);
      if (!member) throw new ApiError(422, 'FACULTY_NOT_FOUND', `Unknown faculty ${change.faculty_id}.`);
      change.days.forEach((day) => member.unavailable.push({ day, periods: change.periods, reason: change.reason ?? 'Disruption' }));
    } else if (change.type === 'room_unavailable') {
      if (!roomIds.has(change.room_id)) throw new ApiError(422, 'ROOM_NOT_FOUND', `Unknown room ${change.room_id}.`);
      change.days.forEach((day) => closures.push({ roomId: change.room_id, day, periods: change.periods, reason: change.reason ?? 'Disruption', source: 'disruption' }));
    } else if (change.type === 'add_session') {
      const session = change.session;
      if (knownSessionIds.has(session.id)) throw new ApiError(409, 'SESSION_ALREADY_EXISTS', `Session ${session.id} already exists.`);
      if (!courseIds.has(session.course_id)) throw new ApiError(422, 'COURSE_NOT_FOUND', `Unknown course ${session.course_id}.`);
      if (!facultyIds.has(session.faculty_id)) throw new ApiError(422, 'FACULTY_NOT_FOUND', `Unknown faculty ${session.faculty_id}.`);
      session.groups.forEach((groupId) => { if (!groupIds.has(groupId)) throw new ApiError(422, 'STUDENT_GROUP_NOT_FOUND', `Unknown student group ${groupId}.`); });
      knownSessionIds.add(session.id);
      addedSessions.push({
        sourceId: session.id, courseId: session.course_id, kind: session.kind, groups: session.groups,
        facultyId: session.faculty_id, size: session.size, duration: session.duration,
        roomTypes: session.room_types, needsAccessible: session.needs_accessible ?? false,
        basketSlot: session.basket_slot ?? null, fixedSlot: session.fixed_slot ?? null,
      });
    }
  }
  return { faculty, closures, addedSessions };
}

function normaliseAssignments(rows) {
  return rows.map((row) => ({ sessionId: row.sessionId, day: row.day, startPeriod: row.startPeriod, roomId: row.roomId, ...(row.facultyOverrideId ? { facultyOverrideId: row.facultyOverrideId } : {}) }));
}

function presentSession(state, row) {
  const session = state.sessions.find((item) => item.sourceId === row.sessionId);
  const course = state.courses.find((item) => item.sourceId === (session?.courseId ?? row.courseId));
  const facultyId = row.facultyOverrideId ?? session?.facultyId ?? row.facultyId;
  const faculty = state.faculty.find((item) => item.sourceId === facultyId);
  const room = state.rooms.find((item) => item.sourceId === row.roomId);
  const groups = (session?.groups ?? row.groups ?? []).map((id) => state.studentGroups.find((item) => item.sourceId === id)?.name).filter(Boolean);
  return {
    courseName: course?.title ?? 'Unlisted course',
    sessionKind: session?.kind ?? 'class',
    facultyName: faculty?.name ?? 'Unassigned faculty',
    groupNames: groups,
    roomName: room?.name ?? 'Unlisted room',
    building: room?.building ?? '',
    day: row.day,
    startPeriod: row.startPeriod,
    endPeriod: row.endPeriod ?? (session ? row.startPeriod + session.duration - 1 : null),
  };
}

function comparisonOf(before, after, sessions, beforePenalty, afterPenalty, addedCount) {
  const afterMap = new Map(after.map((row) => [row.sessionId, row]));
  const changes = [];
  let timeChanged = 0;
  let roomOnlyChanged = 0;
  for (const old of before) {
    const next = afterMap.get(old.sessionId);
    if (!next || (old.day === next.day && old.startPeriod === next.startPeriod && old.roomId === next.roomId)) continue;
    if (old.day !== next.day || old.startPeriod !== next.startPeriod) timeChanged += 1;
    else roomOnlyChanged += 1;
    changes.push({ sessionId: old.sessionId, before: old, after: next });
  }
  for (const row of after) {
    if (!before.some((old) => old.sessionId === row.sessionId)) changes.push({ sessionId: row.sessionId, before: null, after: row });
  }
  return {
    changes,
    comparison: { sessionsMoved: changes.length - addedCount, sessionsAdded: addedCount, sessionsUnchanged: before.length - (changes.length - addedCount), timeChanged, roomOnlyChanged, hardViolations: 0, softPenaltyBefore: beforePenalty, softPenaltyAfter: afterPenalty },
  };
}

export async function analyzeDisruption({ userId, input }) {
  const state = await loadState((await Dataset.findOne({ status: 'active' }).select('_id'))?._id);
  for (const change of input.changes) {
    if (change.type === 'faculty_unavailable' && !state.faculty.some((row) => row.sourceId === change.faculty_id)) throw new ApiError(422, 'FACULTY_NOT_FOUND', `Unknown faculty ${change.faculty_id}.`);
    if (change.type === 'room_unavailable' && !state.rooms.some((row) => row.sourceId === change.room_id)) throw new ApiError(422, 'ROOM_NOT_FOUND', `Unknown room ${change.room_id}.`);
  }
  const temporary = applyChanges(state, input.changes);
  const sessionMap = new Map(state.sessions.map((session) => [session.sourceId, session]));
  const impactedSessions = [];
  for (const assignment of state.assignments) {
    const session = sessionMap.get(assignment.sessionId);
    if (!session) continue;
    const start = assignment.startPeriod;
    const end = start + session.duration - 1;
    const reasons = [];
    for (const change of input.changes) {
      if (change.type === 'add_session') continue;
      if (!change.days.includes(assignment.day) || !change.periods.some((period) => period >= start && period <= end)) continue;
      if (change.type === 'room_unavailable' && change.room_id === assignment.roomId) reasons.push({ type: change.type, targetId: change.room_id });
      const effectiveFacultyId = assignment.facultyOverrideId ?? session.facultyId;
      if (change.type === 'faculty_unavailable' && change.faculty_id === effectiveFacultyId) reasons.push({ type: change.type, targetId: change.faculty_id });
    }
    if (reasons.length) impactedSessions.push({
      sessionId: session.sourceId,
      courseId: session.courseId,
      day: assignment.day,
      startPeriod: start,
      endPeriod: end,
      roomId: assignment.roomId,
      facultyId: assignment.facultyOverrideId ?? session.facultyId,
      groups: session.groups,
      reasons,
      details: presentSession(state, { ...assignment, sessionId: session.sourceId, endPeriod: end }),
    });
  }
  const disruption = await Disruption.create({ dataset: state.dataset._id, baseVersion: state.version._id, createdBy: userId, title: input.title, description: input.description ?? '', changes: input.changes, status: 'analyzed', impact: { impactedSessions, impactedCount: impactedSessions.length, sessionsAdded: temporary.addedSessions.length } });
  return disruption;
}

export async function repairDisruption(disruptionId, options = {}) {
  const disruption = await Disruption.findById(disruptionId);
  if (!disruption) throw new ApiError(404, 'DISRUPTION_NOT_FOUND', 'Disruption was not found.');
  if (disruption.status === 'applied') throw new ApiError(409, 'DISRUPTION_ALREADY_APPLIED', 'Applied disruptions cannot be repaired again.');
  const state = await loadState(disruption.dataset);
  if (String(state.version._id) !== String(disruption.baseVersion)) throw new ApiError(409, 'DISRUPTION_STALE', 'The active timetable changed; analyze this disruption again.');
  const temporary = applyChanges(state, disruption.changes);
  const allSessions = [...state.sessions, ...temporary.addedSessions];
  const effectiveSessions = allSessions.map((session) => {
    const override = state.assignments.find((assignment) => assignment.sessionId === session.sourceId)?.facultyOverrideId;
    return override ? { ...session, facultyId: override } : session;
  });
  const sessionMap = new Map(effectiveSessions.map((session) => [session.sourceId, session]));
  const temporaryContext = buildConstraintContext({ dataset: state.dataset, rooms: state.rooms, faculty: temporary.faculty, studentGroups: state.studentGroups, sessions: effectiveSessions, roomUnavailability: temporary.closures, assignments: state.assignments });
  let movable = new Set(temporary.addedSessions.map((session) => session.sourceId));
  for (const assignment of state.assignments) {
    if (validatePlacement(temporaryContext, sessionMap.get(assignment.sessionId), assignment, { excludeSessionId: assignment.sessionId }).length) movable.add(assignment.sessionId);
  }
  disruption.status = 'repairing';
  await disruption.save();

  let finalAssignments = null;
  let finalResult = null;
  for (let pass = 0; pass <= 4; pass += 1) {
    const locked = state.assignments.filter((row) => !movable.has(row.sessionId));
    const pending = effectiveSessions.filter((session) => movable.has(session.sourceId));
    const context = buildConstraintContext({ dataset: state.dataset, rooms: state.rooms, faculty: temporary.faculty, studentGroups: state.studentGroups, sessions: effectiveSessions, roomUnavailability: temporary.closures, assignments: locked });
    const result = pending.length ? await solveTimetable(context, pending, options) : { solved: true, assignments: [], nodes: 0 };
    if (result.solved) {
      const merged = [...normaliseAssignments(locked), ...result.assignments.map((row) => {
        const override = state.assignments.find((assignment) => assignment.sessionId === row.sessionId)?.facultyOverrideId;
        return override ? { ...row, facultyOverrideId: override } : row;
      })];
      const validation = validateSchedule({ dataset: state.dataset, rooms: state.rooms, faculty: temporary.faculty, studentGroups: state.studentGroups, sessions: allSessions, roomUnavailability: temporary.closures, assignments: merged });
      if (validation.valid) { finalAssignments = merged; finalResult = { result, validation }; break; }
    }
    if (movable.size === state.sessions.length + temporary.addedSessions.length) break;
    if (pass === 3) movable = new Set(allSessions.map((session) => session.sourceId));
    else {
      const affected = [...movable].map((id) => sessionMap.get(id)).filter(Boolean);
      for (const candidate of allSessions) {
        if (movable.has(candidate.sourceId)) continue;
        if (affected.some((source) => source.facultyId === candidate.facultyId || source.groups.some((id) => candidate.groups.includes(id)) || (source.basketSlot && source.basketSlot === candidate.basketSlot))) movable.add(candidate.sourceId);
      }
    }
  }

  if (!finalAssignments) {
    disruption.status = 'failed';
    disruption.failure = { code: 'NO_VALID_SOLUTION', message: 'No valid repair was found for the disruption.' };
    await disruption.save();
    throw new ApiError(409, 'NO_VALID_SOLUTION', disruption.failure.message, { disruptionId: String(disruption._id) });
  }

  const beforeValidation = validateSchedule({ ...state, assignments: state.assignments });
  const diff = comparisonOf(normaliseAssignments(state.assignments), finalAssignments, allSessions, beforeValidation.softPenalty, finalResult.validation.softPenalty, temporary.addedSessions.length);
  const latest = await ScheduleVersion.findOne({ dataset: state.dataset._id }).sort({ versionNumber: -1 }).select('versionNumber');
  const version = await ScheduleVersion.create({
    dataset: state.dataset._id, versionNumber: (latest?.versionNumber ?? 0) + 1, baseVersion: state.version._id,
    kind: 'disruption_repair', status: 'proposed', createdBy: disruption.createdBy,
    reason: disruption.title, changes: diff.changes.map((item) => ({ sessionId: item.sessionId, before: item.before, after: item.after, reason: disruption.description })),
    summary: { sessionsScheduled: finalAssignments.length, hardViolations: 0, softPenalty: finalResult.validation.softPenalty, sessionsMoved: diff.comparison.sessionsMoved },
  });
  try {
    await ScheduledSession.insertMany(finalAssignments.map((row) => ({ dataset: state.dataset._id, scheduleVersion: version._id, ...row, source: 'repair' })));
  } catch (error) {
    await ScheduleVersion.deleteOne({ _id: version._id });
    disruption.status = 'failed';
    disruption.failure = { code: error.code ?? 'REPAIR_SAVE_FAILED', message: 'Could not save the proposed repair.', details: null };
    await disruption.save();
    throw error;
  }
  disruption.proposedVersion = version._id;
  disruption.status = 'repaired';
  disruption.comparison = diff.comparison;
  disruption.repairedAt = new Date();
  await disruption.save();
  const changes = diff.changes.map((change) => ({
    ...change,
    details: presentSession(state, change.after ?? change.before),
    beforeDetails: change.before ? presentSession(state, change.before) : null,
    afterDetails: change.after ? presentSession(state, change.after) : null,
  }));
  return { disruption, proposedVersionId: String(version._id), changes, comparison: diff.comparison, searchNodes: finalResult.result.nodes };
}

export async function applyDisruption(disruptionId, appliedBy) {
  const disruption = await Disruption.findById(disruptionId);
  if (!disruption || disruption.status !== 'repaired' || !disruption.proposedVersion) throw new ApiError(409, 'DISRUPTION_NOT_REPAIRED', 'Generate a valid repair proposal before applying it.');
  const state = await loadState(disruption.dataset);
  const version = await ScheduleVersion.findById(disruption.proposedVersion);
  if (!version || String(state.version._id) !== String(disruption.baseVersion)) throw new ApiError(409, 'DISRUPTION_STALE', 'The active timetable changed after this repair was generated.');

  const addedSessions = disruption.changes.filter((change) => change.type === 'add_session');
  const createdSessionIds = [];
  const createdClosureIds = [];
  const facultySnapshots = [];
  let currentSuperseded = false;
  try {
    for (const change of addedSessions) {
      const raw = change.session;
      const created = await Session.create({ dataset: disruption.dataset, sourceId: raw.id, courseId: raw.course_id, kind: raw.kind, groups: raw.groups, facultyId: raw.faculty_id, size: raw.size, duration: raw.duration, roomTypes: raw.room_types, needsAccessible: raw.needs_accessible ?? false, basketSlot: raw.basket_slot ?? null, fixedSlot: raw.fixed_slot ?? null });
      createdSessionIds.push(created._id);
    }
    for (const change of disruption.changes.filter((item) => item.type === 'faculty_unavailable')) {
      for (const day of change.days) {
        const faculty = await Faculty.findOne({ dataset: disruption.dataset, sourceId: change.faculty_id });
        if (!faculty) throw new ApiError(409, 'FACULTY_NOT_FOUND', `Faculty ${change.faculty_id} no longer exists.`);
        facultySnapshots.push({ id: faculty._id, unavailable: faculty.unavailable.map((item) => item.toObject()) });
        faculty.unavailable.push({ day, periods: change.periods, reason: change.reason ?? disruption.title });
        await faculty.save();
      }
    }
    for (const change of disruption.changes.filter((item) => item.type === 'room_unavailable')) {
      const rows = change.days.map((day) => ({ dataset: disruption.dataset, roomId: change.room_id, day, periods: change.periods, reason: change.reason ?? disruption.title, source: 'disruption' }));
      const saved = await RoomUnavailability.insertMany(rows);
      createdClosureIds.push(...saved.map((item) => item._id));
    }

    const [dataset, rooms, faculty, studentGroups, sessions, closures, assignments] = await Promise.all([
      Dataset.findById(disruption.dataset), Room.find({ dataset: disruption.dataset }).lean(), Faculty.find({ dataset: disruption.dataset }).lean(),
      StudentGroup.find({ dataset: disruption.dataset }).lean(), Session.find({ dataset: disruption.dataset }).lean(),
      RoomUnavailability.find({ dataset: disruption.dataset }).lean(), ScheduledSession.find({ scheduleVersion: version._id }).lean(),
    ]);
    const validation = validateSchedule({ dataset, rooms, faculty, studentGroups, sessions, roomUnavailability: closures, assignments });
    if (!validation.valid) throw new ApiError(409, 'REPAIR_NO_LONGER_VALID', 'Repair proposal no longer satisfies all hard constraints.', { violations: validation.hardViolations });

    const current = await ScheduleVersion.findById(disruption.baseVersion);
    if (!current || current.status !== 'active') throw new ApiError(409, 'DISRUPTION_STALE', 'The base version is no longer active.');
    current.status = 'superseded';
    await current.save();
    currentSuperseded = true;
    version.status = 'active';
    version.approvedBy = appliedBy;
    version.approvedAt = new Date();
    await version.save();
    disruption.status = 'applied';
    disruption.appliedBy = appliedBy;
    disruption.appliedAt = new Date();
    await disruption.save();
    return disruption;
  } catch (error) {
    if (currentSuperseded) {
      await ScheduleVersion.updateOne({ _id: disruption.baseVersion }, { $set: { status: 'active' } });
      await ScheduleVersion.updateOne({ _id: version._id }, { $set: { status: 'proposed' } });
    }
    if (createdSessionIds.length) await Session.deleteMany({ _id: { $in: createdSessionIds } });
    if (createdClosureIds.length) await RoomUnavailability.deleteMany({ _id: { $in: createdClosureIds } });
    for (const snapshot of facultySnapshots) await Faculty.updateOne({ _id: snapshot.id }, { $set: { unavailable: snapshot.unavailable } });
    throw error;
  }
}

export async function getDisruption(disruptionId) {
  const disruption = await Disruption.findById(disruptionId).populate('proposedVersion', 'versionNumber status summary changes');
  if (!disruption) throw new ApiError(404, 'DISRUPTION_NOT_FOUND', 'Disruption was not found.');
  return disruption;
}
